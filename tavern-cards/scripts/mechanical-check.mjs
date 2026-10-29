#!/usr/bin/env node
/**
 * 机械自检：条目或开场白落盘后的单文件硬检查。
 *
 *   node scripts/mechanical-check.mjs 世界书/角色/苓/基础信息.yaml
 *   node scripts/mechanical-check.mjs 开场白/0.txt 世界书/角色/苓/性格调色盘.yaml
 *   node scripts/mechanical-check.mjs --soft <file>     只报告，不返回非零
 *   node scripts/mechanical-check.mjs --json <file>     机器可读
 *
 * 检查项与 references/rules-check.md 对齐：
 *   硬违规：破折号 / 模糊词 / 否定转折 / 极端程度词 / 元叙事标记 / {{user}} 宏
 *   断句：末分句 ≤5 字的句子占多分句句子 ≥1/5 且 ≥3 句 → 不通过
 *        一句里 ≥5 个分句的句子超过 2 句 → 不通过
 *   提示：连续 3 个以上拉丁字母（人工排除合规术语）
 *
 * EJS（<% … %>）与酒馆宏（{{ … }}）不参与判定，只在检测 {{user}} 时读原文：
 * 前者是代码，后者的花括号语法会破坏 YAML。台词也不参与断句统计。
 *
 * 文件须为 UTF-8。UTF-16（如 Windows 记事本另存）与 GBK 等编码会报错退出，
 * 不静默跳过，避免漏检。
 *
 * 退出码：0 通过；1 有硬违规或断句超阈值；2 用法错误或文件不是 UTF-8。
 */

import { readFileSync, existsSync } from 'node:fs'
import { extname, basename } from 'node:path'

const HARD = [
  { id: 'dash', label: '破折号', re: /——/g },
  { id: 'vague', label: '模糊词', re: /似乎|仿佛|宛如|如同|几乎|近似/g },
  { id: 'negation', label: '否定转折', re: /不是[^。！？\n]{0,20}(而是|只是)/g },
  { id: 'extreme', label: '极端程度词', re: /极其|极大/g },
  { id: 'meta', label: '元叙事标记', re: /本卡|写作要点|暂不展开|素材池|戏剧用途|核心冲突_/g },
  { id: 'macro', label: '{{user}} 宏', re: /\{\{user\}\}/g },
]

// 断句阈值，与 rules-check.md「断句检查」一致
const SHORT_TAIL_MAX = 5
const SHORT_TAIL_RATIO = 1 / 5
const SHORT_TAIL_MIN = 3
const MIN_MULTI = 5
const LONG_CLAUSE_MIN = 5      // 一句里达到这个分句数算长链
const LONG_CLAUSE_ALLOWED = 2  // 允许超过上限的句子数

const argv = process.argv.slice(2)
const soft = argv.includes('--soft')
const json = argv.includes('--json')
const files = argv.filter((a) => !a.startsWith('--'))

if (!files.length) {
  console.error('用法: node scripts/mechanical-check.mjs [--soft] [--json] <file...>')
  process.exit(2)
}

const han = (s) => (s.match(/[\u4e00-\u9fff]/g) || []).length
const QUOTE_SPAN = /「[^」]*」|“[^”]*”|"[^"\n]*"/g
const EJS_BLOCK = /<%[\s\S]*?%>/g
const MACRO = /\{\{[\s\S]*?\}\}/g

/** 去掉 EJS 与宏；EJS 里的换行原样保留，行号不会错位。 */
function stripCode(text) {
  return text
    .replace(EJS_BLOCK, (m) => '\n'.repeat((m.match(/\n/g) || []).length))
    .replace(MACRO, '')
}

