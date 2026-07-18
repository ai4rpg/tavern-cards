# 正则脚本配置指南

## 什么是 regex_scripts

regex_scripts 是 SillyTavern 的消息处理管道中的一环。每个脚本定义了一条正则匹配规则，当消息内容匹配时，执行替换或隐藏操作。通过 `mvu-patch.json` 的 `/regex_scripts/` 路径注册。

## 核心模式：配对

每个 UI 元素通常需要两个 regex_scripts 配合工作：

| 角色 | 脚本用途 | `promptOnly` | `markdownOnly` | `replaceString`/`replace_file` |
|------|----------|-------------|----------------|-------------------------------|
| **隐藏** | 隐藏发送给 AI 的原始标签 | `true` | `false` | `replaceString: ""` |
| **替换** | 在前端展示美化后的 HTML | `false` | `true` | `replace_file: "路径/文件.html"` |

### 示例：状态栏

**隐藏脚本**（`对AI隐藏状态栏`）—— 从 AI 上下文移除占位符：

```json
{
  "findRegex": "<StatusPlaceHolderImpl/>",
  "replaceString": "",
  "placement": [2],
  "promptOnly": true,
  "markdownOnly": false,
  "substituteRegex": 0,
  "runOnEdit": true
}
```

**替换脚本**（`状态栏界面`）—— 在前端将占位符替换为 HTML 界面：

```json
{
  "findRegex": "<StatusPlaceHolderImpl/>",
  "replace_file": "正则/状态栏界面.html",
  "placement": [2],
  "promptOnly": false,
  "markdownOnly": true,
  "substituteRegex": 0,
  "runOnEdit": true
}
```

> 两个脚本使用相同的 `findRegex`，但一个隐藏（对 AI 不可见）、一个替换（对用户可见）。当 SillyTavern 处理消息时，两个脚本都运行，各自作用在不同阶段。
> **前端界面的正则只负责定位、不解析数据**：状态栏这类前端界面的正则只需把占位符替换成 HTML 代码块，输出数据（状态、场景等）应由前端代码通过 `getChatMessages` 或 MVU store 获取，不在正则替换串里用 `$1` 取字段。详见 `frontend.md` 的「前端界面的正则：只定位、不解析」。注意本原则仅针对前端界面正则；下方变量更新类正则（解析 `<update>` 内容）仍正常使用捕获组 `$2`。

## 字段参考

| 字段 | 说明 | 常用值 |
|------|------|--------|
| `id` | UUID，唯一标识 | `"xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"` |
| `findRegex` | 匹配正则，JSON 中需转义反斜杠 | `"/pattern/gsi"` 或 `"<Placeholder/>"` |
| `replaceString` | 内联替换字符串 | `""`（隐藏用） |
| `replace_file` | 替换用的 HTML 文件路径（相对于角色卡根目录） | `"正则/xxx.html"` |
| `trimStrings` | 替换前修剪的字符串数组 | `[]` |
| `placement` | 作用范围：1=用户输入, 2=AI输出, 3=快捷命令, 4=世界书, 5=推理 | `[2]`, `[1,2]` |
| `disabled` | 是否禁用 | `false` |
| `markdownOnly` | 仅影响前端显示 | 替换脚本用 `true`，隐藏脚本用 `false` |
| `promptOnly` | 仅影响后端提示词（AI 侧） | 隐藏脚本用 `true`，替换脚本用 `false` |
| `runOnEdit` | 编辑消息时触发 | 状态栏用 `true`，变量更新用 `false` |
| `substituteRegex` | 0=不替换, 1=替换(原始), 2=替换(转义) | 通常为 `0` |
| `minDepth` | 影响的最小楼层深度（1=最新） | `null` |
| `maxDepth` | 影响的最大楼层深度 | `null` |

### 字段详解

