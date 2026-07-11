import * as z from 'zod';
import { mutuallyExclusive } from '../util/zod-refinements.js';

export const Form = z.enum(['charactercard', 'worldbook']);

export const EntryType = z.string().describe(
  '条目类型',
);

export const PositionType = z.enum([
  'before_character_definition',
  'after_character_definition',
  'before_example_messages',
  'after_example_messages',
  'before_author_note',
  'after_author_note',
  'at_depth',
]);

export const StrategyType = z.enum(['constant', 'selective', 'vectorized']);

export const Role = z.enum(['system', 'assistant', 'user']);

export const SelectiveLogic = z.enum(['and_any', 'and_all', 'not_all', 'not_any']);

const ContentFragment = z.object({
  content: z.coerce.string().optional(),
  file: z.coerce.string().optional(),
}).superRefine((data, ctx) => mutuallyExclusive(['content', 'file'])(data, ctx));

export const EntryManifestLeaf = z.object({
  path: z.string().optional().describe('相对于项目根目录的文件路径, 与 contents 互斥'),
  scope: z.enum(['catalog', 'specific']).optional()
    .describe('速览/详情区分; catalog=速览级(固定蓝灯), specific=详情级(按阈值推导)'),
  part: z.string().optional()
    .describe('同类型内的子分类标识'),
  rephrase: z.boolean().optional()
    .describe('标记此条目是对同类型其他内容的重述/澄清; 影响位置(depth)和排序(反序)'),
  keywords: z.array(z.string()).default([]).describe('绿灯关键词候选: 角色名/NPC名/场景名等'),
  abstract: z.string().describe('条目内容摘要'),
  contents: z.array(ContentFragment).optional()
    .describe('有序内容片段列表, 与 path 互斥'),
  enabled: z.boolean().optional().describe('是否启用'),
  strategy: z.object({
    type: StrategyType,
    keys: z.array(z.coerce.string()).min(1).optional().describe('关键字'),
    keys_secondary: z.object({
      logic: SelectiveLogic,
      keys: z.array(z.coerce.string()).min(1),
    }).optional().describe('次要关键字'),
    scan_depth: z.union([z.literal('same_as_global'), z.number().min(1)]).optional().describe('扫描深度'),
  }).optional().describe('激活策略'),
  position: z.object({
    type: PositionType,
    role: Role.optional(),
    depth: z.number().optional(),
    order: z.number(),
  }).optional().describe('插入位置'),
  display_index: z.number().optional().describe('SillyTavern 界面中的显示顺序'),
  probability: z.number().min(0).max(100).optional().describe('激活概率%'),
  recursion: z.object({
    prevent_incoming: z.boolean().optional().describe('禁止其他条目递归激活本条目'),
    prevent_outgoing: z.boolean().optional().describe('禁止本条目递归激活其他条目'),
    delay_until: z.number().min(1).optional().describe('延迟到第 n 级递归检查时才能激活本条目'),
  }).partial().optional().describe('递归设置'),
  effect: z.object({
    sticky: z.number().min(1).optional().describe('黏性: 激活后持续 n 条消息'),
    cooldown: z.number().min(1).optional().describe('冷却: 激活后 n 条消息内不能再次激活'),
    delay: z.number().min(1).optional().describe('延迟: 聊天至少有 n 楼消息时才能激活'),
  }).partial().optional().describe('效果（黏性/冷却/延迟）'),
  group: z.object({
    labels: z.array(z.coerce.string()).min(1).describe('组标签'),
    use_priority: z.boolean().default(false).describe('使用优先级'),
    weight: z.number().default(100).describe('权重'),
    use_scoring: z.union([z.boolean(), z.literal('same_as_global')]).default('same_as_global')
      .transform(data => data === 'same_as_global' ? null : data).describe('使用评分'),
  }).optional().describe('组设置'),
}).superRefine((data, ctx) => mutuallyExclusive(['path', 'contents'])(data, ctx));