/** 解析一行 YAML 的叶子值；空行、注释、分隔线返回 null。 */
function parseYamlLine(line, parentKey = '') {
  let s = line.trim()
  if (!s || s.startsWith('#') || s === '---') return null
  s = s.replace(/^-\s+/, '')
  let key = ''
  const colon = s.indexOf(':')
  if (colon !== -1) {
    key = s.slice(0, colon).trim()
    s = s.slice(colon + 1).trim()
    if (!s) return null
  }
  if (/^[|>][+-]?$/.test(s)) return null   // 块标量标记，不是正文
  // 台词不按散文检查：键名属于语料/口头禅/台词/对话，列表项沿用父键。
  // YAML 的引号是语法需要，不能拿它判断是不是台词。
  const dialogue = /语料|口头禅|台词|对话/.test(key || parentKey)
  return { key, text: s.replace(/^['"]|['"]$/g, ''), dialogue }
}

/** 按 UTF-8 读取文件；UTF-16/GBK 等非 UTF-8 编码报错退出，避免静默漏检。 */
function readUtf8(file) {
  const buf = readFileSync(file)
  if (buf.length >= 4 && buf[0] === 0 && buf[1] === 0 && buf[2] === 0xfe && buf[3] === 0xff) {
    console.error(`文件不是 UTF-8: ${file}（检测到 UTF-32 BE BOM，请转存为 UTF-8）`)
    process.exit(2)
  }
  if (buf.length >= 2 && ((buf[0] === 0xff && buf[1] === 0xfe) || (buf[0] === 0xfe && buf[1] === 0xff))) {
    console.error(`文件不是 UTF-8: ${file}（检测到 UTF-16/UTF-32 BOM，请转存为 UTF-8）`)
    process.exit(2)
  }
  let text
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buf)
  } catch {
    console.error(`文件不是有效的 UTF-8: ${file}（可能为 GBK 等编码，请转存为 UTF-8）`)
    process.exit(2)
  }
  if (text.includes('\u0000')) {
    console.error(`文件不是有效的 UTF-8: ${file}（含 NUL 字节，可能为 UTF-16 或二进制文件）`)
    process.exit(2)
  }
  return text
}

/** 返回三组带行号的单元：raw 供 {{user}} 检测，check 供词表检查，prose 供断句统计。 */
function extract(file) {
  const raw = readUtf8(file).replace(/\r\n/g, '\n')
  const rawLines = raw.split('\n')
  const checkLines = stripCode(raw).split('\n')
  const ext = extname(file).toLowerCase()
  const hard = []
  const check = []
  const prose = []

  if (ext === '.yaml' || ext === '.yml') {
    let parentKey = ''
    rawLines.forEach((line, i) => {
      const t = line.trim()
      if (t && !t.startsWith('#') && t !== '---' && !/^-\s+/.test(t)) {
        const colon = t.indexOf(':')
        if (colon !== -1) parentKey = t.slice(0, colon).trim()
      }
      const p = parseYamlLine(line, parentKey)
      if (!p) return
      hard.push({ line: i + 1, text: p.text })
      const c = parseYamlLine(checkLines[i], parentKey)
      if (!c) return
      check.push({ line: i + 1, text: c.text })
      if (!p.dialogue) prose.push({ line: i + 1, text: c.text })
    })
    return { hard, check, prose }
  }

  // 纯文本：跳过 front matter，遇到「自查结果」停止
  let start = 0
  if (rawLines[0]?.trim() === '---') {
    const end = rawLines.findIndex((l, i) => i > 0 && l.trim() === '---')
    if (end > 0) start = end + 1
  }
  for (let i = start; i < rawLines.length; i++) {
    const s = rawLines[i].trim()
    if (/^自查结果/.test(s)) break
    if (!s || s === '---') continue
    hard.push({ line: i + 1, text: s })
    const c = checkLines[i].trim()
    if (!c) continue
    check.push({ line: i + 1, text: c })
    // 去掉引号内台词，只留叙述片段
    for (const piece of c.split(QUOTE_SPAN)) {
      const t = piece.trim().replace(/^[，。、；：\s]+|[，、；：\s]+$/g, '')
      if (t) prose.push({ line: i + 1, text: t })
    }
  }
  return { hard, check, prose }
}

function sentencesOf(units) {
  const out = []
  for (const u of units) {
    const parts = u.text.split(/(?<=[。！？])/).map((s) => s.trim()).filter(Boolean)
    for (const s of parts) out.push({ line: u.line, text: s })
  }
  return out
}

function clausesOf(s) {
  return s
    .replace(/^[“”「」"'\s]+|[“”「」"'\s]+$/g, '')
    .split(/[，；：]/)   // 、是列举，不算分句边界
    .map((p) => p.trim())
    .filter(Boolean)
}

const report = []

for (const file of files) {
  if (!existsSync(file)) {
    console.error(`文件不存在: ${file}`)
    process.exit(2)
  }
  const { hard: rawUnits, check: checkUnits, prose: proseUnits } = extract(file)

  const hits = []
  for (const { id, label, re } of HARD) {
    const src = id === 'macro' ? rawUnits : checkUnits
    for (const u of src) {
      const m = u.text.match(re)
      if (m) hits.push({ id, label, line: u.line, text: u.text, count: m.length })
    }
  }

  const sents = sentencesOf(proseUnits)
  const multi = sents.filter((s) => clausesOf(s.text).length >= 2)
  const longChain = sents.filter((s) => clausesOf(s.text).length >= LONG_CLAUSE_MIN)
  const shortTail = []
  for (const s of multi) {
    const cs = clausesOf(s.text)
    const first = han(cs[0])
    const last = han(cs[cs.length - 1])
    if (last <= SHORT_TAIL_MAX) shortTail.push({ line: s.line, text: s.text, first, last })
  }

  const nMulti = multi.length
  const tailRatio = nMulti ? shortTail.length / nMulti : 0
  const tailFail = nMulti >= MIN_MULTI && shortTail.length >= SHORT_TAIL_MIN && tailRatio >= SHORT_TAIL_RATIO
  const chainFail = longChain.length > LONG_CLAUSE_ALLOWED

  const latin = []
  for (const u of checkUnits) {
    const stripped = u.text.replace(/<user>/g, '').replace(/@@[^\s]*/g, '')
    if (/[A-Za-z]{3,}/.test(stripped)) latin.push({ line: u.line, text: u.text })
  }

  report.push({
    file,
    name: basename(file),
    hard: hits,
    clause: {
      sentences: sents.length,
      multi: nMulti,
      shortTail: shortTail.length,
      shortTailRatio: Number(tailRatio.toFixed(3)),
      tailFail,
      chainFail,
      longChain: longChain.map((s) => ({
        line: s.line,
        clauses: clausesOf(s.text).length,
        text: s.text,
      })),
      examples: shortTail.slice(0, 5),
    },
    latin,
  })
}

const failed = report.some((r) => r.hard.length > 0 || r.clause.tailFail || r.clause.chainFail)

if (json) {
  console.log(JSON.stringify({ failed, files: report }, null, 2))
} else {
  for (const r of report) {
    console.log(`\n机械自检 · ${r.name}`)
    if (r.hard.length) {
      console.log('  硬违规')
      for (const h of r.hard) console.log(`    L${h.line} ${h.label}：${h.text.slice(0, 60)}`)
    } else {
      console.log('  硬违规        0')
    }
    const c = r.clause
    console.log(`  多分句句子    ${c.multi} / 共 ${c.sentences} 句`)
    console.log(
      `  短尾(≤5字)    ${c.shortTail} 句（${(c.shortTailRatio * 100).toFixed(0)}%）${c.tailFail ? '  ← 超过 1/5' : ''}`
    )
    console.log(
      `  长句(≥5分句)  ${c.longChain.length} 句${c.chainFail ? '  ← 超过 2 句' : ''}`
    )
    for (const e of c.longChain.slice(0, 3)) console.log(`    L${e.line} ${e.clauses} 分句  ${e.text.slice(0, 50)}`)
    for (const e of c.examples) console.log(`    L${e.line} ${e.first}/${e.last}  ${e.text.slice(0, 50)}`)
    if (r.latin.length) {
      console.log(`  提示：${r.latin.length} 行含连续拉丁字母，人工排除合规术语`)
      for (const l of r.latin.slice(0, 3)) console.log(`    L${l.line} ${l.text.slice(0, 50)}`)
    }
    console.log(`  结论          ${r.hard.length || c.tailFail || c.chainFail ? '不通过' : '通过'}`)
  }
}

if (failed && !soft) process.exit(1)
