# 创作规划.yaml

需求对齐完成后，在项目目录下产出 `创作规划.yaml`。

```yaml
project:
  name: xxx
  worldbookName: xxx
  form: charactercard
  mvu: true
  avatar: path/to/avatar.png
  ui_mode: text    # 有效值：text（纯文字版）/ frontend（前端版）/ none（不需要）/ 缺省表示待定

world:
  overview: 现代都市修仙世界，灵气复苏后修仙者融入现代社会…
  regions:
    - name: 华东区
      scenes: [学校, 商业街, 修仙协会分部]
      description: 经济发达的东部沿海区域，修仙协会总部所在地  # 可选
    - name: 西北区
      scenes: [荒漠秘境]
  factions:
    - name: 修仙协会
      description: 官方修仙管理组织，负责登记和监管修仙者
      territory: 华东区           # 可选：势力主要活动区域
      key_members: [张会长]       # 可选：关键成员
    - name: 暗月教
      description: 地下修仙势力，追求禁忌功法
      territory: 西北区

characters:
  - name: 苏云
    basic:
      age: 19
      gender: 女
      identity: 修仙协会华东分部见习执法者
      relationship: 协会派来监视<user>的搭档
    appearance: [左手腕有一道淡金色的灵纹疤痕，总是穿协会制服但会把袖口挽起来]
    personality:
      base: 冷静                        # 底色，不随阶段变化，写一次
      # stages 数组的顺序和数量与 ejs.entries 中对应条目的 stages 一一对应
      # 创作阶段时，base 写一次，各阶段的 main/accent 按 EJS 条件展开为完整调色盘
      stages:                      # 可选：多阶段调色盘
        - name: 初识期
          main: [警惕, 克制]
          accent: [好奇]
          description: 以公务态度对待<user>，保持职业距离，暗中观察
        - name: 熟悉期
          main: [坦率, 倔强]
          accent: [好奇]
          description: 开始分享修仙界的见闻，偶尔流露对<user>的好奇
        - name: 亲密期
          main: [温柔, 依赖]
          accent: [倔强]
          description: 信任建立，在<user>面前卸下职业面具，展现柔软一面
        - name: 深爱期
          main: [依赖, 占有]
          accent: [脆弱]
          description: 深度羁绊，占有欲显现，脆弱坦露不再隐藏
    tri_faceted: false
  - name: 季清寒
    basic:
      age: 23
      gender: 女
      identity: 修仙协会华东分部资深执法者，苏云的前辈搭档
      relationship: 苏云的导师，<user>的间接联络人
    appearance: [总把长发束成低马尾，右手无名指戴着协会指环]
    personality:
      base: 冷静
      main: [理性, 严苛]
      accent: [温柔]
    tri_faceted:
      needed: true
      facets:                    # 可选：如果用户已描述了各面
        - trigger: 执行公务时
          mode: 不苟言笑的资深执法者，决策果断不留情面
        - trigger: 独处或与苏云私下相处
          mode: 放下架子的前辈，偶尔流露对逝去搭档的怀念
        - trigger: 面对<user>暴露自身弱点时
          mode: 卸下所有防备，承认自己也会害怕
  - name: 王老师
    type: NPC
    function: 提供修仙界信息
    appearance: [总是穿深灰色西装，袖口沾粉笔灰]  # 可选

style:                         # 正文写作风格，包括开场白，不影响世界书条目
  perspective: 第三人称
  tone: 口语化、轻松
  mood: 温馨
  reference: 参考村上春树的文风  # 可选

requirements:                    # 可选段落：只记没有其它落点的要求
  - id: R1
    text: 状态栏的好感度等信息默认隐藏，但允许玩家点击按钮显示  # 用户原话
    kind: must                   # must（必须做到）/ must_not（禁止）/ prefer（倾向，冲突可让步）

entries:                         # 数组顺序即创作顺序，项目级事实来源
  - name: 世界设定               # 必填：entryManifest 中的条目名
    type: 世界观                  # 必填：条目类型，见类型说明表
    path: 世界书/世界观/世界设定.yaml  # 必填
  - name: 华东区
    type: 地理
    path: 世界书/地理/华东区.yaml
  - name: 扮演准则
    type: 扮演准则
    path: 世界书/扮演准则/扮演准则.yaml
    purpose: 叙述风格与内容边界
    note: 不正面描写人物死亡
  - name: 阶段指导
    type: 阶段指导
    path: 世界书/阶段指导/阶段指导.yaml
    purpose: 根据当前阶段渲染主持目标、互动方式和推进边界
  - name: 苏云_基础信息
    type: 角色
    path: 世界书/角色/苏云/基础信息.yaml
    part: basic                   # 可选：角色类型的 part 子分类
    scope: specific               # 可选
    rephrase: false               # 可选
    purpose: 苏云的基础档案       # 可选：给创作阶段用
    source_chapters: [第1章, 第5章] # 可选：转化项目
    keywords: [苏云, 小云]        # 可选：缺省时按 conventions 建议推导
  - name: 苏云_性格调色盘
    type: 角色
    path: 世界书/角色/苏云/性格调色盘.yaml
    part: personality
    note: 冷静不是没有感情，偶尔泄露苏云的情绪作为点缀   # 可选：用户对这条的要求，记原话
  - name: 季清寒_基础信息
    type: 角色
    path: 世界书/角色/季清寒/基础信息.yaml
    part: basic
  - name: 季清寒_性格调色盘
    type: 角色
    path: 世界书/角色/季清寒/性格调色盘.yaml
    part: personality
  - name: 季清寒_三面性
    type: 角色
    path: 世界书/角色/季清寒/三面性.yaml
    part: tri_faceted
  - name: 王老师
    type: NPC
    path: 世界书/NPC/王老师.yaml

mvu:                             # 可选段落，project.mvu=true 时出现
  structure: |
    顶层结构：
    ├── 世界
    │   ├── 当前时间
    │   ├── 当前区域
    │   ├── 天气与灵气浓度
    │   └── 近期事务：${事务名}
    ├── 苏云
    │   ├── 好感度
    │   ├── 信任度
    │   └── 任务进度
    └── 主角
        ├── 灵力值
        ├── 物品栏：${物品名}
        └── 能力面板：${力量|敏捷|体质}
  variables:                     # 待细化：粗略规划时可省略或只写粗略结构
    # type 字段默认 string，可省略；需要其他类型时显式声明
    # ── 世界 ──
    - path: 世界.当前时间
      format: YYYY/MM/DD-HH:MM
      description: 当前场景时间
    - path: 世界.当前区域
      description: 角色当前所在区域
    - path: 世界.天气与灵气浓度
      type: object
      fields:
        weather: string          # 晴/阴/雨
        spiritual_density: number # 0-1，灵气浓度
    - path: 世界.近期事务
      type: z.record
      format: "${事务名}: ${当前状态}"
      description: 进行中的主线事件
    # ── 苏云 ──
    - path: 苏云.好感度
      type: number
      range: 0~100
      check: 关键事件触发跳升，日常互动小幅增长，冷落则每日衰减2点  # 可选，仅特殊/复杂更新要求
    - path: 苏云.信任度
      type: number
      range: 0~100
      check: 与好感度独立；坦诚/帮助行为+5~10，欺骗行为-15~20，信任度影响苏云分享情报的深度
    - path: 苏云.任务进度
      enum: [待命, 调查中, 对峙, 结案]
      description: 协会执法任务阶段
    # ── 主角 ──
    - path: 主角.灵力值
      type: number
      range: 0~100
      description: 当前可用灵力
    - path: 主角.物品栏
      type: z.record
      format: "${物品名}: {数量: number, 描述: string}"
      description: 随身物品不设上限，避免静默丢失
      check: 获得新物品时新增；用完或丢弃时删除
    - path: 主角.能力面板
      type: z.record
      format: "${力量|敏捷|体质}: number"
      description: 三项基础属性，数值 0~100

ejs:                             # 可选段落，有 EJS 需求时出现
  entries:
    - name: 华东区
      complexity: 条目显隐
      condition: "getvar('stat_data.世界.当前区域', { defaults: '' }).includes('华东区')"
    - name: 苏云_性格调色盘
      complexity: 段落控制
      stages:                        # 多阶段调色盘的阶段判定条件，与 characters 中 stages 一一对应
        - name: 初识期
          condition: "getvar('stat_data.苏云.好感度', { defaults: 0 }) < 10"
        - name: 熟悉期
          condition: "getvar('stat_data.苏云.好感度', { defaults: 0 }) >= 10 && getvar('stat_data.苏云.好感度', { defaults: 0 }) < 30"
        - name: 亲密期
          condition: "getvar('stat_data.苏云.好感度', { defaults: 0 }) >= 30 && getvar('stat_data.苏云.好感度', { defaults: 0 }) < 60"
        - name: 深爱期
          condition: "getvar('stat_data.苏云.好感度', { defaults: 0 }) >= 60"

first_messages:                  # 可选段落，角色卡时出现；数组顺序对应 state.first_messages
  - format: 叙事式
    word_count: 500~700          # 叙事式时的字数范围，大纲式不需要
    output_path: 开场白/0.txt    # 开场白文件写入路径；叙事式由子代理直接写入，大纲式由主代理保存
    scene: 协会分部门口，雨夜      # 待细化：粗略规划时可省略
    opening_situation: |         # 待细化：粗略规划时可省略
      苏云收到协会指令，前往华东分部报到时，在门口遇见<user>。
      她没想到这次任务的搭档竟是个看起来完全不像修仙者的人。
    note: 苏云先开口，别让<user>先说话   # 可选：用户对这条开场白的要求，记原话
  - format: 叙事式
    word_count: 300~500
    output_path: 开场白/1.txt    # 额外开场白路径
    scene: 一周后的咖啡馆
    opening_situation: |
      苏云主动约你在一间安静的咖啡馆见面。
      她脱掉了协会制服，看起来比平时放松，但眼神里仍带着某种试探。
    initvar_override: 开场白/initvar/1.yaml  # 可选；该开场白需要不同的初始变量时填写
```