export const EntryManifest = z.record(EntryType, z.record(z.string(), EntryManifestLeaf))
  .default({})
  .describe('双层 Record: 外层 key = 类型名称, 内层 key = 条目名称');

export const PartThresholdValue = z.object({
  threshold: z.union([z.number().nullable(), z.literal('Infinity')]),
  required: z.boolean().default(false),
}).describe(
  'Part 级策略阈值: threshold 含义同简单类型; required=true 时校验每个角色的该 part 条目数一致',
);

export const SimpleThresholdValue = z.union([
  z.number().nullable(),
  z.literal('Infinity'),
]).describe(
  '简单策略阈值: Infinity=始终蓝灯, 0=始终绿灯, >0=有条件绿灯, null=enabled=false',
);

export const StrategyThresholdValue = z.union([
  SimpleThresholdValue,
  z.record(z.string(), PartThresholdValue),
]).describe(
  '策略阈值: 简单类型为数字/null/"Infinity", 嵌套类型为 part→{threshold, required} 的映射',
);

export const TypeLists = z.object({
  before_char: z.array(EntryType).default([]),
  after_char: z.array(EntryType).default([]),
  depth: z.array(EntryType).default([]),
}).default({ before_char: [], after_char: [], depth: [] }).describe('记录各位置的类型顺序，configure 据此推导具体条目的 position');

export const RegexScript = z.object({
  id: z.string(),
  findRegex: z.string(),
  replaceString: z.string().optional().describe('内联替换内容'),
  replace_file: z.string().optional().describe('替换内容文件路径，与 replaceString 互斥'),
  trimStrings: z.array(z.string()).optional(),
  placement: z.array(z.number()).optional(),
  disabled: z.boolean().optional(),
  markdownOnly: z.boolean().optional(),
  promptOnly: z.boolean().optional(),
  runOnEdit: z.boolean().optional(),
  substituteRegex: z.number().optional(),
  minDepth: z.number().optional(),
  maxDepth: z.number().optional(),
}).partial({ replaceString: true, replace_file: true })
  .superRefine((data, ctx) => mutuallyExclusive(['replaceString', 'replace_file'])(data, ctx));

export const TavernHelperScript = z.object({
  type: z.literal('script'),
  content: z.string().optional().describe('内联脚本内容'),
  script_file: z.string().optional().describe('脚本文件路径，与 content 互斥'),
  enabled: z.boolean(),
  id: z.string(),
  info: z.string().optional(),
  button: z.object({
    enabled: z.boolean(),
    buttons: z.array(z.object({
      name: z.string(),
      visible: z.boolean(),
    })).optional(),
  }).optional(),
  data: z.record(z.string(), z.any()).optional(),
}).partial({ content: true, script_file: true })
  .superRefine((data, ctx) => mutuallyExclusive(['content', 'script_file'])(data, ctx));

export const TavernHelper = z.object({
  scripts: z.record(z.string(), TavernHelperScript).optional().describe('脚本映射, key 为脚本名称'),
  variables: z.record(z.string(), z.any()).optional(),
});

const ZodDescriptor = z.object({
  scriptName: z.string().describe('脚本名, 即重建到 tavern_helper.scripts 时的 key'),
  scriptId: z.string().describe('来自角色卡的脚本 id; pack 时原样回写以保持跨 pack 稳定'),
  schemaPath: z.string().describe('schema.ts 相对项目根目录的路径'),
  importUrl: z.string().describe('registerMvuSchema 的 CDN import URL'),
  button: TavernHelperScript.shape.button.unwrap().optional(),
  info: z.string().optional(),
  data: z.record(z.string(), z.any()).optional(),
});

export const Extensions = z.looseObject({
  tavern_helper: TavernHelper.optional(),
  talkativeness: z.string().optional(),
  fav: z.boolean().optional(),
  world: z.string().optional(),
  depth_prompt: z.object({
    prompt: z.string(),
    depth: z.number(),
    role: z.string(),
  }).optional(),
});

