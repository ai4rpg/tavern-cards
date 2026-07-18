# 纯文本版状态栏

**仅使用 MVU 时需要**。最简单的方式：直接在 `正则/状态栏界面.html` 中编写 HTML 与宏，无需独立前端项目、无需构建工具。打包时由 `状态栏界面` 正则脚本（已通过 MVU patch 注册）将文件内容替换消息中的 `<StatusPlaceHolderImpl/>` 占位符，宏在渲染时由 SillyTavern 替换为变量值。

## 适用场景

- 状态栏只需展示若干标量值（好感度、属性、当前位置、章节等）
- 不需要复杂交互、组件化或动态条件渲染
- 希望避免引入 tavern_helper_template、Vue、pnpm 等额外依赖

如需多角色并排、进度条动画、条件显示、数值映射等复杂场景，改用 `frontend.md` 的前端开发方式。

## 开发流程

### 1. 编辑占位文件

`正则/状态栏界面.html` 以 3 个反引号行起止（代码块标记），这两行是文件内容的一部分、必须保留。保留首尾标记、清空中间内容后写入自己的 HTML 即可。无需 `<script>` 标签，文件整体作为 `<StatusPlaceHolderImpl/>` 的替换字符串注入。

### 2. 宏语法与路径

状态栏通过酒馆助手宏读取 MVU 变量：

```
{{format_message_variable::变量路径}}
```

- `::` 后为 MVU 变量路径，必须以 `stat_data.` 开头，使用点分隔
- 路径层级与 `schema.ts` 中的定义一致：`stat_data.角色.角色名.变量名`、`stat_data.世界.区域` 等
- 中文路径直接使用中文字符，无需引号或转义
- 路径不存在时宏返回空字符串，不会报错

编写前先对照 `schema.ts` 或 `initvar.yaml` 确认字段名与层级，避免路径写错导致状态栏空白。

### 3. 编写示例

把多个变量组织在同一容器内：

````
```
<style>
.stat-panel {
  display: flex; flex-wrap: wrap; gap: 8px;
  font-size: 13px; padding: 8px;
}
.stat-item {
  border: 1px solid #ddd; border-radius: 6px;
  padding: 4px 10px; background: #fafafa;
}
.stat-item .label { color: #888; margin-right: 4px; }
.stat-item .value { color: #333; font-weight: 600; }
</style>
<body>
<div class="stat-panel">
  <div class="stat-item"><span class="label">📍 位置</span><span class="value">{{format_message_variable::stat_data.世界.当前区域}}</span></div>
  <div class="stat-item"><span class="label">📜 章节</span><span class="value">{{format_message_variable::stat_data.世界.当前章节}}</span></div>
  <div class="stat-item"><span class="label">💖 好感度</span><span class="value">{{format_message_variable::stat_data.角色.亚丝娜.好感度}}</span></div>
</div>
</body>
```
````

多角色时为每个角色单独写一组条目：

````
```
<style>
.char-block {
  border-left: 3px solid #4a90d9; padding-left: 8px;
}
.char-name { font-weight: 600; margin-bottom: 4px; }
</style>
<body>
<div class="stat-panel">
  <div class="char-block">
    <div class="char-name">亚丝娜</div>
    <div class="stat-item"><span class="label">💖 好感</span><span class="value">{{format_message_variable::stat_data.角色.亚丝娜.好感度}}</span></div>
    <div class="stat-item"><span class="label">🤝 信任</span><span class="value">{{format_message_variable::stat_data.角色.亚丝娜.信任度}}</span></div>
  </div>
  <div class="char-block">
    <div class="char-name">诗乃</div>
    <div class="stat-item"><span class="label">💖 好感</span><span class="value">{{format_message_variable::stat_data.角色.诗乃.好感度}}</span></div>
    <div class="stat-item"><span class="label">🤝 信任</span><span class="value">{{format_message_variable::stat_data.角色.诗乃.信任度}}</span></div>
  </div>
</div>
</body>
```
````

### 4. 预览与迭代

纯文本版无需构建步骤，也无需配置酒馆助手调试地址。直接保存 `正则/状态栏界面.html` 后：

1. 执行打包（见 `references/packaging.md`）
2. 在 SillyTavern 中导入新生成的角色卡/世界书
3. 触发一次 AI 回复（或刷新当前消息）即可看到状态栏渲染效果

修改 HTML 后重复上述步骤即可迭代。

## 限制与边界

纯文本版基于字符串替换，无法执行 JavaScript 逻辑。以下场景应改用 `frontend.md`：

- 条件显示（如好感度高于阈值时显示特殊标记）
- 数值映射（如把 1-100 转成 ★★★☆☆）
- 进度条、动画、交互按钮
- 跨多消息的状态记忆或组件复用

## 与前端版的对比

| 维度 | 纯文本版 | 前端版 |
|------|---------|--------|
| 依赖 | 无 | tavern_helper_template + Vue + pnpm |
| 构建 | 直接编辑 HTML | `pnpm watch` / `pnpm build` |
| 部署 | 打包进卡，无外部 URL | 推送 GitHub + jsDelivr CDN |
| 逻辑能力 | 仅宏替换 | 完整 TypeScript + Vue |
| 适合场景 | 少量标量展示 | 复杂界面、动态交互 |
| 维护成本 | 低 | 中 |
