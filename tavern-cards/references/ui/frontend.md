# 状态栏前端开发

**仅使用 MVU 时需要**。打包后，`正则/状态栏界面.html` 仍为占位符，需完成状态栏前端开发。

## 前端界面是什么

酒馆助手会把消息楼层里的 HTML 代码块（含 `<body>`）自动渲染成前端界面。状态栏通过占位符（如 `<StatusPlaceHolderImpl/>`）让正则替换出 HTML 代码块，再被酒馆助手渲染。

## 设计原则

- **ICON 优先**：前端版面向复杂界面，ICON 在不同主题/尺寸下表现一致，且支持 CSS 调色，与状态栏视觉风格统一
- **低耦合**：每个组件只负责一件事，变量读取集中在 store，业务逻辑抽离为独立模块，确保组件可复用、可单独测试

## 常用资源

- **图标（ICON）**：FontAwesome 免费图标，前端界面直接用 `fa-*` 类
- **字体**：ZeoSeven Fonts（如 Sarasa 更纱黑体），复制其 CSS 引入链接即可
- **CDN（jsdelivr）**：**必须用国内可达的 `testingcf.jsdelivr.net` 镜像**，而不是 `cdn.jsdelivr.net`
- **第三方库**：用 `pnpm add` 添加，模板打包时会自动将其转为 jsdelivr 链接，避免在多个界面中重复打包
- **可读性**：用 Adobe 色彩对比度检查器确保背景色与文字色对比足够强

## 前端界面的正则：只定位、不解析

**该原则仅针对「前端界面」的正则。**

前端界面的正则只负责**定位界面应在的位置**（如把 `<StatusPlaceHolderImpl/>` 替换为 HTML 代码块），**不处理输出数据**——不要在正则替换串里用 `$1` 取字段。界面需要的数据应由前端代码自行获取：

- **MVU 变量**：通过 `defineMvuDataStore` 读取，正则只需替换纯占位符（如状态栏使用的 `<StatusPlaceHolderImpl/>`），不需要捕获组
- **消息原文**：通过 `getChatMessages(getCurrentMessageId())[0]` 取整条消息，再在代码里 `.match()` 分析

正则越简单、容错率越高：只要能定位到这段文本即可，不必关心内部具体是什么格式。

> 注：MVU 的「变量更新」类正则（解析 `<update>...</update>` 内容、捕获 `$2` 更新变量）正常依赖捕获组提取，参见 `regex-scripts.md`，与上述原则无关。

## 开发方式

