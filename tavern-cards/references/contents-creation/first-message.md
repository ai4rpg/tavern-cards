# 开场白创作

仅角色卡需要此步骤。开场白设定初始场景、体现角色性格、引导用户互动。

## 工作流

1. 读取 `创作规划.yaml` 的 `first_messages` 数组
2. 逐项处理：
   - **叙事式**：调用 `first-message-agent`（传入创作规划路径 + 索引；启用 MVU 时传入 initvar 文档路径——有 `initvar_override` 则传 override 路径，否则传默认 `世界书/变量/initvar.yaml`；未启用 MVU 则不传）
   - **大纲式/说明式**：主代理直接整理
   - **表单式**：开场白写入自定义占位符（叙事+表单组合的叙事部分调 `first-message-agent`），表单前端界面留到步骤 10
3. 检查与保存：
   - 确认文件已写入 `output_path`
   - 运行 `node scripts/mechanical-check.mjs {file}`，不通过就地修正；断句项命中「例外」（台词、紧张场景）时可保留，在自检记录里写明理由
   - 调用 `check-agent` 检查正文
4. 所有项完成后，按顺序注册到 state 的 `first_messages`

## 开场白格式

### 叙事式

传统的角色扮演开场白，AI 直接叙述场景，以角色身份说话。适合大多数情况。

编写流程：
- 遍历 `first_messages` 数组，逐项调用 `first-message-agent`
- 向子代理传入规划路径 + 索引（启用 MVU 时传入 initvar 路径，有 override 则传 override、否则传默认 initvar.yaml）
- 确认子代理已写入当前项的 `output_path`
- 调用 `check-agent` 检查

### 大纲式

只整理关键信息，不写完整描写。适合用户有清晰构想、希望精确控制内容时。

编写要点：
- 只根据用户提供的信息整理，不自己编造
- 结构清晰，关键要素一目了然

格式参考：

```
场景: [时间/地点/情境一句话]
背景设定:
  - [背景信息1]
  - [背景信息2]
当前状态:
  [角色A]状态:
    - [状态描述]
  [角色B]状态:
    - [状态描述]
关键细节:
  - [具体细节1]
  - [具体细节2]
开场点:
  1. [互动切入点1]
  2. [互动切入点2]
```

### 说明式

玩法规则、前置插件、作者信息、界面提示等元信息开场白。不扮演角色、不展示状态栏，用于在游戏开始前告知玩家必要信息。

使用条件：
- 仅当角色卡玩法复杂、玩家需要前置说明，或用户明确要求时，才作为第一个开场白使用
- 其后必须有一个真实的游玩入口开场白（叙事式/大纲式/表单式）——说明式不能是唯一开场白，也禁止放到第一个开场白以外的位置

编写要点：
- 结构清晰，按标题分层组织信息
- 结尾明确引导玩家翻页开始游戏（如「翻到第二页以开始游戏」）
- 不展示变量，无需 `<StatusPlaceHolderImpl/>` 占位符；保存为 `0.md`

示例：

```markdown
# 角色卡名称

作者: XXX

测试模型: XXX
允许二创: 是/否
下载链接: [XXX](https://example.com)

### 前置插件
1. 酒馆助手
  [Github](https://github.com/N0VI028/JS-Slash-Runner)
2. 提示词模板
  [Github](https://github.com/zonde306/ST-Prompt-Template)

### 玩法说明
……

### 界面小贴士
在电脑端游玩时，如果发现前端的选项框太宽，可以在酒馆的用户设置里适当增大`页面宽度`、减小`字体比例`。

**翻到第二页以开始游戏**
```

示例中的插件按需取舍：用到 MVU（变量脚本/状态栏）时需酒馆助手，用到 EJS 时需提示词模板。

### 表单式

把开局编写/初始化放进一个**可交互表单**，供玩家开局填写信息、勾选选项（如填写玩家角色的名称/身份/外貌等等），或作为菜单供玩家选择后续开场场景。适合游戏化开局、需要初始化角色数据、或需要“玩家先做选择再进入对应剧情”的角色卡。

> 表单式通常只需要**一个**开场白；若玩法复杂需要前置说明，至多在表单式前面加一个**说明式**开场白。

表单式开场白只含一个交互表单占位符、无叙事文本，第一条消息即表单菜单：

```
<OpeningPlaceHolder/>
```

