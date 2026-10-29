---
name: tavern-cards
description: "创建、编辑、评估 SillyTavern 角色卡和世界书（角色信息、世界观、NPC、场景、事件、文风、MVU 变量、EJS 方案等）。覆盖角色卡内嵌世界书和独立世界书，在 tavern-design 产出 design-spec.md 后继续项目创建与创作规划。确保在以下情况也使用此 skill：用户提到'角色设定'、'人设卡'、'worldlore'、'character card'、'角色卡'、'酒馆世界书'、'SillyTavern'、'世界书条目'、'世界书配置'、'蓝灯'、'绿灯'、'角色条目'、'世界观设定'、'NPC设定'等关键词时，即使用户没有明确说'世界书'也应触发。当用户要编写角色基础信息、性格调色盘、三面性、二次解释、多阶段调色盘、世界观、文风指导等创作流程时也应触发。当用户提到'MVU'、'变量系统'、'schema.ts'、'变量更新'、'initvar'、'变量结构'、'tavern-cards-forge'等关键词时也应触发。"
---

# SillyTavern 角色卡与世界书编写

帮助用户在已有 `design-spec.md` 的基础上创建和编辑 SillyTavern 角色卡与世界书的内容和配置。覆盖角色人设编写、世界观构建、MVU 变量、EJS 动态方案、条目配置、开场白创作等全流程。聚焦于内容创作和流程编排，涉及 schema.ts、EJS 模板以及 MVU 的酒馆助手脚本，但不涉及其他酒馆助手脚本的编写。

## 设计原则

角色卡本质上是一套专门针对角色扮演的 AI 提示词工程。其中蕴含一对矛盾：角色扮演需要丰富的细节设定来维持人设一致性，而 AI 提示词则要求简洁、准确的表述以节省 token。因此采用三种策略解决这一矛盾：

- **结构化表达**：压缩信息量
- **MVU 变量**：追踪最新状态
- **关键词匹配 / EJS 语句**：控制发送给 AI 的内容
- **规划同步原则**：`创作规划.yaml` 是项目级事实来源。任何修改必须先更新规划文档，再修改条目内容，确保规划始终反映实际状态。修改前先收齐全部修改要求，再统一执行「更新规划→修改条目」。

## SillyTavern 宏约定

`{{user}}` 或 `<user>` 是 SillyTavern 提供的宏，在运行时自动替换为玩家角色的名称。在条目内容中可使用此宏来表示玩家角色，无需关心具体名称。

**推荐使用 `<user>` 而非 `{{user}}`**：条目内容中避免使用 SillyTavern 宏 `{{user}}`——双花括号语法会破坏 YAML 解析，导致 unpack 时文件后缀从 `.yaml` 回退为 `.txt`。推荐使用 `<user>` 代替 `{{user}}`。

## 场景路由

判断三个维度，组合决定流程：

1. **任务阶段**：创建 / 修改 / 评估
2. **创建来源**（仅创建阶段）：从零 / 从材料转化——两者都需先由 tavern-design 产出 `design-spec.md`
3. **任务范围**：完整项目 / 局部任务

修改阶段需先判断是否已有工程文件。若用户给的是单独 PNG/JSON 且无对应 state.json，走 `references/modify-existing.md`。

常见组合：

| 组合 | 流程 |
|------|------|
| 创建 + 完整项目（从零或从材料） | 前置要求 `design-spec.md`（由 tavern-design 产出）→ 项目创建(init) → 创作规划 → 条目创作 |
| 创建 + 局部任务 | 直接定位创作规则文档，不走项目流程 |
| 修改 + 局部任务 | 加载创作规划.yaml → 根据修改需求更新规划文档 → 定位条目 → 加载创作规则文档（`references/revision.md`） |
| 修改 + 完整项目 | 断点续接（`references/resume.md`） → 检测进度后回到完整项目流程对应步骤继续 |
| 修改 + 外部文件（无工程） | 导入解包 → 分析呈现 → 需求对齐 → 按需分类 → 修改 → 打包（`references/modify-existing.md`） |
| 修改 + MVU 变量 | 定位项目 → 确认变更类型 → 执行变更传播（`references/mvu/guide.md#修改流程`） → 一致性校验 |
| 评估 | 评估流程：分析结构、检查配置、抽查写作质量，生成评估报告 |

