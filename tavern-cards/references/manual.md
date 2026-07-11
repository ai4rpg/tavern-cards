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
        "position": { "type": "after_character_definition", "order": 10 }
      }
    }
  },
  "zod": {  // 仅 MVU 项目
    "scriptName": "Zod",
    "scriptId": "5b3b09af-35e3-4149-a0f7-2f08776ed6a1",
    "schemaPath": "schema.ts",
    "importUrl": "https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js"
  }
}
```

## 命令

所有命令的第一个参数 `<project>` 优先作为 `.cardrc.json` 中 `projects` 的 key。若项目未注册，须通过 `--state` 等选项显式提供路径。

### 公共选项

| 选项 | 适用命令 | 说明 |
|------|---------|------|
| `--state <path>` | pack, configure, init, validate-mvu, query, patch, unpack | 直接指定 state.json 路径，跳过项目查找 |

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
   - `initvar_overrides` 中所有值
2. **编码检测**：读取每个内容文件时自动检测编码（内建于 `readFileText`，贯穿校验与构建阶段），非 UTF-8 文件报错退出
3. **MVU 校验阶段**（`state.mvu === true` 时依次执行，全部通过才继续）：
   - **MVU 特征检测**：验证启用的脚本中引用了 `MagicalAstrogy/MagVarUpdate` 且存在 `[InitVar]` 条目
   - **schema.ts 预检**（`state.zod` 存在时，路径通过 `state.zod.schemaPath` 定位）：拦截所有 `import` 语句
   - **Zod 脚本内容校验**（`state.zod` 存在时执行）：仅检测 `export type`
   - **[InitVar] 条目禁用校验**：所有 `[InitVar]` 条目必须显式设置 `enabled: false`
   - **initvar 一致性校验**（`state.zod` 存在时）：用 Zod Schema 校验 `[InitVar]` 条目 YAML 及 `initvar_overrides` 中所有文件
   - `state.zod` 缺失时输出警告，跳过 Zod 相关校验
4. **构建阶段**（仅 `form=charactercard`）：
   - 文件解析：加载 `path`/`contents`、`replace_file`、`script_file` 指向的文件内容
   - **Zod 脚本生成**：由 `state.zod` 驱动，从 `schemaPath` 重建；Zod 脚本内容直接注入产出物
   - **initvar_override 嵌入**：若 `state.initvar_overrides` 存在，对应开场白末尾的 `<UpdateVariable><initvar>` 块更新为 override YAML 内容
5. 输出格式选择与写出

```bash
node scripts/tavern-cards-forge.mjs pack {project}
node scripts/tavern-cards-forge.mjs pack {project} --output /tmp/test.png
# 未注册项目须同时提供 --state 和 --output
node scripts/tavern-cards-forge.mjs pack adhoc --state ./state.json --output ./dist/output.png
```

### unpack

将 SillyTavern PNG/JSON 还原为 state.json + 内容文件。

```
node scripts/tavern-cards-forge.mjs unpack <project> [--file <path>] [--output <dir>] [--state <path>] [--json] [--fresh]
```

- `--json`：从 PNG 中提取角色卡 JSON 对象（仅支持 PNG 输入；对 JSON 输入使用 `--json` 会报错）。输出为完整的 `chara_card_v2` JSON 对象，保存到 `--output` 目录
- `--fresh`：跳过与已有 state.json 合并，作为全新解包覆盖输出；与 `--state` 互斥
- `--state <path>`：指定已有 state.json 路径用于合并模式；`--output` 未指定时从其所在目录推导
- 内容保存：YAML 结构 → `世界书/{name}.yaml`，否则 `.txt`；`replaceString` → `正则/{scriptName}.txt`；脚本 content → `脚本/{name}.txt`
- **文件名冲突防护**：写出条目文件时，如目标路径已被占用，自动添加 `_1`/`_2` 等数字后缀避免冲突。这在 merge 模式下尤其重要（已有文件可能与新条目同名）
- **启用的 Zod 脚本**：从 `tavern_helper.scripts` 中检测到 MVU Zod 脚本后，提取元数据到 `state.zod`，写出 `schema.ts`，并从 scripts 中移除该 Zod 脚本条目（不再写出为 `脚本/{name}.txt`）。压缩/编译脚本仅记录警告，提示手动编写 `schema.ts`
- first_messages → `开场白/{index}.txt`（[0] 为 first_mes，[1:] 为 alternate_greetings）
- **`mvu === true` 时**：对所有开场白检测并提取 `<UpdateVariable><initvar>` 块为 `开场白/initvar/{index}.yaml`，同时填充 `initvar_overrides`

**unpack 详细行为：**

1. 读取输入 PNG/JSON 文件
2. 自动识别格式类型（PNG→角色卡；JSON→检测扁平世界书 / 角色卡标准格式）
3. 提取所有条目，转换为扁平的 EntryManifestLeaf 结构
4. **MVU 自动检测**（`detectMvu`，characterMeta 合并后）：满足条件时 `mvu: true`
5. 每个条目的 content 处理：YAML 对象→`世界书/{name}.yaml`，否则 `.txt`
6. `regex_scripts` 中每个 `replaceString` 写入 `正则/{name}.txt`，设置 `replace_file`
7. `tavern_helper.scripts` 中每个 `content` 写入 `脚本/{name}.txt`，设置 `script_file`
   - **启用的 Zod 脚本**：将元数据提取到 `state.zod`（scriptId/importUrl 取原值，schemaPath 写入提取路径），写出 `schema.ts`，并从 scripts 中移除该 Zod 脚本条目（不再写出为 `脚本/{name}.txt`）
   - `button`/`info`/`data` 三个可选字段：如果值等于 ST 默认值（空串、`{enabled:true,buttons:[]}`、`{}`）则不写入 `state.zod`，保持 state 极简；pack 时自动回填默认值
   - 多个启用时警告「运行时不确定，建议禁用多余」并取第一个
   - 压缩/编译脚本（含 sourceMappingURL / import 别名 / 超长单行）跳过提取，提示手动编写 `schema.ts`
8. `first_messages` 写入 `开场白/{index}.txt`
   - `mvu === true` 时，对所有开场白检测 `<UpdateVariable><initvar>` 块，写出为 `开场白/initvar/{index}.yaml`，填充 `initvar_overrides` 映射
9. 生成 `tavern-cards-state.json`

**merge 模式**（默认行为）：当存在已有 state.json 时，将新解包数据与已有 state 合并：
- 两轮匹配：第一轮按条目名 (comment) 匹配；第二轮按归一化内容匹配（检测重命名）
- 旧条目未匹配时，文件保留在原位不删除，末尾汇总输出未匹配文件路径
- `state.zod` 合并策略：角色卡侧有 Zod 脚本 → `scriptId`/`importUrl` 取新值（角色卡侧优先）；已有 state 的 `schemaPath` 保留（用户可能自定义路径）；角色卡侧无 Zod 脚本但已有 `state.zod` → 保留旧描述符（输出警告）
- `--fresh` 为全新解包（旧版默认行为）；`--state` 与 `--fresh` 互斥

> **独立世界书路径提前 return**：步骤 2 检测到扁平格式世界书时会跳过步骤 4-8 的 MVU/脚本/开场白处理。扁平世界书永非 MVU，`mvu` 保持默认 `false`，无 `initvar_overrides`、无 `schema.ts` 提取。

> **磁盘残留文件**：如 `tavern_helper.scripts` 中已存在同名脚本且 `state.zod` 也存在，pack 时输出警告并覆盖，建议重新 unpack 清理冗余脚本条目。磁盘上如有旧的 `脚本/{name}.txt` 残留文件，unpack 输出提示可手动删除。

```bash
node scripts/tavern-cards-forge.mjs unpack {project}
node scripts/tavern-cards-forge.mjs unpack {project} --fresh
node scripts/tavern-cards-forge.mjs unpack {project} --json
# 未注册项目须同时提供 --file 和 --state 或 --output（全新解包）
node scripts/tavern-cards-forge.mjs unpack adhoc --file cards/{Project}/{Project}.png --state cards/{Project}/tavern-cards-state.json
node scripts/tavern-cards-forge.mjs unpack adhoc --file cards/{Project}/{Project}.png --output cards/{Project} --fresh
```

### configure

推导并填充条目的运行时字段（strategy、position）。仅基于 state.json，不读取 `.cardrc.json`。

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

前置条件：`mvu: true`、`state.zod` 存在（含 `schemaPath` 指向 `schema.ts`）、待校验的 initvar YAML 文件已编写。schema.ts 路径通过 `state.zod.schemaPath` 定位。缺失时报错提示运行 `unpack` 自动填充。用 jiti 加载 `schema.ts`，注入全局 `z`（Zod v4）和 `_`（lodash）。项目自己的 `schema.ts` 应使用全局 `z` / `_`，不依赖本地 `node_modules`。

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
| `/regex_scripts/{name}/replace_file` | 正则替换文件 |
| `/extensions/tavern_helper/scripts/{name}/script_file` | 脚本文件 |
| `/zod/schemaPath` | Zod schema 文件路径 |
| `/avatar` | 头像 PNG |
| `/first_messages/{i}` | 开场白文件 |
| `/initvar_overrides/{key}` | initvar_override YAML 文件 |

**不要提前手动重命名文件**，让 patch 的 precheck 处理。`move` 操作重命名条目时只改 entryManifest 的 key，**不会**自动改 leaf 的 `path`/`contents[].file` 字段，也不会动磁盘文件；会输出提醒。若要保持名实一致，再用 `replace` 操作改 `path` 字段（patch 会自动重命名磁盘文件，不要手动 `mv`）。

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
| `enabled` | boolean? | 是否启用 |
| `strategy` | object? | `{ type: "constant"\|"selective"\|"vectorized"\|"constant_selective", keys?: string[], keys_secondary?: { logic: SelectiveLogic, keys: string[] }, scan_depth?: number\|"same_as_global" }` |
| `position` | object? | `{ type: PositionType, role?: "system"\|"user"\|"assistant", depth?: number, order: number }` |
| `display_index` | number? | 界面显示顺序 |
| `probability` | number? | 激活概率 (0-100) |
| `recursion` | object? | `{ prevent_incoming?: bool, prevent_outgoing?: bool, delay_until?: number }`（空时省略） |
| `effect` | object? | `{ sticky?: number, cooldown?: number, delay?: number }`（空时省略） |
| `group` | object? | `{ labels: string[], use_priority: bool, weight: number, use_scoring?: bool\|null }` |

**PositionType**：`before_character_definition`(0)、`after_character_definition`(1)、`before_author_note`(2)、`after_author_note`(3)、`at_depth`(4)、`before_example_messages`(5)、`after_example_messages`(6)

**SelectiveLogic**：`and_any`(0)、`not_all`(1)、`not_any`(2)、`and_all`(3)

### ZodDescriptor

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `scriptName` | string | ✓ | 脚本名，重建到 `tavern_helper.scripts` 时的 key |
| `scriptId` | string | ✓ | 来自角色卡的脚本 id；pack 时原样回写以保持跨 pack 稳定 |
| `schemaPath` | string | ✓ | schema.ts 相对项目根目录的路径 |
| `importUrl` | string | ✓ | `registerMvuSchema` 的 CDN import URL |
| `button` | object? | | 脚本按钮配置（非 ST 默认值时保留） |
| `info` | string? | | 脚本信息（非 ST 默认值时保留） |
| `data` | object? | | 脚本附加数据（非 ST 默认值时保留） |

> `button`/`info`/`data` 三字段：unpack 时自动剥离等于 ST 默认值的条目（保持 state 极简），pack 时自动回填 ST 默认值（保证产出物与 ST 原生导出一致）。用户通常无需手动编辑这三个字段。

**TavernCardsState 新增字段**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `zod` | ZodDescriptor? | MVU Zod 脚本元数据；存在时隐含 `mvu=true`，pack 据此重建脚本内容 |

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
  开场白/
    0.txt
    1.txt
    initvar/                     # 仅 MVU 项目，unpack 提取或手动创建
      1.yaml                     # 与 开场白/{index}.txt 编号一致
  正则/  {name}.txt              # 仅角色卡项目
  脚本/  {name}.txt              # 仅角色卡项目（Zod 脚本由 state.zod 驱动重建）
```

> unpack 提取 Zod 脚本元数据到 `state.zod`。

### state.json 差异

| 字段 | 角色卡 PNG | 角色卡 JSON | 独立世界书 |
|------|-----------|------------|-----------|
| `form` | `"charactercard"` | `"charactercard"` | `"worldbook"` |
| `avatar` | `"avatar.png"` | `""` | 缺省 |
| `first_messages` | `["开场白/0.txt", ...]` | 同上 | `[]` |
| `extensions` | `{ tavern_helper: {...} }` | 同上 | 缺省 |
| `initvar_overrides` | MVU 项目可选（`{ "开场白/1.txt": "开场白/initvar/1.yaml" }`）；无 override 时缺省 | 同左 | 缺省（worldbook 恒 mvu=false，superRefine 校验禁止此字段） |
| `zod` | MVU 项目可选（ZodDescriptor，pack 据此重建 Zod 脚本） | 同左 | 缺省 |

> `initvar_overrides` 仅 `state.mvu === true` 时可存在；`mvu === false` 时必须缺省（Zod superRefine 校验，pack 会拦）。