玩家在表单里选择/填写后，替换脚本（前端界面）负责**生成或发送对应的开场白场景**，再进行后续流程。适合「先选副本/先选人设再进入开局」的流程：表单本身即开局入口，选项决定被发送/触发的开场场景。

**叙事 + 表单组合**：若需在表单之前增加导入场景，先调 `first-message-agent` 描写选择前的场景，再手动在末尾补上自定义占位符：

```
（叙事开场白文本……）

<OpeningPlaceHolder/>
```

核心结构：开场白文本中放一个**自定义占位符**（如 `<OpeningPlaceHolder/>`），由**前端界面**的正则替换为交互表单。

交互表单需执行 JS（读写 MVU 变量、提交后触发 AI 生成），其前端界面在 `SKILL.md` 步骤 10 与其它前端一并进行。技术细节见 tavern-ui skill 的 `references/interactive-opening-form.md`。

**占位符选择：自定义占位符**：

开局表单只在第一条消息出现一次，自定义占位符（如 `<OpeningPlaceHolder/>`）不会被打包自动追加，在开场白末尾**手动写入**。

**正则配置（与状态栏同理，一对脚本，见 `references/ui/regex-scripts.md`）**：

| 脚本 | `findRegex` | `promptOnly` | `markdownOnly` | 作用 |
|------|------------|-------------|----------------|------|
| 替换（如 `开局表单界面`） | `<OpeningPlaceHolder/>` | `false` | `true` | 前端把占位符替换为表单界面 |
| 隐藏（如 `对AI隐藏开局表单界面`） | `<OpeningPlaceHolder/>` | `true` | `false` | 把占位符从 AI 上下文移除 |

> 替换与隐藏脚本共用同一 `findRegex`；自定义占位符对应正则需**手动注册**到 `regex_scripts`（不在 `assets/mvu-patch.json` 预设的正则脚本内）。

## 开场白后缀约定

MVU 项目的开场白后缀决定是否自动追加状态栏占位符：

- `.txt`：打包时自动追加 `<StatusPlaceHolderImpl/>` 占位符（状态栏锚点，见 `references/ui/text.md`）
- `.md`：打包时不追加

> 若开局同时也需要状态栏，可在自定义占位符之后再由 `.txt` 后缀自动追加 `<StatusPlaceHolderImpl/>`，两者可共存于同一条开场白。

需要状态栏的叙事式/大纲式开场白存 `.txt`；不需要的说明式开场白存 `.md`。

解包外部卡时按内容决定后缀：含占位符的开场白存 `.txt`、不含的存 `.md`。

## MVU 变量确认

- 默认开场白（`开场白/0.txt`）对应默认 `世界书/变量/initvar.yaml`
- 额外开场白需不同初始变量时，使用 `initvar_override`：创建 `开场白/initvar/{index}.yaml`、注册到 state、pack 自动嵌入 `<UpdateVariable><initvar>` 块——完整流程见 `references/mvu/initvar.md#initvar_override`

## 注册

按 `output_path` 保存（通常 `开场白/{index}.txt`），然后注册到 state：

```bash
node scripts/tavern-cards-forge.mjs patch {project} '[{"op": "add", "path": "/first_messages/-", "value": "开场白/0.txt"}]'
# 每项一行，顺序与数组一致
```

## 自查清单

叙事式：
- [ ] 每一项已调用 first-message-agent
- [ ] 子代理已交付自查摘要，正文已写入 output_path
- [ ] MVU 项目：叙述状态与对应 initvar 一致

大纲式：
- [ ] 只根据用户提供的信息整理，未编造内容
- [ ] 结构清晰，要素完整

通用：
- [ ] 已调用 check-agent 检查
- [ ] 符合 `note` 的用户要求
- [ ] 注册到 `first_messages`
- [ ] state 中 `first_messages` 顺序与创作规划一致
- [ ] 说明式开场白：仅玩法复杂或用户要求时使用，其后必有真实的叙事或大纲开场白，已保存为 `.md` 后缀
- [ ] 有 `initvar_override` 的开场白：已按 `references/mvu/initvar.md#initvar_override` 处理

表单式：
- [ ] 自定义占位符（如 `<OpeningPlaceHolder/>`）已手动写入开场白末尾（不依赖自动追加）
- [ ] 自定义占位符的替换/隐藏两个正则已注册，`findRegex` 与开场白中的占位符一致