## 完整项目流程

> **前置要求**：`cards/{Project}/design-spec.md` 已由 tavern-design 产出。如果还没有，先调用 tavern-design skill 完成大方向讨论与剧情设计，再回到本流程。

1. **项目创建**：从 `design-spec.md` 读取项目名称、形式、主题、体验目标与风格意向等属性；技术收尾确认 MVU/EJS、typeLists、头像、UI 模式；执行 `node scripts/tavern-cards-forge.mjs init {project}` 创建目录结构、状态文件与模板 → `references/project-setup.md`
2. **创作规划**：以 `design-spec.md`（及 `故事大纲.yaml`，如有）为输入，展开具体世界信息、角色信息、条目规划、写作风格，产出编写规划文档 `创作规划.yaml`（项目目录下）→ `references/requirements.md`
3. **创建条目**：按创作规划依次编写，每条创作前做前置 CoT 自检，写完立即注册；按 typeLists 位置分组，每个位置的条目全部完成后调用 `check-agent` 做禁词扫描，全部条目完成后做 DoubleCheck → `references/composition.md`
   - 前置必读：`references/rules.md`（正面规则）和 `references/conventions.md`（注册约定）
4. **编写 MVU 变量**（如需）：调 `schema-agent` 编写 `schema.ts`，主代理按顺序编写 initvar.yaml 与 变量更新规则.yaml → `references/mvu/guide.md`，完成后按收尾步骤复制模板、应用 patch、校验
5. **EJS 条件与段落控制编写 + EJS 收尾检查**（如需 EJS）→ `references/ejs/guide.md`
  - 用 getvar() 读取变量、@@private + const 在条目内定义局部短名
  - 遇到 EJS 运行时报错（如 `xxx is not defined`、`Identifier ... has already been declared`）先读 `references/error-handling.md#SillyTavern-运行时`
6. **MVU 一致性检查**（如需 MVU）→ 执行 `references/mvu/guide.md` 收尾步骤第 4 步
7. **运行 configure**：`node scripts/tavern-cards-forge.mjs configure {project}`，自动推导运行时字段 → `references/configuration.md`（仅特殊需求时读取）
8. **编写开场白**（角色卡）→ `references/contents-creation/first-message.md`
   - 读取创作规划的 `first_messages` 数组，逐项处理（叙事式调 `first-message-agent` / 大纲式直接整理 / 表单式写入占位符，前端界面留到步骤 9）
   - 各项完成后按顺序注册到 state 的 `first_messages`
   - 对于有 `initvar_override` 的项，参考 `references/mvu/initvar.md#initvar_override`
9. **UI 界面开发**（如使用 MVU）
    - 读取 `创作规划.yaml` 的 `ui_mode`：
      - `text` → 编辑 `正则/状态栏界面.html`（详见 `references/ui/text.md`）
      - `frontend` → 调用 tavern-ui skill
      - `none` → 跳过，直接进入步骤 10
      - `pending` / 缺失 → 不可进入此步，先收敛为 text / frontend / none
10. **打包输出**：执行打包前检查清单后，运行 `node scripts/tavern-cards-forge.mjs pack {project}` → `references/packaging.md`

## 状态文件

每个项目在根目录维护 `tavern-cards-state.json`，记录项目属性和条目清单。完整字段定义见 `references/type/state.ts`。

## 子代理

调用时由 Agent harness 注入任务，主代理在 task 字符串里携带下表「输入」一列的参数，并按下表「输出」一列处理返回。

| 子代理 | 作用 | 输入 | 输出 |
|--------|------|------|------|
| check-agent | 禁词扫描 | 需检查的全部条目的文件路径；附内容类型与所属角色/世界观提示 | 「通过 / 不通过」；不通过时按条目给出违规类型、原文、建议 |
| schema-agent | 编写或修改 `schema.ts` | 项目目录路径、创作规划路径、schema.ts 路径（后两者未提供时默认在项目目录下）；变更场景另传变更类型与变量路径 | 写入 `schema.ts`；变更场景另返回「需主代理同步」清单 |
| first-message-agent | 叙事式开场白 | 创作规划路径、当前项索引；启用 MVU 时附 initvar 路径（override 或默认） | 写入当前项 `output_path`，并返回正文与自查摘要 |