使用 [tavern_helper_template](https://github.com/StageDog/tavern_helper_template) 开发状态栏前端界面。

## 开发流程

### 1. 准备开发环境

先询问用户是否已克隆过 tavern_helper_template 仓库。如已有，确认仓库位置后直接使用；如没有，执行以下步骤：

```bash
# 克隆模板仓库
git clone https://github.com/StageDog/tavern_helper_template.git
cd tavern_helper_template

# 安装依赖
pnpm install
```

克隆后先阅读模板根目录的 `README.md`，其中包含教程链接、CI 工作流配置、jsdelivr 自动更新、克隆冲突处理等完整流程说明。

建议安装 chrome-devtools-mcp（模板已配置但各 agent 工具配置可能不同），方便 AI 查看浏览器控制台报错。

### 2. 复制变量结构

将项目的 `schema.ts` 复制到模板仓库的 `src/{ProjectName}/schema.ts`。

**注意**：两个仓库的 schema.ts 结构互通，可直接复用。

### 3. 开发状态栏界面

在 `src/{ProjectName}/界面/状态栏/` 中开发：

```
界面/状态栏/
├── index.ts        # 入口文件，等待 MVU 初始化
├── index.html      # HTML 模板
├── App.vue         # 主组件
├── store.ts        # 数据存储，使用 defineMvuDataStore
├── global.css      # 全局样式
└── components/     # 子组件
```

**关键代码**：

```typescript
// store.ts - 连接 MVU 变量
import { defineMvuDataStore } from '@util/mvu';
import { Schema } from '../../schema';

export const useDataStore = defineMvuDataStore(Schema, {
  type: 'message',
  message_id: getCurrentMessageId()
});
```

```vue
<!-- App.vue - 读取变量 -->
<script setup lang="ts">
import { useDataStore } from './store';

const store = useDataStore();
// store.stat_data 即为 schema.ts 定义的变量结构
</script>
```

### 4. CSS 色彩变量命名规范

CSS 色彩变量必须使用**功能语义**命名，禁止使用视觉描述命名。

```css
/* ✓ 正确：功能语义 */
:root {
  --c-primary: #4a90d9;
  --c-danger: #e74c3c;
  --c-surface: #f5f5f5;
  --c-text-muted: #888;
  --c-border: #ddd;
}

/* ✗ 错误：视觉描述 */
:root {
  --c-blue: #4a90d9;
  --c-red: #e74c3c;
  --c-light-gray: #f5f5f5;
  --c-gray: #888;
  --c-light-border: #ddd;
}
```

### 5. 本地测试

先询问用户是否安装了 VS Code 的 Live Server 扩展。

如已安装，指导用户在 tavern_helper_template 根目录右键，选择"Open with Live Server"。Live Server 自动注入 CORS 头并启动 HTTP 服务，默认端口 `5500`。

如未安装，自行启动一个带 CORS 头的静态文件服务器，工作目录为 tavern_helper_template 根目录。

同时运行以下命令监听文件改动并自动重新编译：

```bash
pnpm watch
```

#### 配置实时预览

将项目中的 `正则/状态栏界面.html` 临时改为加载本地服务器。该文件以 3 个反引号行起止（代码块标记），修改时需保留：

````
```
<body>
<script>
$('body').load('http://localhost:5500/dist/{ProjectName}/界面/状态栏/index.html')
</script>
</body>
```
````

> `dist/{ProjectName}/` 是 `pnpm watch` 的编译输出路径。端口号按实际使用的服务器端口调整。

修改预览正则后，按 `references/packaging.md` 的打包流程生成预览版角色卡，指导用户导入酒馆并在酒馆助手的 `开发` 选项中勾选 `允许监听`，即可实时预览修改效果。

> **开发/生产切换**：本地测试时使用上述 localhost 地址；部署前需将 `正则/状态栏界面.html` 改回 CDN 地址（见步骤 7）。

### 6. 前端打包与部署

```bash
# 打包到 dist 文件夹
pnpm build
```

**部署方式**：

- **GitHub + jsdelivr**（推荐）：推送到 GitHub 仓库，通过 jsdelivr CDN 访问。CDN 方案让正则代码块只加载链接、不内联整段 HTML，显著减轻酒馆渲染代码块的负担（见步骤 7 后的「CDN 缓存与刷新」）
- **自托管**：部署到任意可访问的 URL

### 7. 更新占位符

部署完成后，修改项目中的 `正则/状态栏界面.html`（同样需保留首尾的代码块标记）：

````
```
<body>
<script>
$('body').load('https://testingcf.jsdelivr.net/gh/{GH_USER}/{GH_REPO}/dist/{ProjectName}/界面/状态栏/index.html')
</script>
</body>
```
````

替换：
- `{GH_USER}`：GitHub 用户名
- `{GH_REPO}`：仓库名
- `{ProjectName}`：项目名称

#### CDN 缓存与刷新

jsdelivr 主服务器、镜像服务器与玩家浏览器都会缓存文件，推送后不会立即生效。以下几种方式可以解决：

- **等待自动刷新**：模板仓库已配置 `bundle.yaml`，打包时自动递增版本号，约 12h 后 jsdelivr 主服务器缓存自动更新
- **强制刷新**（二选一）：
  - **purge**：在 `https://www.jsdelivr.com/tools/purge` 中输入链接（`testingcf.jsdelivr` 换成 `cdn.jsdelivr`），可立即刷新主服务器缓存；镜像服务器不受影响
  - **换镜像域名**：临时改用 `fastly.jsdelivr.net` 或 `gcore.jsdelivr.net` 等尚未缓存的镜像网站
- **玩家清理缓存**：玩家主动清除浏览器缓存
- **自托管服务器**：必须配置 HTTPS，否则使用 https 的云酒馆玩家无法加载

### 8. 重新打包

按 `references/packaging.md` 的打包流程生成正式角色卡。

## 模板已提供的内容

tavern_helper_template 仓库已自带以下内容：

- **编写规则**：`.cursor/rules/`（前端界面、酒馆助手接口、MVU 变量框架等）
- **接口类型定义**：`@types/`（酒馆与酒馆助手 API）
- **内置库**：Vue、Pinia、Vue Router、VueUse、GSAP、Tailwind CSS、jQuery、lodash、zod 等（见 `package.json`）
- **示例项目**：`示例/角色卡示例/界面/`

更多进阶用法参考模板根目录的 `README.md` 中的 `教程文档` 链接。