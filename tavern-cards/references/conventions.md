# 条目注册约定与文件格式

条目的注册、命名、文件格式和 patch 命令的统一约定。

## 路径组织原则

`世界书/` 下按条目类型组织目录结构：

- 按类型名建一级子目录（`世界观/`、`地理/`、`角色/`、`NPC/`、`时间线/`、`EJS/`、`变量/` 等）
- 角色条目按角色名建二级子目录（如 `角色/苏云/基础信息.yaml`）
- MVU 变量相关文件放在 `变量/` 下
- EJS 文件放在 `EJS/` 下
- 非世界书内容放在同级目录：`正则/`（替换文件）、`脚本/`（TavernHelper 脚本）、`开场白/`（first_messages）
- 项目根目录：`schema.ts`（仅 MVU 项目，变量类型定义）、`avatar.png`（仅角色卡有头像时）

文件格式：内容以 YAML 数据为主时用 `.yaml`，包含 YAML 语法冲突（EJS 模板、特殊字符）时用 `.txt`。

示例：

```
  schema.ts                    # 仅 MVU 项目：Zod 变量类型定义（顶部禁止任何 import）
世界书/
  世界观/
    世界设定.yaml
  地理/
    华东区.yaml
    学校详情.yaml
  角色/
    角色速览.yaml
    苏云/
      基础信息.yaml
      性格调色盘.yaml
    赵明月/
      基础信息.yaml
  时间线/
    历史事件.yaml
  EJS/
    EJS预处理.txt
  变量/
    initvar.yaml
    变量更新规则.yaml
正则/
  状态栏界面.html
脚本/
  MVU.txt
开场白/
  0.txt
  1.txt
  initvar/                     # 仅 MVU 项目：initvar_override YAML 文件
    1.yaml                     # 与 开场白/{index}.txt 编号一致
```

**不做硬性路径规定**，AI 根据项目实际需要自行合理决定，保持与 entryManifest key 和创作规划 entries name 的一致性即可。


## 打包格式

角色卡打包输出格式由 `.cardrc.json` 中项目的 `artifact` 路径后缀决定：

| 后缀 | 输出格式 | 适用场景 |
|------|---------|---------|
| `.png` | 嵌入 JSON 的 PNG 图片 | 有头像图片时 |
| `.json` | 纯 JSON 文件 | 无头像图片时 |

需求对齐阶段确认头像时，同时决定 artifact 后缀：
- 提供头像 → `artifact: cards/{Project}/{Project}.png`
- 无头像 → `artifact: cards/{Project}/{Project}.json`

## 条目名称前缀

### 功能定位前缀

| 前缀 | 用途 |
|------|------|
| `[InitVar]` | 脚本通过此前缀检索初始变量条目 |
| `[mvu_update]` | 标记变量更新相关条目 |
| `[mvu_plot]` | 标记剧情输出相关条目 |

### 双 AI 发送路由

使用额外模型解析时，条目前缀决定发送目标：

| 条目名称前缀 | 发送目标 |
|-------------|---------|
| `[mvu_plot]` | 只发给负责输出剧情的 AI |
| `[mvu_update]` | 只发给负责更新变量的 AI |
| 无前缀 | 发给两个 AI |

使用随 AI 输出时，不区分 `[mvu_plot]` 与 `[mvu_update]` 前缀。

添加 `[mvu_plot]` 前缀后条目名称变为 `[mvu_plot]{原条目名}`（如 `[mvu_plot]世界设定`），标签名和属性不变。

## keywords 建议

| 类型 | keywords 模板 |
|------|--------------|
| 角色 | `["{角色名}", "昵称", "外号"]` |
| NPC | `["{NPC名}", "昵称", "外号", "职务"]` |
| 地理 | `["{名称}", "简称", "所在地名"]` |

**约束**：

- **严禁单汉字关键词**：单个汉字极易误触发（如"萤"会匹配所有含"萤"字的句子）。昵称必须用两个以上汉字："樱"→"小樱"、"萤"→"小萤"、"玲"→"小玲"或"阿玲"、"奈"→"奈奈"
- **避免过于泛用的词汇**：职务类必须足够精确，如"老师"→"语文老师"、"会长"→"学生会长"
- **避免成语/常见组合**：如"倾国倾城""闭月羞花"等成语作为关键词会导致无关触发
- **角色名本身不受限**：三字全名（如"桃宫樱"、"星野萤"）是安全的，不需要变
 
 正确示例："红尘客栈" → `["红尘客栈"]`；昵称"樱" → `["小樱"]`
 错误示例："红尘客栈" → `["红尘"]`；昵称"樱" → `["樱"]`

## XML 标签

使用 XML 标签的条目（角色、NPC 等），entryManifest 中使用 `contents` 数组组合标签和文件：

```json
{
  "contents": [
    { "content": "---\n<character_basic character=\"苏云\">" },
    { "file": "世界书/角色/苏云/基础信息.yaml" },
    { "content": "</character_basic>" }
  ]
}
```

