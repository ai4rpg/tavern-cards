---
name: tavern-cards
description: "创建、编辑、评估 SillyTavern 角色卡和世界书（角色信息、世界观、NPC、场景、事件、文风、MVU 变量、EJS 方案等）。覆盖角色卡内嵌世界书和独立世界书，支持从零创作和从现有材料转化。确保在以下情况也使用此 skill：用户提到'角色设定'、'人设卡'、'worldlore'、'character card'、'角色卡'、'酒馆世界书'、'SillyTavern'、'世界书条目'、'世界书配置'、'蓝灯'、'绿灯'、'角色条目'、'世界观设定'、'NPC设定'等关键词时，即使用户没有明确说'世界书'也应触发。当用户要编写角色基础信息、性格调色盘、三面性、二次解释、多阶段调色盘、世界观、文风指导等创作流程时也应触发。当用户提到'MVU'、'变量系统'、'schema.ts'、'变量更新'、'initvar'、'变量结构'、'tavern-cards-forge'等关键词时也应触发。"
---

# SillyTavern 角色卡与世界书编写

帮助用户创建和编辑 SillyTavern 角色卡与世界书的内容和配置。覆盖角色人设编写、世界观构建、MVU 变量、EJS 动态方案、条目配置、开场白创作等全流程。聚焦于内容创作和流程编排，涉及 schema.ts、EJS 模板以及 MVU 的酒馆助手脚本，但不涉及其他酒馆助手脚本的编写。

## 设计原则

角色卡本质上是一套专门针对角色扮演的 AI 提示词工程。其中蕴含一对矛盾：角色扮演需要丰富的细节设定来维持人设一致性，而 AI 提示词则要求简洁、准确的表述以节省 token。因此采用三种策略解决这一矛盾：

- **结构化表达**：压缩信息量
- **MVU 变量**：追踪最新状态
- **关键词匹配 / EJS 语句**：控制发送给 AI 的内容
- **规划同步原则**：`创作规划.yaml` 是项目级事实来源。任何修改必须先更新规划文档，再修改条目内容，确保规划始终反映实际状态。

## SillyTavern 宏约定

`{{user}}` 或 `<user>` 是 SillyTavern 提供的宏，在运行时自动替换为玩家角色的名称。在条目内容中可使用此宏来表示玩家角色，无需关心具体名称。

**推荐使用 `<user>` 而非 `{{user}}`**：条目内容中避免使用 SillyTavern 宏 `{{user}}`——双花括号语法会破坏 YAML 解析，导致 unpack 时文件后缀从 `.yaml` 回退为 `.txt`。推荐使用 `<user>` 代替 `{{user}}`。

## 场景路由

判断三个维度，组合决定流程：

1. **任务阶段**：创建 / 修改 / 评估
2. **创建来源**（仅创建阶段）：从零 / 从材料转化
3. **任务范围**：完整项目 / 局部任务

常见组合：

| 组合 | 流程 |
|------|------|
| 创建 + 从零 + 完整项目 | 需求对齐：项目属性 → 项目创建(init) → 需求对齐：世界/角色/条目 → 条目创作 |
| 创建 + 从材料 + 完整项目 | 转化标注（`references/conversion.md`）→ 需求对齐：项目属性 → 项目创建(init) → 需求对齐：世界/角色/条目 → 条目创作 |
| 创建 + 局部任务 | 直接定位创作规则文档，不走项目流程 |
| 修改 + 局部任务 | 加载创作规划.yaml → 根据修改需求更新规划文档 → 定位条目 → 加载创作规则文档 |
| 修改 + 完整项目 | 断点续接（`references/resume.md`） → 检测进度后回到完整项目流程对应步骤继续 |
| 修改 + MVU 变量 | 定位项目 → 确认变更类型 → 执行变更传播（`references/mvu/guide.md#修改流程`） → 一致性校验 |
| 评估 | 评估流程：分析结构、检查配置、抽查写作质量，生成评估报告 |

## 完整项目流程

1. **需求对齐：项目属性**：收集项目属性（名称、形式、MVU/EJS 需求、typeLists 调整等）
   - 先询问用户偏好模式（粗略规划 / 一次确认）→ `references/requirements.md`
   - 从材料转化时先执行 `references/conversion.md`