- `placement`：数组，指定正则脚本在哪些处理阶段生效。`[2]` 只处理 AI 输出，`[1,2]` 同时处理用户输入和 AI 输出。状态栏通常只需 `[2]`，变量更新需要对用户输入也处理（因为变量更新可能出现在 AI 消息或用户消息中），所以用 `[1,2]`。
- `promptOnly` vs `markdownOnly`：`promptOnly: true` 的脚本在消息发送给 AI 前运行（控制 AI 能看到什么），`markdownOnly: true` 的脚本在消息渲染到前端时运行（控制用户能看到什么）。两者可同时启用，效果与 `substituteRegex: 2` 相似，但不改变原始文本，更安全。
- `substituteRegex`：当需要修改匹配内容本身时设为 `1` 或 `2`。设 `0` 时不改变原始文本（最安全）。绝大多数场景用 `0`。
- `runOnEdit`：用户在消息编辑框中修改内容时是否触发。状态栏这类需要实时预览的场景设为 `true`；变量更新在编辑时不需触发，设为 `false`。
- `minDepth` / `maxDepth`：限制脚本仅作用于一定楼层深度的消息。最新消息深度为 1，越早的消息深度越大。`null` 表示不限制。

## 正则表达式详解

### 简单占位符标签

匹配一个固定的标签：

```
<StatusPlaceHolderImpl/>
```

- 无捕获组，直接整体匹配
- 隐藏脚本：将整个匹配替换为空字符串
- 替换脚本：将整个匹配替换为 HTML 文件内容

**JSON 中的反斜杠转义**：当正则中含有特殊字符的反斜杠时，JSON 中需要用 `\\` 表示一个 `\`。例如 `\/` 在 JSON 中写作 `\\/`。如果正则中不含反斜杠（如 `<StatusPlaceHolderImpl/>`），则无需额外转义。

### 带标签对匹配（完整标签）

```
/<(update(?:variable)?)>\s*((?:(?!<\1>).)*)\s*<\/\1>/gsi
```

匹配 `<update>内容</update>` 或 `<updatevariable>内容</updatevariable>`：

| 部分 | 含义 |
|------|------|
| `<` + `(update(?:variable)?)` | 匹配 `<update` 或 `<updatevariable`，捕获到 $1 |
| `>` | 匹配 `>` |
| `\s*` | 匹配开头空白 |
| `((?:(?!<\1>).)*)` | 匹配中间内容（不包含标签本身），捕获到 $2 |
| `\s*` | 匹配结尾空白 |
| `<\/\1>` | 匹配 `</update>` 或 `</updatevariable>`（反向引用 $1） |
| `gsi` | `g`=全局, `s`=dotall(.匹配换行), `i`=忽略大小写 |

在替换文件（如 `变量更新美化.html`）中使用 `$2` 引用捕获的中间内容。

### 不完整标签匹配（无闭合）

```
/<(update(?:variable)?)>(?!.*<\/\1>)\s*((?:(?!<\1>).)*)\s*$/gsi
```

匹配 `<update>内容`（没有 `</update>` 闭合）：

| 部分 | 含义 |
|------|------|
| `(?!.*<\/\1>)` | **负向前瞻**：确保后面没有 `</update>` |
| `((?:(?!<\1>).)*)` | 匹配到行末的内容 |
| `$` | 行尾锚定 |

通过 `$` 锚定确保只匹配不完整的标签。替换文件（如 `变量更新中美化.html`）中显示"正在更新..."动画。

### 隐藏同时匹配两种状态

```
/<\s*(update(?:variable)?)>(?:(?!.*<\/\1>)(?:(?!<\1>).)*$|(?:(?!<\1>).)*<\/\1?>)/gsi
```

通过 `|` 同时匹配完整和不完整两种形式，统一替换为空字符串。

### 关键正则概念速查

| 概念 | 写法 | 说明 |
|------|------|------|
| 捕获组 | `(pattern)` | 捕获匹配内容，用 `$1`, `$2` 引用 |
| 非捕获组 | `(?:pattern)` | 仅分组，不捕获 |
| 反向引用 | `\1` | 引用第 1 个捕获组匹配的文本 |
| 负向前瞻 | `(?!pattern)` | 后面不能匹配 pattern |
| 负向后顾 | `(?<!pattern)` | 前面不能匹配 pattern |
| 任意字符 | `.` | 配合 `s` flag 时匹配包括换行的任意字符 |
| 全局 | `g` flag | 查找所有匹配而非第一个 |
| Dotall | `s` flag | 让 `.` 匹配换行符 |
| 忽略大小写 | `i` flag | 不区分大小写 |
| JSON 转义 | `\\` → `\` | JSON 字符串中反斜杠需双写 |

## 新增 UI 的完整步骤

### 1. 确定占位符标签

根据 UI 类型选择标签形式：

- **无内容占位符** — 仅用作替换锚点，标签内没有 AI 生成的内容。格式 `<PascalCaseName/>`，例如：

  - `<StatusPlaceHolderImpl/>` — 状态栏
  - `<BattleUI/>` — 战斗界面
  - `<OpeningSelectUI/>` — 开局选择界面
  - `<InventoryUI/>` — 背包界面

- **有内容包裹标签** — 需要将 AI/世界书输出的内容嵌套在标签内并进行美化，类似 `<update>...</update>`。此时需要在提示词（世界书条目）中约定 AI 使用此 XML 标签包裹内容：

  - `<scene>` — 场景描述标签
  - `<status>` — 状态变更标签
  - 标签名自定，需在 AI 侧提示词中明确要求使用

  对应的正则需包含捕获组，隐藏脚本匹配并删除整个标签，替换脚本将内容嵌入美化 HTML 模板（在替换文件中用 `$1`、`$2` 引用捕获组）。

### 2. 创建隐藏脚本

在 `mvu-patch.json` 的 `/regex_scripts/` 下添加条目：

```json
{
  "op": "add",
  "path": "/regex_scripts/对AI隐藏XXX",
  "value": {
    "id": "生成UUID",
    "findRegex": "<MyPlaceholder/>",
    "replaceString": "",
    "trimStrings": [],
    "placement": [2],
    "disabled": false,
    "markdownOnly": false,
    "promptOnly": true,
    "runOnEdit": true,
    "substituteRegex": 0,
    "minDepth": null,
    "maxDepth": null
  }
}
```

### 3. 创建替换脚本

```json
{
  "op": "add",
  "path": "/regex_scripts/XXX界面",
  "value": {
    "id": "生成UUID",
    "findRegex": "<MyPlaceholder/>",
    "replace_file": "正则/XXX界面.html",
    "trimStrings": [],
    "placement": [2],
    "disabled": false,
    "markdownOnly": true,
    "promptOnly": false,
    "runOnEdit": true,
    "substituteRegex": 0,
    "minDepth": null,
    "maxDepth": null
  }
}
```

### 4. 创建 HTML 文件

在 `正则/` 目录下创建 `XXX界面.html`。根据 HTML 是否包含 `<body>` 决定文件结构：

**含 `<body>`（前端界面）**——文件首尾需用 3 个反引号行包裹成独立代码块，酒馆据此将含 `<body>` 的内容渲染为独立前端界面（HTML 规范不允许 `<body>` 嵌套在内联消息流中）：

````
```
<body>
<script>
$('body').load('https://testingcf.jsdelivr.net/gh/{USER}/{REPO}/dist/{Project}/...')
</script>
</body>
```
````

**不含 `<body>`（内嵌美化片段）**——直接写 HTML 片段，无需反引号围栏：

```html
<div>
  <details>
    <summary>...</summary>
    <div>$2</div>
  </details>
