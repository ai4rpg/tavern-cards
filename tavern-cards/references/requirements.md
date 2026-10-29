# 需求对齐

本阶段从 tavern-design 已产出的 `design-spec.md` 开始，完成项目创建与创作规划，做技术收尾与具体信息展开，最终产出 `创作规划.yaml`。

## 前置要求

开始前确认 `cards/{Project}/design-spec.md` 已存在。如果还没有，先调用 **tavern-design** skill 完成大方向讨论与剧情设计，再回到本流程。

## 铁律

用户个人独特的想法和思路是内容独创性的保障。
你的任务是忠实地收集、记录用户需求，任何不确定之处都必须询问用户确认。
即使用户没有确定的思路，也只能通过启发式提问引导用户，严禁猜测、推断用户想法。

## 对齐模式

创作规划阶段开头询问用户偏好：

> 你希望先粗略规划、细节留到创作时再确认，还是一次性把所有信息都定下来？

根据回答调整提问深度，规划文档的段落完整度自然反映模式：

| 段落 | 粗略规划 | 一次确认 |
|------|---------|----------|
| project.* | 除 `ui_mode` 外全部必填 | 全部必填 |
| world.* | 全部必填 | 全部必填 |
| characters.* | 全部必填 | 全部必填 |
| style.* | 全部必填 | 全部必填 |
| requirements | 用户要求没落点才写，写了就全部必填 | 同左 |
| entries | 全部必填 | 全部必填 |
| mvu | 只需 structure，可粗略 | structure + variables 完整 |
| ejs | 只填 entries | entries 完整（含 condition 中的 stat_data 路径） |
| first_messages | 可只填各项 format | 各项 format + scene + opening_situation，需要的项补充 initvar_override |

粗略规划模式下，在 `创作规划.yaml` 中用 `# 待细化` YAML 注释标记需要创作阶段补全的字段。例如：

```yaml
variables:                    # 待细化：取值范围和格式约束待创作阶段补充
  - path: 苏云.好感度
    type: number
```

创作阶段遇到 `# 待细化` 注释时，必须先追问用户补全后再继续。

创作阶段遇到规划文档中缺失的信息时，按需追问。

## 流程

1. 读取 `references/project-setup.md`，从 `design-spec.md` 读取项目基础属性，完成技术收尾并创建项目。
2. 读取 `references/requirements/world-characters.md`，以 `design-spec.md` 为基础展开具体世界与角色信息。
3. 读取 `references/requirements/entries-dynamics-style.md`，以 `design-spec.md` 的风格意向、互动/动态概念为输入，规划条目、MVU/EJS、写作风格与开场白。
4. 读取 `references/requirements/planning-yaml.md`，编写项目目录下的 `创作规划.yaml`。

## 编写规划文档

创作规划完成后，**必须**产出编写规划文档。

保存路径：项目目录下的 `创作规划.yaml`

完整结构和示例见 `references/requirements/planning-yaml.md`。

产出此文档后，逐项核对以下内容并说明：
- 条目类型和数量是否覆盖需求
- 字符名、地名等关键名称是否正确（尤其检查繁体字/日文汉字）
- 条目顺序是否符合预期
- 用户要求是否都有落点（`entries[].note`、`world` / `characters`、`variables` 对应行、`first_messages[].note`），`requirements` 只留没有其它落点的；`text` 是用户原话（不是你的转述），`must_not` 是否与其它规划冲突
- MVU/EJS 规划是否满足动态需求

核对无误后，**必须暂停并等待用户确认**。用户确认后，按 `entries` 数组顺序依次进行条目创作（`references/composition.md`）。

## 参考

- `references/project-setup.md`：从 `design-spec.md` 读取属性、技术收尾、typeLists 调整与项目创建
- `references/requirements/world-characters.md`：世界与角色信息收集
- `references/requirements/entries-dynamics-style.md`：条目、MVU/EJS、风格与开场白规划
- `references/requirements/planning-yaml.md`：`创作规划.yaml` 完整结构和示例
- `references/requirements/entry-types.md`：条目类型说明
