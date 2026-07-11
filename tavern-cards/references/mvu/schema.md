# 变量结构脚本（schema.ts）

编写时遵循 `references/mvu/zod-rule.yaml` 中的 Zod 4 规则。

## 编写原则

- **变量名自明**：名称本身说明含义（如 `好感度`），无需额外解释
- **幂等性**：`Schema.parse(Schema.parse(x)) === Schema.parse(x)`
- **禁止 `{{user}}` 宏**：对象的 key 不得使用 `{{user}}` 宏。宏在运行时才替换为玩家名称，但 key 需要在编译时确定。如需按玩家区分变量，应使用固定标识（如 `主角`、`玩家`）而非宏
- **类型设计**：
  - 尽量使用 `z.object()` 而非 `z.array()`
  - 复杂对象使用 `.or(z.literal('待初始化')).prefault('待初始化')` 保证可更新
  - 不对根变量字段使用 `.optional()`
- **z.enum 节制**：`z.enum` 限制 AI 只能从枚举列表中取值，过度使用会抑制 AI 的自然表达。仅在以下情况使用：
  - 用户明确要求限定取值范围（如"情绪只能是 开心/正常/低落 三种"）
  - EJS 条件需要精确字符串匹配来触发显隐/段落控制（如 `phase === 'explore'`）
  - 其他情况一律使用 `z.string()` 让 AI 自由发挥

## 加载与 import 约束

`schema.ts` 由 forge 通过 jiti 在 Node 侧加载，运行时已注入全局 `z`（Zod v4）与 `_`（lodash）。**禁止任何 `import` 语句**。

- pack 与 validate-mvu 会做预检（`checkSchemaTsContent`），命中即报错退出并列出违法语句
- 报错原文含「do NOT run `npm install`」「Cannot find module 'zod'」——遇到直接删除对应 import，**不要给项目 `npm install zod`/`lodash`**
- Zod 脚本由 pack 从 schema.ts 自动生成（通过 state.zod 驱动），CDN URL import（`import { registerMvuSchema } from 'https://...'`）自动追加，无需手写

## 前置
- 变量结构已在需求对齐阶段确定并写入 `创作规划.yaml` 的 `mvu` 段落（见 `references/requirements.md`），直接使用其中的变量结构编写 schema.ts。`mvu.variables` 中的 `check` 字段是特殊更新要求的提示，编写变量更新规则时使用。
- 如果规划文档的 `mvu` 信息不足以编写 schema.ts，询问用户补充。
- 如果项目使用了 EJS，先读取 entryManifest 中所有含 EJS 相关 note 的条目，确保变量设计覆盖 EJS 所需的条件变量。

## 产出

写入项目目录下的 `schema.ts`，导出 `Schema` 和对应类型：

```typescript
export const Schema = z.object({
  ...
});
export type Schema = z.output<typeof Schema>;
```

## 自查清单

- [ ] 导出了 `Schema` 和 `Schema` 类型
- [ ] 顶部没有任何 `import` 语句
- [ ] 没有使用 `.strict()` / `.passthrough()`（Zod 4 不存在）
- [ ] 没有滥用 `.optional()`（根字段不用）
- [ ] 使用 `z.coerce.number()` 而非 `z.number()`
- [ ] transform 用 `_.clamp` 而非 `min/max`
- [ ] 使用 `.prefault()` 而非 `.default()`
- [ ] 保持幂等