## 额外要求

`requirements` 是兜底：用户的要求先在创作规划里找落点——单条条目的写进 `entries[].note`，设定的写进 `world` / `characters`，单个变量写进 `variables` 对应行，单段开场白写进 `first_messages[].note`。跨条目的要求，以及界面、打包这类没有字段可挂的约束，才记一行。设计稿的「硬性边界」「待定项」同样先找落点。

`text` 只记用户在对话里说过的原话，不改写、不补充。原话不足以执行时（不知道落在哪个产物、什么算做到），追问用户，把回答追加进 `text`。

## 变量形态

| 字段 | 用途 |
|---|---|
| `path` | 变量路径，点号分段。只有要穿过上层开放记录时才写 `${名}`，如 `世界.势力.${势力名}.成员` |
| `type` | `string`（默认）/ `number` / `boolean` / `object`（配 `fields`）/ `z.record` / `z.array` |
| `format` | `string`：值必须满足的格式；`z.record`：一条记录的模板，写成 `${键}: ${值}`；`z.array`：一个元素的模板，缺省按 `string` |
| `enum` | 闭集取值，列全所有值，如 `[待命, 调查中, 对峙, 结案]` |
| `fields` | `type: object` 时的字段表，字段名 → 类型 |
| `range` | 数值范围，如 `0~100` |
| `description` | 这个变量是什么 |
| `check` | 更新规则的草稿：什么时候更新、更新成什么；变量更新规则阶段据此展开 |
| `cap` | 仅开放记录（键位写 `${名}`）：这一层容器的键数上限；超限静默丢弃最旧的键，通常不设，仅当用户明确要求时写 |

1. 键位写 `${名1|名2|…}`：键是这几个固定值，值结构相同，写一遍即可；结构不同就分开写。固定键默认必填，某个键可以不存在时在 `description` 里注明。
2. 值位写 `${描述}` 表示字符串，写 `{字段: 类型, ...}` 表示对象，也可以直接写 `number`、`boolean`。
3. 集合优先用 `z.record`；顺序有意义、且不需要按键增删时用 `z.array`。
4. `cap` 只约束这一行的记录；嵌套记录的父层要单独写一行。
