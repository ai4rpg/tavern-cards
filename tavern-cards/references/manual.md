# tavern-cards-forge 操作手册

- [概述](#概述)
  - [支持的格式](#支持的格式)
- [配置文件](#配置文件)
  - [`.cardrc.json`](#cardrcjson)
  - [`tavern-cards-state.json`](#tavern-cards-statejson)
- [命令](#命令)
  - [公共选项](#公共选项)
  - [pack](#pack)
  - [unpack](#unpack)
  - [configure](#configure)
  - [init](#init)
  - [validate-mvu](#validate-mvu)
  - [query](#query)
  - [patch](#patch)
- [数据模型](#数据模型)
  - [EntryManifest](#entrymanifest)
  - [EntryManifestLeaf](#entrymanifestleaf)
  - [RegexScript](#regexscript)
  - [TavernHelperScript](#tavernhelperscript)
  - [互斥字段验证](#互斥字段验证)
- [格式转换映射](#格式转换映射)
  - [世界书格式对比](#世界书格式对比)
- [项目目录结构与 state 差异](#项目目录结构与-state-差异)
  - [目录结构对比](#目录结构对比)
  - [state.json 差异](#statejson-差异)

## 概述

`node scripts/tavern-cards-forge.mjs` 是一个离线 CLI 工具，用于在 SillyTavern 角色卡 (PNG) / 世界书 (JSON) 与可编辑的项目目录之间互相转换。

核心思路：**项目目录**中的 `tavern-cards-state.json` 是唯一数据源，`pack` 将其打包为 SillyTavern 格式，`unpack` 将 SillyTavern 格式还原为项目目录。

### 支持的格式

| 格式类型 | 文件类型 | 条目格式 |
|---------|---------|---------|
| 角色卡（PNG） | PNG | SillyTavern 标准格式，包含头像和世界书 |
| 角色卡（JSON） | JSON | SillyTavern 标准格式，无头像 |
| 独立世界书 | JSON | 扁平格式 |

输出格式由 `form` 和 `avatar` 决定：`form = "worldbook"` → 扁平 JSON；`form = "charactercard"` 且 `avatar` 非空 → PNG；`form = "charactercard"` 且 `avatar` 为空 → JSON。角色卡条目嵌套在 `extensions` 中；独立世界书使用扁平字段名（如 `order` 而非 `insertion_order`）。

## 配置文件

### `.cardrc.json`

项目根目录下的共享配置文件，定义所有项目的默认规则。从当前工作目录向上查找。

```jsonc
{
  "projects": {
    "CharacterProject": {
      "state_file": "cards/CharacterProject/tavern-cards-state.json",
      "artifact": "cards/CharacterProject/CharacterProject.png"
    },
    "WorldbookProject": {
      "state_file": "cards/WorldbookProject/tavern-cards-state.json",
      "artifact": "cards/WorldbookProject/WorldbookProject.json"
    }
  },
  "default_type_lists": {
    "before_char": ["EJS预处理", "世界观", "扮演准则", "时间线", "地理"],
    "after_char": ["角色", "NPC"],
    "depth": ["事件", "MVU"]
  },
  "default_strategy_thresholds": {
    "角色": {
      "basic": { "threshold": 5, "required": true },
      "personality": { "threshold": 2, "required": true }
    },
    "NPC": 0,
    "EJS预处理": "Infinity"
  },
  "default_part_order": {
    "角色": ["basic", "personality", "tri_faceted", "other"],
    "MVU": ["variable_list", "update_rules", "output_format", "initvar"]
  },
  "depth_defaults": {
    "role": "system",
    "depth": 0
  }
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `state_file` | string | 是 | `tavern-cards-state.json` 路径，相对于 `.cardrc.json` |
| `artifact` | string | 否 | 打包产物路径（pack 输出 / unpack 输入），同相对位置 |

### `tavern-cards-state.json`

每个项目的数据源文件。

```jsonc
{
  "projectName": "{project}",
  "worldbookName": "{project}",
  "form": "charactercard",
  "mvu": false,
  "typeLists": {
    "before_char": ["EJS预处理", "世界观"],
    "after_char": ["角色", "NPC"],
    "depth": ["扮演准则", "事件", "MVU"]
  },
  "strategyThresholds": {},
  "partOrder": {},
  "depth_defaults": { "role": "system", "depth": 0 },
  "avatar": "avatar.png",
  "description": "角色描述",
  "first_messages": ["开场白/0.txt", "开场白/1.txt"],
  "creator": "Author",
  "version": "1.0",
  "entryManifest": {
    "角色": {
      "Alice基本": {
        "path": "contents/Alice基本.txt",
        "scope": "specific",
        "part": "basic",
        "keywords": ["Alice"],
        "enabled": true,
        "strategy": { "type": "selective", "keys": ["Alice"] },
        "position": { "type": "after_character_definition", "order": 10 },
        "uid": 0
      }
    }
  }
}
```

## 命令

所有命令的第一个参数 `<project>` 优先作为 `.cardrc.json` 中 `projects` 的 key。若项目未注册，须通过 `--state` 等选项显式提供路径。

### 公共选项

| 选项 | 适用命令 | 说明 |
|------|---------|------|
| `--state <path>` | pack, configure, init, validate-mvu, query, patch | 直接指定 state.json 路径，跳过项目查找 |

### pack

将 state.json 打包为 SillyTavern 格式，含文件存在性验证、编码检测、MVU 校验和格式转换。

```
node scripts/tavern-cards-forge.mjs pack <project> [--state <path>] [--output <path>]
```

输出路径优先级：`--output` > 项目 `artifact` > state 同目录下 `{name}.{json|png}`。

执行顺序：
1. 验证以下文件是否存在：
   - `entryManifest.{type}.{name}.path` / `.contents[].file`
   - `regex_scripts[].replace_file`
   - `extensions.tavern_helper.scripts[].script_file`
   - `avatar`、`first_messages[]`
2. **编码检测**：读取每个内容文件时自动检测编码，非 UTF-8 文件报错退出
3. **MVU 验证**（`state.mvu === true` 时）：验证已启用的脚本中引用了 `MagicalAstrogy/MagVarUpdate` 且存在 `[InitVar]` 条目，不满足则报错退出

```bash
node scripts/tavern-cards-forge.mjs pack {project}
node scripts/tavern-cards-forge.mjs pack {project} --output /tmp/test.png
# 未注册项目须同时提供 --state 和 --output
node scripts/tavern-cards-forge.mjs pack adhoc --state ./state.json --output ./dist/output.png
```

### unpack

将 SillyTavern PNG/JSON 还原为 state.json + 内容文件。

```
node scripts/tavern-cards-forge.mjs unpack <project> [--file <path>] [--output <dir>] [--raw] [--split]
```

- `--raw`：输出原始 SillyTavern JSON（不转换为项目格式）
- `--split`：拆分长内容为独立文件
- 内容保存：YAML 结构 → `世界书/{name}.yaml`，否则 `.txt`；`replaceString` → `正则/{scriptName}.txt`；脚本 content → `脚本/{name}.txt`；first_messages → `开场白/0.txt`（[1:] 为 alternate_greetings）

```bash
node scripts/tavern-cards-forge.mjs unpack {project}
node scripts/tavern-cards-forge.mjs unpack {project} --raw
# 未注册项目须同时提供 --file 和 --output
node scripts/tavern-cards-forge.mjs unpack adhoc --file ./input.png --output ./project
```

### configure

推导并填充条目的运行时字段（strategy、position、uid）。仅基于 state.json，不读取 `.cardrc.json`。

```
node scripts/tavern-cards-forge.mjs configure <project> [--state <path>] [--force]
```

先验证配置完整性（typeLists 覆盖所有条目类型、strategyThresholds 覆盖所有类型、partOrder 覆盖所有 part），验证失败输出类似：

```
Validation FAILED:
  - state.strategyThresholds 为空，请先运行 init 命令
  - strategyThresholds 缺少类型 "custom_type" 的阈值配置
```

**策略推导**：阈值类型有简单值（统一值）和嵌套值（按 part 分别配置）。语义：`"Infinity"` → 始终 constant（🔵）；`0` → 始终 selective（🟢，需 keywords 非空）；`> 0` → count >= threshold → selective，否则 constant；`null` → disabled；未配置 → disabled。计数排除 `catalog` 和 EJS 条目（多个 EJS 合计只算 1），`required: true` 时只算非 EJS 条目。

**位置推导**：`before_char` → `before_character_definition`；`after_char` → `after_character_definition`；`depth` → `at_depth`（role/depth 取 `depth_defaults`）。`rephrase` 始终 `at_depth`。

**排序分配**：tens-group 算法。跨类型自动新十位块；同类型同 part 内用 token 重叠分组（条目名分词 + keywords），重叠则同组，否则新十位块。`rephrase` 反序排列在最后。

```bash
node scripts/tavern-cards-forge.mjs configure {project}
node scripts/tavern-cards-forge.mjs configure {project} --force
```

### init

从 `.cardrc.json` 读取默认配置写入 state.json（不存在时自动创建）。

```
node scripts/tavern-cards-forge.mjs init <project> [--state <path>] [--worldbook] [--mvu]
```

| 选项 | 说明 |
|------|------|
| `--state <path>` | 直接指定 state.json 路径（跳过项目查找） |
| `--worldbook` | 创建或更新为独立世界书项目（`form: "worldbook"`, `mvu: false`） |
| `--mvu` | 创建或更新为 MVU 角色卡项目（`form: "charactercard"`, `mvu: true`） |

`--worldbook` 和 `--mvu` 不能同时使用，因为 worldbook 项目不允许启用 MVU。两者都不提供时，新建 state 默认使用 `form: "charactercard"`、`mvu: false`；更新已有 state 时不改变现有的 `form` / `mvu`。

覆盖：`typeLists`、`strategyThresholds`、`partOrder`、`depth_defaults`。`projectName` 和 `create_date` 仅在为空时设置。

```bash
node scripts/tavern-cards-forge.mjs init {project}
```

### validate-mvu

校验 MVU 项目的 `initvar.yaml` 是否符合 `schema.ts` 定义的 Zod schema。可通过 `--initvar` 指定具体 initvar 文件路径；未指定时默认校验 `世界书/变量/initvar.yaml`。

```
node scripts/tavern-cards-forge.mjs validate-mvu <project> [--state <path>] [--initvar <path>]
```

前置条件：`mvu: true`、项目根目录有 `schema.ts`（导出 Zod Schema）、待校验的 initvar YAML 文件已编写。用 jiti 加载 `schema.ts`，注入全局 `z`（Zod v4）和 `_`（lodash）。项目自己的 `schema.ts` 应使用全局 `z` / `_`，不依赖本地 `node_modules`。

```bash
# 校验默认 initvar
node scripts/tavern-cards-forge.mjs validate-mvu {project}

# 校验额外开场白的 initvar_override
node scripts/tavern-cards-forge.mjs validate-mvu {project} --initvar cards/{Project}/开场白/initvar/1.yaml
```

成功输出 `validate-mvu: /path/to/initvar.yaml 校验通过`；失败输出详细错误路径和原因。

### query

使用 JSONPath 表达式查询 state.json。

```
node scripts/tavern-cards-forge.mjs query <project> <jsonpath> [--state <path>] [--format json|yaml]
```

结果为数组输出到 stdout，无匹配时静默退出（exit 0）。

```bash
node scripts/tavern-cards-forge.mjs query {project} '$.projectName'
node scripts/tavern-cards-forge.mjs query {project} '$.entryManifest.角色.*~' --format yaml
node scripts/tavern-cards-forge.mjs query {project} '$.entryManifest[*][?(@.strategy.type==="constant")]'
```

### patch

对 state.json 应用 RFC 6902 JSON Patch。输入优先级：`--file` > 参数 > stdin。

```
node scripts/tavern-cards-forge.mjs patch <project> [patch] [--file <path>] [--state <path>] [--dry-run] [--no-backup]
```

- 预检查：`add` 操作验证文件存在，`replace` 操作自动执行文件重命名（源存在→目标不存在→rename→更新 state）
- 备份到 `.patch-history/{project}/{timestamp}.json`，失败时回滚
- `--dry-run` 预览不写入，`--no-backup` 跳过备份

涉及文件路径自动重命名的字段：

| 路径模式 | 说明 |
|---------|------|
| `/entryManifest/{type}/{name}/path` | 条目内容文件 |
| `/entryManifest/{type}/{name}/contents/{i}/file` | 内容片段文件 |
| `/regex_scripts/{i}/replace_file` | 正则替换文件 |
| `/extensions/tavern_helper/scripts/{i}/script_file` | 脚本文件 |
| `/avatar` | 头像 PNG |
| `/first_messages/{i}` | 开场白文件 |

**不要提前手动重命名文件**，让 patch 的 precheck 处理。`move` 操作重命名条目时会输出提醒（文件路径不变需手动更新）。

```bash
node scripts/tavern-cards-forge.mjs patch {project} --file ./patches/update.json
node scripts/tavern-cards-forge.mjs patch {project} '[{"op":"remove","path":"/entryManifest/region/废弃地点"}]'
node scripts/tavern-cards-forge.mjs patch {project} --file ./patches/update.json --dry-run
# 从 stdin
echo '[{"op":"remove","path":"/entryManifest/region/废弃地点"}]' | node scripts/tavern-cards-forge.mjs patch {project}
```

## 数据模型

### EntryManifest

双层 Record：外层 key = 类型名称，内层 key = 条目名称（来自 SillyTavern 的 `comment` 字段，leaf 本身不包含 `name`）。

```
{ [类型名称]: { [条目名称]: EntryManifestLeaf } }
```

### EntryManifestLeaf

| 字段 | 类型 | 说明 |
|------|------|------|
| `path` | string? | 内容文件路径（与 `contents` 互斥） |
| `contents` | Array? | 有序内容片段列表（与 `path` 互斥），片段内 `content` 与 `file` 互斥 |
| `scope` | "catalog" \| "specific"? | 速览/详情；catalog 固定 🔵 |
| `part` | string? | 同类型内的子分类 |
| `rephrase` | boolean? | 重述/澄清条目 |
| `keywords` | string[] | 🟢 关键词候选 |
| `uid` | number? | 唯一标识符（configure 分配） |
| `enabled` | boolean? | 是否启用 |
| `strategy` | object? | `{ type: "constant"\|"selective"\|"vectorized"\|"constant_selective", keys?: string[], keys_secondary?: { logic: SelectiveLogic, keys: string[] }, scan_depth?: number\|"same_as_global" }` |
| `position` | object? | `{ type: PositionType, role?: "system"\|"user"\|"assistant", depth?: number, order: number }` |
| `display_index` | number? | 界面显示顺序 |
| `probability` | number? | 激活概率 (0-100) |
| `recursion` | object? | `{ prevent_incoming?: bool, prevent_outgoing?: bool, delay_until?: number }`（空时省略） |
| `effect` | object? | `{ sticky?: number, cooldown?: number, delay?: number }`（空时省略） |
| `group` | object? | `{ labels: string[], use_priority: bool, weight: number, use_scoring?: bool\|null }` |
| `extra` | object? | 额外字段 |

**PositionType**：`before_character_definition`(0)、`after_character_definition`(1)、`before_author_note`(2)、`after_author_note`(3)、`at_depth`(4)、`before_example_messages`(5)、`after_example_messages`(6)

**SelectiveLogic**：`and_any`(0)、`not_all`(1)、`not_any`(2)、`and_all`(3)

### RegexScript

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 唯一标识符 |
| `scriptName` | string | 脚本名称 |
| `findRegex` | string | 正则表达式 |
| `replaceString` / `replace_file` | string? | 替换内容（二选一互斥） |
| `trimStrings` | string[]? | 需要修剪的字符串 |
| `placement` | number[]? | 应用位置 |
| `disabled` / `markdownOnly` / `promptOnly` / `runOnEdit` | boolean? | 开关 |
| `substituteRegex` | number? | 替换模式 |
| `minDepth` / `maxDepth` | number? | 深度范围 |

### TavernHelperScript

| 字段 | 类型 | 说明 |
|------|------|------|
| `type` | "script" | 脚本类型 |
| `name` | string | 脚本名称 |
| `content` / `script_file` | string? | 内容或文件（二选一互斥） |
| `enabled` | boolean | 启用 |
| `id` | string | 唯一标识符 |
| `info` | string? | 说明 |
| `button` | object? | 按钮配置 |
| `data` | object? | 额外数据 |

### 互斥字段验证

| Schema | 互斥字段 |
|--------|---------|
| `EntryManifestLeaf` | `path` ↔ `contents` |
| `contents[]` | `content` ↔ `file` |
| `RegexScript` | `replaceString` ↔ `replace_file` |
| `TavernHelperScript` | `content` ↔ `script_file` |

## 格式转换映射

### 世界书格式对比

| 含义 | SillyTavern 标准格式 | 扁平格式（独立世界书） |
|------|---------------------|----------------------|
| 条目顺序 | `insertion_order` | `order` |
| 位置 | `extensions.position` | `position` |
| 显示索引 | `extensions.display_index` | `displayIndex` |
| 启用状态 | `enabled`（true=启用） | `disable`（true=禁用） |
| 关键字 | `keys` | `key` |
| 次要关键字 | `secondary_keys` | `keysecondary` |
| 选择逻辑 | `extensions.selectiveLogic` | `selectiveLogic` |
| 深度/角色 | `extensions.depth` / `extensions.role` | `depth` / `role` |
| 组配置 | `extensions.group*` | `group*`（驼峰） |
| 扫描深度 | `extensions.scan_depth` | `scanDepth` |
| 递归控制 | `extensions.exclude_recursion` / `prevent_recursion` / `delay_until_recursion` | 去前缀驼峰 |
| 黏性/冷却/延迟 | `extensions.sticky` / `cooldown` / `delay` | 同名 |
| 匹配字段 | `extensions.match_*` | `match*`（驼峰） |

**自动识别**：PNG → 角色卡；JSON 检测 `spec`（角色卡）或 `entries` 结构（世界书）。pack 时根据 `form` 和 `avatar` 选择输出格式。

## 项目目录结构与 state 差异

### 目录结构对比

```
{project}/
  tavern-cards-state.json
  avatar.png                     # 仅角色卡 PNG 项目
  schema.ts                      # 仅 MVU 项目
  {project}.png                  # 打包产物（角色卡 PNG）
  {project}.json                 # 打包产物（角色卡 JSON/独立世界书）
  世界书/
    {name}.txt / {name}.yaml     # 条目内容
    变量/                        # 仅 MVU 项目
      initvar.yaml
      变量列表.txt
      变量更新规则.yaml
      变量输出格式.txt
  开场白/ 0.txt [1.txt ...]      # 仅角色卡项目
  正则/  {name}.txt              # 仅角色卡项目
  脚本/  {name}.txt              # 仅角色卡项目
```

### state.json 差异

| 字段 | 角色卡 PNG | 角色卡 JSON | 独立世界书 |
|------|-----------|------------|-----------|
| `form` | `"charactercard"` | `"charactercard"` | `"worldbook"` |
| `avatar` | `"avatar.png"` | `""` | `null` |
| `first_messages` | `["开场白/0.txt", ...]` | 同上 | `[]` |
| `extensions` | `{ tavern_helper: {...} }` | 同上 | `null` |
| `regex_scripts` | `{ 脚本名: {...} }` | 同上 | `null` |
