# MVU 变量系统

## 编写原则

- 只需编写 3 个核心文件：`schema.ts`、`initvar.yaml`、`变量更新规则.yaml`
- 其余文件（`变量列表.txt`、`变量输出格式.txt` 等）和配置合并通过收尾步骤完成
- 所有中文内容使用简体中文，不使用繁体字

**前置**：项目使用 MVU（tavern-cards-state.json 中 mvu: true）。

## 组件链路

```
schema.ts ──────► initvar.yaml（必须符合 Schema）
    │
    └──────────► 变量更新规则.yaml（type/range 需与 Schema 一致）

schema.ts ──────► Zod 脚本（pack 时由 state.zod 驱动，从 schema.ts 自动生成并注入产出物）

模板文件（变量列表.txt、变量输出格式.txt、正则等）：收尾时从 assets/mvu-templates/ 复制
配置合并（entryManifest/mvu、脚本注册、正则注册等）：收尾时通过 JSON Patch 注入
```

编写顺序：schema.ts → initvar.yaml → 变量更新规则.yaml。各阶段详见对应文档。

## MVU 变量特殊前缀

| 前缀 | AI 可见 | AI 可更新 | 用途 |
|------|--------|----------|------|
| 无前缀 | 是 | 是 | 普通变量 |
| `_` 前缀 | 是 | 否（提示词告知 AI 不更新，脚本可更新） | 需要展示给 AI 但不希望 AI 修改的派生状态 |
| `$` 前缀 | 否 | 否（AI 不可见自然无法更新，脚本可更新） | 不需要展示给 AI 的隐藏状态 |

## 条目前缀

MVU 条目名称使用前缀标记功能定位和双 AI 发送路由，详见 `references/conventions.md`。

编写完三个核心文件后，分析 schema.ts 中的变量结构，确定 MVU 追踪的内容类型，识别与追踪内容不相关的条目，询问用户是否添加 `[mvu_plot]` 前缀以优化双 AI 发送路由。

## 路径对照

| 操作 | 路径格式 | 示例 |
|------|---------|------|
| EJS `getvar` | `stat_data.角色.好感度`（点分隔） | 点访问 |
| AI JSON Patch | `/角色/好感度`（斜杠分隔，无 stat_data） | JSON Pointer |
| YAML `initvar` | `角色: { 好感度: 35 }`（嵌套） | YAML 嵌套 |

## 阶段索引

| 阶段 | 文档 | 产出 |
|------|------|------|
| 1 | `references/mvu/schema.md` | schema.ts |
| 2 | `references/mvu/initvar.md` | initvar.yaml |
| 3 | `references/mvu/update-rules-guide.md` | 变量更新规则.yaml |
| 4 | 收尾（见下方） | 模板文件 + 配置合并 + 校验 |

## 收尾步骤

三个核心文件编写完成后：

### 1. 复制模板文件

将 `assets/mvu-templates/` 整体复制到项目目录（路径一一对应，无需重命名）。复制后的项目模板默认视为固定资产；模板作用、允许修改的范围和例外流程见 `references/mvu/templates.md`（按需查阅）。

### 2. 应用 JSON Patch 合并配置

**新项目**（`init` 创建，无 extensions/regex_scripts）：先应用 `assets/mvu-prereq-patch.json`，再应用 `assets/mvu-patch.json`。

**已有项目**（`unpack` 创建，extensions/regex_scripts 已存在）：直接应用 `assets/mvu-patch.json`。

```bash
# 新项目
node scripts/tavern-cards-forge.mjs patch {project} --file assets/mvu-prereq-patch.json
node scripts/tavern-cards-forge.mjs patch {project} --file assets/mvu-patch.json

# 已有项目
node scripts/tavern-cards-forge.mjs patch {project} --file assets/mvu-patch.json
```

两个 patch 文件的功能：
- **mvu-prereq-patch.json**：补建 `extensions`（含 tavern_helper.scripts/variables）和 `regex_scripts` 空对象
- **mvu-patch.json**：设置 `mvu: true`、添加 mvu 条目到 entryManifest、添加策略阈值和 part 排序、注册 MVU/Zod 脚本、添加 5 个正则脚本

### 3. 校验 initvar.yaml

```bash
# 校验默认 initvar
node scripts/tavern-cards-forge.mjs validate-mvu {project}

# 校验 initvar_override
node scripts/tavern-cards-forge.mjs validate-mvu {project} --initvar cards/{Project}/开场白/initvar/1.yaml
```

用 schema.ts 中的 Zod Schema 校验 initvar.yaml，确保初始变量符合变量结构定义。开场白使用 `initvar_override` 时，通过 `--initvar` 选项指定具体文件路径。校验失败的处理见 `references/error-handling.md#MVU-校验失败`。

### 4. MVU 一致性检查