const DepthDefaults = z.object({
  role: Role.default('system'),
  depth: z.number().default(0),
});

export const TavernCardsState = z.object({
  projectName: z.string().describe('角色卡/世界书的正式名称'),
  worldbookName: z.string().describe('世界书名称, 通常与 projectName 一致'),
  form: Form,
  mvu: z.boolean(),
  entryManifest: EntryManifest,
  typeLists: TypeLists,
  strategyThresholds: z.record(EntryType, StrategyThresholdValue).optional()
    .describe('覆盖 .cardrc.json default_strategy_thresholds 的阈值'),
  partOrder: z.record(EntryType, z.array(z.string())).optional()
    .describe('覆盖 .cardrc.json default_part_order 的 part 排序规则'),
  depth_defaults: DepthDefaults.default({ role: 'system', depth: 0 }).describe('at_depth 位置的默认 role/depth'),
  avatar: z.string().optional().describe('头像 PNG 路径, 相对于项目根目录'),
  description: z.string().default('').describe('角色描述'),
  first_messages: z.array(z.string()).default([]).describe('开场白内容/文件路径数组, [0]=first_mes, [1:]=alternate_greetings'),
  creator: z.string().default('').describe('创建者'),
  creator_notes: z.string().default('').describe('创建者备注'),
  version: z.string().default('1.0').describe('角色版本'),
  create_date: z.string().default('').describe('创建日期'),
  extensions: Extensions.optional().describe('扩展字段'),
  regex_scripts: z.record(z.string(), RegexScript).optional().describe('正则脚本映射, key 为脚本名称'),
  initvar_overrides: z.record(z.string(), z.string()).optional()
    .describe('开场白的 initvar_override 映射: key=开场白路径, value=override YAML 路径; 非MVU项目或无override时缺省'),
  zod: ZodDescriptor.optional()
    .describe('MVU Zod 脚本元数据; 存在时隐含 mvu=true, pack 据此重建脚本内容'),
}).superRefine((data, ctx) => {
  if (data.form === 'worldbook' && data.mvu) {
    ctx.addIssue({
      code: 'custom',
      path: ['mvu'],
      message: 'worldbook 时 mvu 必须为 false',
    });
  }
  if (!data.mvu && data.initvar_overrides !== undefined) {
    ctx.addIssue({
      code: 'custom',
      path: ['initvar_overrides'],
      message: 'mvu 为 false 时 initvar_overrides 必须缺省',
    });
  }
  if (data.zod && !data.mvu) {
    ctx.addIssue({
      code: 'custom',
      path: ['zod'],
      message: 'state.zod 存在时 mvu 必须为 true',
    });
  }
});

export type TavernCardsState = z.infer<typeof TavernCardsState>;
export type EntryManifestLeaf = z.infer<typeof EntryManifestLeaf>;
export type EntryManifest = z.infer<typeof EntryManifest>;
export type Form = z.infer<typeof Form>;
export type EntryType = z.infer<typeof EntryType>;
export type PositionType = z.infer<typeof PositionType>;
export type StrategyType = z.infer<typeof StrategyType>;
export type Role = z.infer<typeof Role>;
export type SelectiveLogic = z.infer<typeof SelectiveLogic>;
export type PartThresholdValue = z.infer<typeof PartThresholdValue>;
export type SimpleThresholdValue = z.infer<typeof SimpleThresholdValue>;
export type StrategyThresholdValue = z.infer<typeof StrategyThresholdValue>;
export type TypeLists = z.infer<typeof TypeLists>;
export type RegexScript = z.infer<typeof RegexScript>;
export type TavernHelperScript = z.infer<typeof TavernHelperScript>;
export type TavernHelper = z.infer<typeof TavernHelper>;
export type Extensions = z.infer<typeof Extensions>;
export type ZodDescriptor = z.infer<typeof ZodDescriptor>;