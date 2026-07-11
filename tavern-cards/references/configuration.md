# 条目配置

> 本文档只在用户有特殊配置需求时读取。正常情况下，运行 `configure` 命令即可自动推导所有字段，无需手动设置。

`configure` 命令从 entryManifest 自动推导所有条目的运行时字段。

`enabled`、`strategy`、`position` 通常不必手动设置，由 configure 自动推导。`probability`、`recursion`、`effect`、`group` 等字段使用默认值即可满足大多数场景。只有需要特殊行为（如概率触发、互斥组、粘性效果等）时才需手动指定。

## 运行命令

```bash
node scripts/tavern-cards-forge.mjs configure {project}
```

默认仅填充缺失字段。加 `--force` 可覆盖已有值。

## typeLists

typeLists 已在需求对齐阶段配置（见 `references/requirements.md`）。configure 命令检查 entryManifest 中是否有类型遗漏——如果存在未出现在 typeLists 中的类型，提示用户补充到对应位置。

## 铁律

- **D1+ 深度绝对禁止使用**

## 策略推导

configure 按 **策略 → 位置 → 排序** 的顺序依次推导。所有字段仅在缺失时填充，加 `--force` 可覆盖已有值。

### 策略（strategy）

策略推导以 `strategyThresholds` 为依据，阈值为：

| 阈值 | 含义 |
|------|------|
| `Infinity` | 始终 **constant**（常驻背景，🔵） |
| `0` | 始终 **selective**（关键词触发，🟢） |
| `null` | **禁用**（`enabled: false`） |
| `> 0` 的数字 | 条件判断：同 part 条目数 ≥ 阈值时为 selective，否则为 constant |

阈值配置有两种形式：

- 简单形式：单个数字/`Infinity`/`null`，所有条目统一判断
- 嵌套形式（per-part）：`{ basic: { threshold: 5, required: true }, personality: { threshold: 'Infinity', required: false } }`，按 part 分别判断

`scope` 影响策略：
- `catalog` → 始终 constant，不参与同 part 计数
- `specific` / 未设置 → 参与计数，按阈值判断

`rephrase` 条目不参与计数。EJS 条目（`@@if` 前缀）在同 part 中最多计为 1。

注意：`vectorized` 和 `constant_selective` 不会由 configure 推导，它们仅来自 SillyTavern 的 unpack 过程。configure 只产出 `constant` 或 `selective`。

### 位置（position）

位置根据 `typeLists` 的配置推导，按以下顺序匹配（首个命中即停止）：

1. `before_char` 中的类型 → `before_character_definition`
2. `after_char` 中的类型 → `after_character_definition`
3. `depth` 中的类型 → `at_depth`（role/depth 使用 `depth_defaults`）
4. `rephrase` 条目 → 无论类型列表如何，强制 `at_depth`

不在上述分类中的类型不推导 position，需手动指定。

### 排序（order）

configure 对所有条目按 tens-group 算法 分配 order 值：

- 起始值为 10，每个条目递增 1
- 跨类型边界时跳到下一个整十数
- 同类型、简单形式 的条目在同一个 tens 块内
- 同类型、嵌套形式：若条目名称或者 keywords 有重叠则合并到一个块，否则分开
- rephrase 条目单独收集、逆序后追加到末尾

order 数字越小越先注入。collection order 按 typeLists 的 `before_char` → `after_char` → `depth` 顺序排列，未列出的类型排在最后。

## Native SillyTavern 字段说明

### keywords

触发关键词/短语。

- **selective** 模式：关键词出现在聊天历史中时激活
- **vectorized** 模式：关键词作为语义搜索锚点
- 使用具体名词（角色名、地名、物品名），避免泛用词防止误触发

### enabled

是否启用。`false` 时条目完全被忽略，可用于临时禁用而不删除。

### strategy

激活策略，控制条目如何被触发。

- **type**：
  - `"constant"`：始终激活，每轮注入。用于常驻背景设定
  - `"selective"`：关键词匹配时激活
  - `"vectorized"`：语义相似时激活（需要嵌入模型）
  - `"constant_selective"`：始终激活，但仍追踪关键词用于次要逻辑
- **keys**：`string[]`，主触发词
- **keys_secondary**：`{ logic, keys }`，主匹配后的二次过滤
  - `"and_all"`：所有次要关键词都必须出现
  - `"and_any"`：任一次要关键词出现即可
  - `"not_all"`：所有次要关键词都不出现时激活
  - `"not_any"`：任一次要关键词出现则不激活
- **scan_depth**：`"same_as_global"` 或数字。扫描最近几条消息查找关键词

### position

注入提示词的位置。

- **type**：
  - `"before_character_definition"`：角色核心描述之前
  - `"after_character_definition"`：角色描述之后
  - `"before_example_messages"`：示例对话之前
  - `"after_example_messages"`：示例对话之后
  - `"before_author_note"` / `"after_author_note"`：作者备注前后
  - `"at_depth"`：指定深度层级（需配合 `depth`）
- **role**：`"system"` / `"assistant"` / `"user"`，注入文本的消息角色
- **depth**：数字，仅 `"at_depth"` 时使用，定义注入深度
- **order**：数字，同位置多个条目的排序权重。**数字越小越先注入**

### display_index

SillyTavern 界面中的显示顺序，纯外观，不影响提示词组装。

### probability

激活概率（0-100）。即使其他条件都满足，只有该百分比的概率会注入。用于增加变化性。

### recursion

递归激活控制。

默认值（`prevent_incoming: true, prevent_outgoing: true`）在 pack 时自动补回，无需手动设置。需要非默认行为时再手动指定。

- **prevent_incoming**：`true` 时，其他条目不能递归拉取本条目
- **prevent_outgoing**：`true` 时，本条目不能递归激活其他条目
- **delay_until**：数字或 `null`，延迟到第 n 级递归时才能激活本条目

### effect

时间行为修饰符。

- **sticky**：激活后持续 n 条消息，即使关键词不再匹配
- **cooldown**：停用后 n 条消息内不能再次激活
- **delay**：聊天至少有 n 条消息后才能激活

### group

组交互。共享标签的条目属于同一组。

- **labels**：`string[]`，组名称
- **use_priority**：`true` 时，组内只激活权重最高的条目，其余抑制。用于互斥设定变体
- **weight**：数字（默认 100），优先级/评分权重
- **use_scoring**：`true` 时，组内条目通过评分竞争，最佳匹配的条目被选中
