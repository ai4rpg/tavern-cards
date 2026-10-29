# 断点续接

当用户中断后返回时，检测进度并恢复。

## 步骤

1. **检测环境**：查找 `.cardrc.json`，确认工作区。未找到则提醒用户
2. **检查 `design-spec.md`**：确认 `cards/{Project}/design-spec.md` 是否存在
   - 存在 → 读取其中已记录的项目属性、风格意向与剧情方向
   - 不存在 → 提示该项目缺少 `design-spec.md`，可能尚未走 tavern-design，也可能属于旧项目；按下方「无 `design-spec.md` 时的处理」继续
3. **读取编写规划文档**（`创作规划.yaml`）
4. **批量查询进度**：用命令一次性获取所有已注册条目的摘要和状态
5. **对比规划与注册**：将 entryManifest 中已有条目与 `创作规划.yaml` 对比，确定未完成条目；内容不一致时询问用户以哪边为准，再更新规划或条目。变量与额外要求一并核对，依据见 `references/mvu/schema.md` 与 `references/requirements/planning-yaml.md`
6. **向用户展示进度概要**，确认从哪个部分/条目继续
7. **继续创作流程**

## 使用 forge CLI

查询项目状态：

```bash
# 项目属性
node scripts/tavern-cards-forge.mjs query {project} '$.mvu' '$.form'

# 获取所有已注册条目的名称（类型+条目名）
node scripts/tavern-cards-forge.mjs query {project} '$.entryManifest.*~' --format yaml

# 批量获取所有条目的摘要
node scripts/tavern-cards-forge.mjs query {project} '$.entryManifest[*][*].abstract' --format yaml
```

`query` 返回 JSON 到 stdout，用 `--format yaml` 可获取 YAML 输出。

建议在向用户展示进度时，将条目名称与摘要组合为易读的列表，例如：

```
已完成条目：
  世界观/世界设定：世界规则和物理法则的宏观框架
  地理/华东区：包含上海、杭州、南京等主要城市
  角色/苏云_基础信息：19岁修仙协会华东分部见习执法者
未完成条目：
  角色/苏云_性格调色盘
  NPC/王老师
```

## 判断条目完成状态

批量获取 entryManifest 中所有条目信息后，与 `创作规划.yaml` 的 `entries` 数组对照：

- entryManifest 中存在该条目 → 已完成，跳过
- entryManifest 中不存在该条目 → 未完成，从此条目继续

文件存在但不被 entryManifest 引用的情况：
- 该条目在 `创作规划.yaml` 的 entries 中 → 编写未完成（内容已写但未注册），继续编写并注册
- 该条目不在 `创作规划.yaml` 的 entries 中 → 询问用户是否保留

## 判断 MVU 完成状态（project.mvu: true 时）

先确认 mvu 开关：

```bash
node scripts/tavern-cards-forge.mjs query {project} '$.mvu'
```

| 检查项 | 命令 | 完成条件 |
|---|---|---|
| schema.ts | 检查文件 | `schema.ts` 文件存在 |
| initvar.yaml | `query {project} '$.entryManifest.MVU.*~'` | 有 part=initvar 条目且对应文件存在 |
| 变量更新规则 | 同上 | 有 part=update_rules 条目且对应文件存在 |
| state.zod | `query {project} '$.zod'` | `state.zod` 存在 |

四项都存在 → MVU 完成。否则从第一个缺失项继续。

## 判断 EJS 完成状态

从 `创作规划.yaml` 的 `ejs.entries` 读取 EJS 条目列表：

| 检查项 | 命令 | 完成条件 |
|---|---|---|
| 各 EJS 条目已处理 | — | 创作规划文档 ejs.entries 中每条，entryManifest 对应条目的 `contents` 首片段以 `@@if ` 开头，或对应内容文件正确使用 EJS 语句 |

该项满足 → EJS 完成。否则从第一个缺失项继续。

## 判断开场白完成状态（project.form: charactercard 时）

```bash
node scripts/tavern-cards-forge.mjs query {project} '$.form'
```

| 检查项 | 方法 |
|---|---|
| 默认开场白 | `开场白/0.txt` 文件存在 |

## 无 `design-spec.md` 时的处理

如果项目没有 `design-spec.md`：

- **新项目尚未开始**：提示用户先调用 tavern-design skill 完成大方向讨论与剧情设计，产出 `cards/{Project}/design-spec.md` 后再继续。
- **旧项目或手动创建的项目**：保留原有通过条目推断项目状态的流程，但在向用户展示进度时说明该项目没有 `design-spec.md`，后续如要调整大方向可先补一份。

## 无编写规划文档时

如果没有编写规划文档（旧项目或手动创建的项目），通过以下命令推断项目状态：

```bash
node scripts/tavern-cards-forge.mjs query {project} '$.form' '$.mvu'
node scripts/tavern-cards-forge.mjs query {project} '$.entryManifest.*~' --format yaml
node scripts/tavern-cards-forge.mjs query {project} '$.entryManifest[*][*].abstract' --format yaml
```

向用户展示已有条目列表和项目属性。确认后，根据缺失项确定下一步：

- 有编写规划文档但条目未全部注册 → 读取 `references/composition.md`，按 `entries` 顺序从首个未注册条目继续创作
- 条目已全部注册但 MVU 未完成（`mvu: true` 时）→ 读取 `references/mvu/guide.md`，从缺失的核心文件继续
- MVU 完成但 EJS 未完成 → 读取 `references/ejs/guide.md`，补全未处理的 EJS 条目
- EJS 完成但未运行 configure → 执行 `node scripts/tavern-cards-forge.mjs configure {project}`
- configure 完成但无开场白（`form: charactercard` 时）→ 读取 `references/contents-creation/first-message.md`
- 以上均完成 → 执行 `node scripts/tavern-cards-forge.mjs pack {project}` 打包输出