</div>
```

详细说明见 `frontend.md`。

### 5. 注册到 patch JSON

将以上两个 `op: "add"` 操作追加到 `mvu-patch.json` 的数组中。

### 6. 打补丁

应用 patch 生成角色卡/世界书后，新 UI 即可生效。

## 常见错误

| 错误 | 后果 | 正确做法 |
|------|------|----------|
| 隐藏脚本忘了设 `promptOnly: true` | 占位符从用户侧和 AI 侧都消失 | 隐藏脚本设 `promptOnly: true`，替换脚本设 `markdownOnly: true` |
| 替换脚本忘了设 `markdownOnly: true` | 替换后的 HTML 被当作原始内容处理 | `markdownOnly: true` 确保不影响底层消息 |
| 隐藏和替换脚本都设了 `markdownOnly: true` | AI 仍能看到原始标签 | 隐藏脚本文档 `promptOnly: true` |
| `findRegex` 中的反斜杠忘了转义（如 `\s` 写成 `\s` 而非 `\\s`） | JSON 解析错误或匹配失败 | JSON 中的 `\s` 需写为 `\\s`，`\1` 需写为 `\\1` |
| `placement` 只写了 `[2]` 但界面需要对用户输入生效 | 用户输入的标签不处理 | 同时作用于用户输入时用 `[1,2]` |
| `substituteRegex` 误设为 `1` 或 `2` | 不可逆地改变原始文本，且前端 HTML 会发送给 AI、污染上下文 | 绝大多数场景用 `0` |