MVU 和 EJS 编写完成后，检查 MVU 变量系统与已编写世界书条目的一致性。不通过则修正后重新检查。

#### schema.ts 与条目内容覆盖

加载 `references/mvu/schema.md`（schema 编写原则），对照 schema.ts 中定义的变量结构，检查：

- schema 中的枚举值或阶段说明——是否有对应的世界书条目描述了这些值/阶段的含义？
- schema 中的变量取值范围（如"当前场景"的可能值）——每个取值是否有对应的地理条目或场景描述？
- 变量值的潜在变化方向（如"魔力同步率提高后会触发什么"）——世界书中是否有对应的事件/机制描述？
- schema 中关键路径与 entryManifest 条目能否对应——有取值但无描述则需补充世界书条目
- schema.ts 是否遵守了 `references/mvu/zod-rule.yaml` 中的 Zod 4 规则（幂等性、z.enum 节制、首选项类型等）

发现不一致时（如 schema 有取值但世界书未描述），优先在世界书条目中补充对应内容。

#### initvar.yaml 与开场白一致性

加载 `references/mvu/initvar.md`，检查：

- initvar.yaml 的初始值是否与开场白的初始状态一致（如好感度、当前场景等）
- initvar.yaml 是否通过了 validate-mvu 校验（运行 `node scripts/tavern-cards-forge.mjs validate-mvu {project}`）
- 使用了 `initvar_override` 的开场白：`initvar_overrides` 是否已通过 patch 注册到 state（见 `references/mvu/initvar.md`）；初始值是否与 override 文件一致
- YAML 层级结构是否与 schema.ts 定义一致
- 无繁体字、日文汉字

#### 变量更新规则与 schema 一致性

加载 `references/mvu/update-rules-guide.md` 和 `references/mvu/update-rules.yaml`，检查：

- `变量更新规则.yaml` 中的 type 字段是否与 schema.ts 对应变量类型一致
- 变量路径是否正确（注意 z.record 动态键的路径写法）
- 自明变量是否省略了 check 规则
- 同类变量是否已用 `${key1|key2}` 合并
- `_` 前缀的只读变量是否未写更新规则
- range/category 分段是否与项目设定一致

#### EJS 变量映射完整性

加载 `references/ejs/guide.md`，检查：

- 所有 `ejs.entries` 中 `condition` 引用的 MVU 变量路径是否在 schema.ts 中定义
- 条件中所有 `stat_data.xxx` 路径在 schema.ts 有定义
- 对照 schema.ts，确认每个 EJS 条件使用的变量都在 schema 中有定义
- 未定义的变量需要返回 MVU 流程补全 schema.ts

## 修改流程

当需要修改已创建的 MVU 变量时（新增、修改变量名、删除或修改类型/范围/初始值等），按以下步骤执行。

### 变更传播矩阵

修改 schema.ts 中的变量定义时，必须同步更新所有受影响文件：

| 变更类型 | schema.ts | initvar¹ | 更新规则.yaml | 创作规划.yaml | 世界书条目 |
|---------|-----------|-------------|-------------|--------------|-----------|
| 新增变量 | ✓ | 添加初始值 | 非自明则添加 | 按需更新 | enum值需对应描述条目 |
| 修改变量名 | ✓ | 同步改名 | 同步改名 | 同步改名 | — |
| 删除变量 | ✓ | 删除对应值 | 删除对应规则 | 删除对应段 | — |
| 修改类型 | ✓ | 需通过校验 | 同步 type | — | enum值需补充描述 |
| 修改范围/格式 | ✓ | — | 同步 range/format | — | — |
| 修改初始值 | — | 修改对应值 | — | — | — |

> ¹ `initvar` 包含默认 `initvar.yaml` 和所有额外开场白的 `initvar_override`（`开场白/initvar/{index}.yaml`）。新增/改名/删除/修改类型时，所有 initvar 文件均需同步；修改初始值时各 override 按需独立管理。

> Zod 脚本由 pack 从 schema.ts 自动生成（通过 state.zod 驱动）。

### 执行步骤

1. **确认变更类型**：用户要新增/重命名/删除/修改哪个变量，在传播矩阵中找到对应行
2. **按矩阵变更文件**：修改 schema.ts 后，同步更新矩阵中标注「✓」的其他文件
3. **更新 EJS 条目内 getvar 路径**（如有 EJS 条目引用该变量）：新增/改名/删除变量时，同步更新所有 EJS 条件与段落控制中的 stat_data 路径
4. **同步创作规划.yaml**：使 `mvu.variables` 段与最新的 schema.ts 一致
5. **补充世界书条目**（如有）：如果新增了 enum 值或取值范围，检查世界书中是否有对应条目描述其含义
6. **校验**：
   - 运行 `node scripts/tavern-cards-forge.mjs validate-mvu {project}` 校验 initvar.yaml
   - 执行收尾步骤第 4 步的 MVU 一致性检查