各调用点的具体衔接见 `references/composition.md`、`references/mvu/guide.md`、`references/contents-creation/first-message.md`。

## 工具参考

脚本工具均位于本 skill 的 `scripts/` 目录下。

- **tavern-cards-forge**：离线打包/解包/配置工具，完整命令用法与数据模型见 `references/manual.md`。
- **mechanical-check**：条目或开场白落盘后的机械自检，检查破折号、模糊词、否定转折、极端程度词、元叙事标记、`{{user}}` 宏，以及断句（短尾比例、单句分句数上限）。用法见 `references/composition.md` 步骤 7。

## 参考资料

此索引是 `references/` 文档列表的权威来源。标注「按需查阅」的为参考资料层，其余为主动加载文档。

```
references/
├── requirements.md              —— 需求对齐 + 创作规划.yaml schema
├── composition.md               —— 条目编排、创作循环、DoubleCheck
├── rules.md                     —— 正面写作规则（前置必读）
├── rules-check.md               —— 写作质量检查清单（前置自检 + 子代理扫描两用）
├── error-handling.md            —— 错误处理流程（技术阶段、运行时）
├── revision.md                  —— 修改与质量修正流程（信息不足/用户反馈/需求变更/一致性冲突）
├── conventions.md               —— 注册约定与文件格式（前置必读）
├── project-setup.md             —— 项目创建
├── modify-existing.md           —— 已有角色卡/世界书修改流程（外部 PNG/JSON 导入）
├── resume.md                    —— 断点续接
├── configuration.md             —— 条目运行时配置（仅特殊需求时读取）
├── manual.md                    —— tavern-cards-forge操作命令完整参考（按需查阅）
├── packaging.md                 —— 打包流程与后续维护
├── ui/
│   ├── text.md                  —— 纯文本版状态栏
│   └── regex-scripts.md         —— 正则脚本配置指南（新增前端界面时必读）
├── requirements/
│   ├── world-characters.md      —— 世界与角色信息收集
│   ├── entries-dynamics-style.md —— 条目、MVU/EJS、风格与开场白规划
│   ├── planning-yaml.md         —— 创作规划.yaml 完整结构和示例
│   └── entry-types.md           —— 条目类型说明
├── contents-creation/
│   ├── character/
│   │   ├── basic-info.md          —— 角色基础信息
│   │   ├── personality-palette.md —— 性格调色盘
│   │   ├── multi-stage.md —— 多阶段调色盘
│   │   ├── tri-faceted.md         —— 三面性
│   │   ├── rephrase.md            —— 二次解释
│   │   ├── npc.md                 —— NPC 编写
│   │   └── character-catalog.md   —— 角色速览
│   ├── worldbuilding/
│   │   ├── worldview.md         —— 世界观条目
│   │   ├── timeline.md          —— 时间线条目
│   │   └── geography.md         —— 区域条目
│   ├── first-message.md         —— 开场白创作
│   ├── presentation.md          —— 呈现方式（扮演准则）
│   └── stage-guidance.md        —— 阶段指导条目编写
├── mvu/
│   ├── guide.md                 —— MVU 编写流程
│   ├── initvar.md               —— 初始变量编写
│   ├── schema.md                —— MVU 变量类型定义与 schema 写法
│   ├── update-rules-guide.md    —— 变量更新规则编写指南
│   ├── templates.md             —— MVU 模板文件作用与修改规则（按需查阅）
│   ├── update-rules.yaml        —— 更新规则 YAML 参考示例（按需查阅）
│   └── zod-rule.yaml            —— Zod 校验规则参考（按需查阅）
├── ejs/
│   ├── guide.md                 —— EJS 方案编写流程、@@if 条目显隐、段落级条件渲染
│   ├── reference.md             —— EJS 语法参考手册（按需查阅）
│   └── features.md              —— EJS 可用特性与 API（按需查阅）
└── type/
    ├── state.ts                 —— 状态文件类型定义（按需查阅）
    └── settings.ts              —— .cardrc.json 类型定义（按需查阅）
```

