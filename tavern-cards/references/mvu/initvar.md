# 初始变量（initvar.yaml）

## 编写原则

- YAML 格式，结构需与 `schema.ts` 中定义的 Schema 对应，完成后通过 `validate-mvu` 校验
- 初始值要符合开场情节的设定。开场情节在需求对齐阶段确认，或在此阶段询问用户

## 默认 initvar

注册为 `[InitVar]请勿打开`，写入 `世界书/变量/initvar.yaml`。

## initvar_override

当某条开场白需要与默认 initvar 不同的初始变量时（通常为额外开场白），使用 `initvar_override` 文件。

### 存放约定

- 默认：`世界书/变量/initvar.yaml`
- 额外：`开场白/initvar/{index}.yaml`（与 `开场白/{index}.txt` 编号一致）
- `initvar_override` 不是独立条目，不写入 entryManifest；通过 `state.initvar_overrides` 注册到 state（见下文「注册到 state」）
- 所有 initvar YAML 必须与 `schema.ts` 一致
- **schema.ts 顶部禁止任何 `import` 语句**（`z`/`_` 已为全局注入）；详见 `references/mvu/schema.md#加载与-import-约束`

### 注册到 state

写完 override YAML 文件后，通过 patch 注册（`add` 操作 precheck 会校验 override 文件存在）：

```bash
node scripts/tavern-cards-forge.mjs patch {project} \
  '[{"op":"add","path":"/initvar_overrides/开场白~11.txt","value":"开场白/initvar/1.yaml"}]'
```

批量注册：

```bash
node scripts/tavern-cards-forge.mjs patch {project} \
  '[
    {"op":"add","path":"/initvar_overrides/开场白~11.txt","value":"开场白/initvar/1.yaml"},
    {"op":"add","path":"/initvar_overrides/开场白~12.txt","value":"开场白/initvar/2.yaml"}
  ]'
```

> **key 必须与 `first_messages` 中对应原始值精确一致**：pack 的 `initvar_override` 嵌入用 `state.first_messages[i]`（数组原值）作为查找 key。若 state 中 `first_messages` 用相对路径 `开场白/1.txt`，则 override key 为 `开场白/1.txt`（patch 中转义为 `开场白~11.txt`）；若用了绝对/带前缀路径，则 key 亦需一致。另：仅当 `first_messages[i]` 是**文件路径**（含扩展名）时才生效，内联多行文本不参与嵌入。
>
> `/` 在 JSON Pointer key 中需转义为 `~1`（RFC 6901）；`~` 转义为 `~0`（一般路径不含 `~`，可忽略）。
> 示例：`开场白~11.txt` 对应 key `"开场白/1.txt"`（`开场白` + `~1` + `1.txt`）。
>
> `initvar_overrides` 是 `TavernCardsState` 的顶层字段，仅 `mvu === true` 时可存在（`mvu === false` 时必须缺省，否则 patch 校验失败并回滚）。文件重命名行为见 `references/conventions.md#文件路径自动重命名`。

### 验证

前置条件：`state.zod` 必须存在（含 `schemaPath` 指向 `schema.ts`）。缺失时报错，需运行 `unpack` 自动填充，或手动编辑 `tavern-cards-state.json` 添加 `zod` 字段。

```bash
# 默认
node scripts/tavern-cards-forge.mjs validate-mvu {project}
# 指定 override
node scripts/tavern-cards-forge.mjs validate-mvu {project} --initvar cards/{Project}/开场白/initvar/1.yaml
```

未提供 `--initvar` 时校验默认 `世界书/变量/initvar.yaml`。支持绝对和相对路径。

### 嵌入开场白（pack 自动）

pack 时根据 `state.initvar_overrides` 自动在对应开场白末尾嵌入 `<UpdateVariable><initvar>` 块（见 `references/manual.md#pack`），无需手动写入。嵌入的块格式如下：

```text
<UpdateVariable>
<initvar>
{initvar 内容}
</initvar>
</UpdateVariable>
```

该块完全覆盖默认 initvar（非合并），只有需要不同初始变量的开场白才需 override。

## 自查清单

- [ ] YAML 格式正确
- [ ] 通过 validate-mvu 校验（默认或指定 `--initvar`）
- [ ] 没有繁体字、日文汉字
- [ ] initvar_override 文件未注册为条目，未写入 entryManifest
- [ ] `initvar_overrides` 已通过 patch 注册到 state（见上文「注册到 state」）
- [ ] 各 initvar_override 文件已通过 `--initvar` 校验
- [ ] 无需手动嵌入 `<UpdateVariable>` 块——pack 自动嵌入
