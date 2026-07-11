# Tavern Cards — SillyTavern 角色卡与世界书编写工具

一套面向 Coding Agent 的 SillyTavern 角色卡（Character Card）和世界书（Worldlore）创作 skill，配合离线打包/解包 CLI 工具，覆盖从零创作到成品输出的流程（不涉及前端状态栏或 MVU Zod 以外的酒馆助手脚本）。

## 致谢

角色相关创作的流程和思路参照 [sanmingyue](https://github.com/sanmingyue) 的写卡预设。 
变量更新正则来源于 [StageDog](https://github.com/StageDog)。

## 功能概览

- 流程创作引导: 从需求对齐、世界观构建、角色设定、条目编写到开场白创作，Agent 在每一步提供结构化的写作指导和质量检查
- [tavern-cards-forge](https://github.com/ai4rpg/tavern-cards-forge) CLI: 离线打包（SillyTavern PNG/JSON）、解包还原为项目目录、自动推导运行时配置、JSON Patch 等操作
- MVU 变量系统: 为需要动态变量的角色卡提供 schema 定义、初始变量、更新规则的编写流程和 Zod 校验
- EJS 动态方案: EJS 模板预处理条目，实现条件渲染、变量注入等高级功能

## 适用场景

| 场景 | 说明 |
|------|------|
| 从零创建完整项目 | 需求对齐 → 项目初始化 → 条目创作 → 配置推导 → 打包输出 |
| 从现有材料转化 | 提供角色设定/世界观文档 → 自动提取并转化为 SillyTavern 条目格式 |
| 修改已有角色卡 | 解包 → 断点续接 → 定位条目修改 → 重新打包 |
| 局部任务 | 只编写某个条目、调整某段 MVU 变量、修改开场白等 |
| 评估角色卡质量 | 分析结构完整性、配置合理性、写作质量，生成评估报告 |

## 前置条件

- 任一支持 skill 的 Coding Agent
- Node.js（用于 CLI 工具）
- Windows 用户: 强烈建议安装 **Git for Windows**（自带 Git Bash）中启动 Agent。项目的 bash 命令（`sed`、`diff`、管道等）依赖 bash 环境。
- 确保你的 Agent 已配置正确的 API（如 Anthropic API Key）

## 安装

1. 克隆仓库到本地
2. 根据你使用的 Agent，将 `tavern-cards/` 目录放入对应位置：
   - Claude Code: 放入 `.claude/skills/` 目录
   - Opencode: 放入 `.opencode/skills/` 或 `.agents/skills/` 目录
   - Pi: 放入 `.pi/skills/` 或 `.agents/skills/` 目录
   - 其他 Agent: 放入 Agent 指定的 skill 目录
3. 配置子代理（用于禁词扫描、长文本大纲提取、叙事式开场白创作）：
   - 将 `tavern-cards/agents/*.md` 文件链接到你的 Coding Agent 的 agents 目录。
     - Claude Code: 
       - Linux/macOS: `~/.claude/agents`
       - Windows: `%USERPROFILE%\.claude\agents`
     - Opencode:
       - Linux/macOS: `~/.opencode/agents`
       - Windows: `%USERPROFILE%\.opencode\agents`
     - Pi:
       - Linux/macOS: `~/.pi/agent/agents/`
       - Windows: `%USERPROFILE%\.pi\agent\agents\`
     - 其他 Agent: 创建到 Agent 指定的 agents 目录
4. 重启或 reload 你的 Coding Agent（不同软件叫法可能不同，如 Claude Code 使用 `/reload-plugins` 命令）
5. 测试安装是否完整（以下三项都应通过）：
   - **测试 skill 加载**：向你的 Agent 发送以下消息
     ```
     请根据 tavern-cards skill 列出你掌握的全部条目创作类型
     ```
     如果能列出角色、世界观、时间线等条目类型，说明 skill 加载成功
   - **测试子代理**：向你的 Agent 发送以下消息
     ```
     请 check-agent 检查以下内容："她非常善良，心湖泛起涟漪。"
     ```
     如果返回禁词检查结果，说明子代理配置成功
    - **测试脚本运行**：进入安装后的 skill 目录（如 `.claude/skills/tavern-cards/`），在终端执行
      ```
      node scripts/tavern-cards-forge.mjs --help
      ```
      如果输出帮助信息，说明 CLI 工具可正常调用
6. 正式使用 skill 时，建议开一个新会话，避免上下文干扰

## 已有项目迁移

如果你有基于旧版 skill（commit 5204425 以及之前版本）创建的项目，需要更新 state 以适配新版 forge：

1. **重新解包**（推荐）：用新版 forge 对原有 PNG/JSON 重新 `unpack`（详见 `references/manual.md#unpack`），forge 会自动填充 `state.zod` 并移除 `tavern_helper.scripts` 中的 Zod 脚本条目
2. **手动迁移**：如果不想重新解包，需要：
   - 为 MVU 项目添加 `state.zod` 描述符（见 `tavern-cards/references/mvu/guide.md`）
   - 删除 entryManifest 中所有条目的 `uid` 字段
   - 删除已移除的 `extra` 字段（如有）
   - 删除项目目录中的 `脚本/Zod.txt`（pack 不再读取它）

> **注意**：SillyTavern 宏 `{{user}}` 会破坏 YAML 解析。包含 `{{user}}` 的条目内容在 unpack 时无法保存为 `.yaml`，会回退为 `.txt`。

当你提到"角色卡"、"世界书"、"SillyTavern"等关键词时，skill 会自动触发

## 许可

本项目仅供个人使用，二次修改需注明出处。