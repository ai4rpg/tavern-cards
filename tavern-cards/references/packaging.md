# 打包流程与后续维护

## 打包流程

执行 `node scripts/tavern-cards-forge.mjs pack {project}` 生成 SillyTavern 格式文件。

### 输出格式

| 形式 | 有头像 | 输出格式 | 产物路径 |
|------|--------|---------|---------|
| 角色卡 | 是 | PNG | `cards/{Project}/{Project}.png` |
| 角色卡 | 否 | JSON | `cards/{Project}/{Project}.json` |
| 独立世界书 | - | JSON | `cards/{Project}/{Project}.json` |

### 打包前检查清单

- [ ] 所有条目已注册到 entryManifest
- [ ] 无遗留的 `# 待细化` 注释

如果使用 MVU，还需要检查：

- [ ] MVU 一致性检查通过
- [ ] MVU 脚本已注册：`node scripts/tavern-cards-forge.mjs query {project} '$.extensions.tavern_helper.scripts.MVU'` 返回非空
- [ ] `state.zod` 已注册：
  ```bash
  node scripts/tavern-cards-forge.mjs query {project} '$.zod'
  ```
- [ ] MVU 相关正则已注册：查询 `$.regex_scripts.*~` 应包含 `对AI隐藏状态栏`、`状态栏界面`、`对AI隐藏变量更新`、`变量更新中美化`、`变量更新美化` 五条

## 后续维护

### 内容修改

1. 编辑项目目录中的条目文件
2. 运行 `configure` 和 `pack`

### 结构修改

1. 修改 `创作规划.yaml`
2. 按 `references/resume.md` 流程继续
3. 如涉及 schema 变更，同步更新 tavern_helper_template 中的 schema.ts

### 状态栏界面更新

仅前端版需要此步骤，详见 `ui/frontend.md`。

1. 在 tavern_helper_template 中修改代码
2. 推送到 GitHub（自动触发 CI 打包）
3. jsdelivr CDN 自动更新（可能需要等待缓存刷新）