2. **项目创建**：执行 `node scripts/tavern-cards-forge.mjs init {project}` 创建目录结构、状态文件与模板 → `references/project-setup.md`
3. **需求对齐：世界/角色/条目**：收集世界信息、角色信息、条目规划、写作风格，产出编写规划文档 `创作规划.yaml`（项目目录下）→ `references/requirements.md`
4. **创建条目**：按创作规划依次编写，每条写完立即注册（前置 CoT 自检 + `check-agent` 禁词扫描 + DoubleCheck）→ `references/composition.md`
   - 前置必读：`references/rules.md`（正面规则）和 `references/conventions.md`（注册约定）
5. **编写 MVU 变量**（如需）→ `references/mvu/guide.md`，完成后按收尾步骤复制模板、应用 patch、校验
6. **EJS 条件与段落控制编写 + EJS 收尾检查**（如需 EJS）→ `references/ejs/guide.md`
  - 用 getvar() 读取变量、@@private + const 在条目内定义局部短名
  - 遇到 EJS 运行时报错（如 `xxx is not defined`、`Identifier ... has already been declared`）先读 `references/error-handling.md#SillyTavern-运行时`
7. **MVU 一致性检查**（如需 MVU）→ 执行 `references/mvu/guide.md` 收尾步骤第 4 步
8. **运行 configure**：`node scripts/tavern-cards-forge.mjs configure {project}`，自动推导运行时字段 → `references/configuration.md`（仅特殊需求时读取）
9. **编写开场白**（角色卡）→ `references/contents-creation/first-message.md`
   - 读取创作规划的 `first_messages` 数组，逐项处理（叙事式调 `first-message-agent` / 大纲式直接整理）
   - 各项完成后按顺序注册到 state 的 `first_messages`
   - 对于有 `initvar_override` 的项，参考 `references/mvu/initvar.md#initvar_override`
10. **UI 界面开发**（如使用 MVU）→ `references/ui/`
    - 纯文本状态栏：直接编辑 `正则/状态栏界面.html`，无需二次打包
    - 前端状态栏：先预览版对接 dev server，再打包生产版
    - 新增其他界面：参考 `regex-scripts.md` + `assets/mvu-patch.json` 既有写法
11. **打包输出**：执行打包前检查清单后，运行 `node scripts/tavern-cards-forge.mjs pack {project}` → `references/packaging.md`

## 状态文件

每个项目在根目录维护 `tavern-cards-state.json`，记录项目属性和条目清单。完整字段定义见 `references/type/state.ts`。

## 工具参考

脚本工具均位于本 skill 的 `scripts/` 目录下。

- **tavern-cards-forge**：离线打包/解包/配置工具，完整命令用法与数据模型见 `references/manual.md`。
- **validate-conversion-outline**：转化大纲验证脚本，验证 YAML 结构、章节引用、占位符和原文引用真实性。使用说明见 `references/conversion/validation.md`。

## 参考资料

此索引是 `references/` 文档列表的权威来源。标注「按需查阅」的为参考资料层，其余为主动加载文档。

```
references/
├── requirements.md              —— 需求对齐 + 创作规划.yaml schema
├── composition.md               —— 条目编排、创作循环、DoubleCheck
├── rules.md                     —— 正面写作规则（前置必读）
├── rules-check.md               —— 写作质量检查清单（前置自检 + 子代理扫描两用）
├── error-handling.md            —— 错误处理流程（转化/创作/技术阶段）
├── conventions.md               —— 注册约定与文件格式（前置必读）
├── conversion.md                —— 从材料转化流程（主文档）
├── conversion/
│   ├── outline-spec.md          —— 大纲规范（信息分类含factions、记录原则、行号规范）
│   ├── outline.md               —— 大纲构建指导（长文本处理、分级模板、整理深化含分卷检测）
│   ├── validation.md            —— 转化大纲验证脚本使用说明（validate-conversion-outline.mjs）
│   ├── assessment.md            —— 材料类型评估标准
│   ├── source-chapters.md       —— source_chapters 标注标准
│   └── key-info.md              —— 关键信息确认流程
├── project-setup.md             —— 项目创建
├── resume.md                    —— 断点续接
├── configuration.md             —— 条目运行时配置（仅特殊需求时读取）
├── manual.md                    —— tavern-cards-forge操作命令完整参考（按需查阅）
├── packaging.md                 —— 打包流程与后续维护
├── ui/
│   ├── text.md                  —— 纯文本版状态栏
│   ├── frontend.md              —— 前端版状态栏（tavern_helper_template）
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