不使用标签的条目（MVU 条目等），直接使用 `path`：

```json
{
  "path": "世界书/变量/initvar.yaml"
}
```

**约束**：`path` 与 `contents` 互斥，只能选其一。

**注意**：XML 标签只在 `contents` 注册时由外层 `content` 片段添加。内容文件本身不使用 XML 标签，否则最终打包的文件会产生重复。

## 条目注册

**重要**：每个条目写完后必须立即注册，不得积攒。断点续接（`references/resume.md`）完全依赖 entryManifest 判断进度，一旦漏注册，下次续接时已写条目将被视为未完成，导致进度判断出错。

完成条目内容编写后，执行两个动作：

1. 将内容写入对应的文件路径
2. 运行 `node scripts/tavern-cards-forge.mjs patch` 将条目注册到 entryManifest

注册时需确定以下字段：
- **abstract**：根据条目内容总结 1-2 句话摘要，用于调试和条目索引
- **part** / **scope** / **rephrase**：根据条目类型和用途设置
- **keywords**：查上方 keywords 建议

## 语法冲突规避

当内容包含 YAML 语法冲突时，使用 `contents` 数组将冲突部分作为内联 `content` 处理。

EJS 模板语法：

```json
{
  "contents": [
    { "file": "世界书/角色/基础设定.yaml" },
    { "content": "<%_ if (current_stage === 'stage1') { _%>\n阶段1的特殊内容\n<%_ } _%>" }
  ]
}
```

## patch 命令用法

entryManifest 是双层 Record 结构：外层 key 为类型名称，内层 key 为条目名称。

通用格式：

```bash
node scripts/tavern-cards-forge.mjs patch {project} '{JSON Patch 数组}'
```

从文件读取：

```bash
node scripts/tavern-cards-forge.mjs patch {project} --file ./patches/add-entry.json
```

从 stdin/管道读取：

```bash
echo '[{"op":"add",...}]' | node scripts/tavern-cards-forge.mjs patch {project}
```

### 注册示例

**使用标签的条目**（如角色基础信息）：

1. 写入文件 `世界书/角色/苏云/基础信息.yaml`
2. 执行命令：

```bash
node scripts/tavern-cards-forge.mjs patch {project} '[{"op":"add","path":"/entryManifest/角色/苏云_基础信息","value":{"part":"basic","scope":"specific","abstract":"苏云的基础信息：19岁修仙协会华东分部见习执法者","contents":[{"content":"---\n<character_basic character=\"苏云\">"},{"file":"世界书/角色/苏云/基础信息.yaml"},{"content":"</character_basic>"}],"keywords":["苏云"]}}]'
```

**不使用标签的条目**（如 MVU 初始变量）：

1. 写入文件 `世界书/变量/initvar.yaml`
2. 执行命令：

```bash
node scripts/tavern-cards-forge.mjs patch {project} '[{"op":"add","path":"/entryManifest/MVU/[InitVar]请勿打开","value":{"part":"initvar","abstract":"初始变量：世界状态和角色状态","path":"世界书/变量/initvar.yaml","keywords":[]}}]'
```

**带 EJS 的条目**（如需要条件显隐的地理条目）：

1. 写入文件 `世界书/地理/华东区.yaml`
2. 执行命令（`contents` 首片段嵌入 `@@if`）：

```bash
node scripts/tavern-cards-forge.mjs patch {project} '[{"op":"add","path":"/entryManifest/地理/华东区","value":{"part":"region","scope":"specific","abstract":"华东区：包含上海、杭州、南京等主要城市","contents":[{"content":"@@if current_location?.includes(\"华东区\")"},{"content":"---\n<region region=\"华东区\">"},{"file":"世界书/地理/华东区.yaml"},{"content":"</region>"}],"keywords":["华东区","华东"]}}]'
```

EJS 条件来自编写规划文档的 `ejs.entries` 段，在条目创作时一并处理。

### EJS 复杂度与处理方式

| 复杂度 | 处理时机 | 操作 | 参考文档 |
|-------|---------|------|---------|
| 条目显隐 | 条目创作完成，立即注册时 | `contents` 首片段嵌入 `@@if`，不编辑内容文件 | `references/ejs/guide.md` |
| 段落控制 | 条目内容创作时 | 编辑内容文件 | `references/ejs/guide.md` |
| 动态文本 | 条目内容创作时 | 编辑内容文件 | `references/ejs/reference.md` + `references/ejs/features.md` |

## 文件路径自动重命名

patch 的 `replace` 操作修改文件路径字段时会自动重命名磁盘文件（`add` 操作会校验文件存在），**不要提前手动 `mv`**。涉及字段与行为细节见 `references/manual.md#patch`。

`move` 操作重命名条目时只改 entryManifest 的 key （条目名），**不会**自动改 leaf 的 `path`/`contents[].file` 字段，也不会动磁盘文件；会输出提醒。若要保持文件名与条目名一致，再用 `replace` 操作改 `path` 字段（patch 会自动重命名磁盘文件，不要手动 `mv`）。

