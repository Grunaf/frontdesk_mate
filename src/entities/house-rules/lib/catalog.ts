import {
  Ban,
  Bubbles,
  Clock,
  Cigarette,
  GlassWater,
  Moon,
  ShieldCheck,
  Shirt,
  Volume2,
  type LucideIcon,
} from 'lucide-react';
import type { RuleIconId, RuleTemplateId } from '../model/types';

export interface RuleRenderContext {}

export interface RuleRenderResult {
  summary: string;
  detail: string;
}

export interface RuleTemplateDefinition {
  id: Exclude<RuleTemplateId, 'custom'>;
  kind: 'simple' | 'configured';
  label: string;
  description: string;
  icon: RuleIconId;
  paramSchema?: { from?: 'time'; to?: 'time'; cost?: 'money' };
  render: (params: Record<string, string>, ctx: RuleRenderContext) => RuleRenderResult;
}

export const RULE_ICON_MAP: Record<RuleIconId, LucideIcon> = {
  moon: Moon,
  cigarette: Cigarette,
  glass: GlassWater,
  shield: ShieldCheck,
  bubbles: Bubbles,
  shirt: Shirt,
  volume: Volume2,
  clock: Clock,
  ban: Ban,
};

export const CUSTOM_RULE_ICON_OPTIONS: RuleIconId[] = [
  'moon',
  'cigarette',
  'glass',
  'shield',
  'volume',
  'clock',
  'ban',
];

export const HOUSE_RULE_TEMPLATES: RuleTemplateDefinition[] = [
  {
    id: 'quietHours',
    kind: 'configured',
    label: 'Quiet hours',
    description: 'Set nightly quiet times for guests.',
    icon: 'moon',
    paramSchema: { from: 'time', to: 'time' },
    render: (params) => ({
      summary: `Quiet hours ${params.from ?? ''}–${params.to ?? ''}`.trim(),
      detail: `Keep noise down from ${params.from ?? '?'} to ${params.to ?? '?'}. No doorbell during quiet hours — use app codes for night access.`,
    }),
  },
  {
    id: 'smoking',
    kind: 'simple',
    label: 'No smoking inside',
    description: 'Smoking allowed outside only.',
    icon: 'cigarette',
    render: () => ({
      summary: 'No smoking inside',
      detail: 'Smoking inside is forbidden. Please use the street area or designated outdoor spots.',
    }),
  },
  {
    id: 'alcohol',
    kind: 'simple',
    label: 'Outside alcohol policy',
    description: 'Guests may not bring outside drinks.',
    icon: 'glass',
    render: () => ({
      summary: 'No outside drinks',
      detail: 'Alcohol consumption is allowed, but bringing your own drinks from outside is prohibited. You can purchase drinks at our hostel bar.',
    }),
  },
  {
    id: 'selfService',
    kind: 'simple',
    label: 'Self-service',
    description:
      'Guests clean up after themselves in the kitchen and common areas — wash dishes and wipe surfaces they used.',
    icon: 'bubbles',
    render: () => ({
      summary: 'Clean up after yourself',
      detail:
        'After use in the kitchen or common areas, wash dishes and wipe tables, counters, and surfaces you touched. Leave shared spaces clean for the next guest.',
    }),
  },
  {
    id: 'labelYourFood',
    kind: 'simple',
    label: 'Label your food',
    description:
      'Label all food you store (fridge, freezer, pantry/shelves). Unlabeled or expired items may be thrown away or marked free.',
    icon: 'clock',
    render: () => ({
      summary: 'Label your food',
      detail:
        'Put your name and date on food in the fridge, freezer, or on shared shelves. Unlabeled or expired items may be removed or marked free for other guests.',
    }),
  },
];

export function getRuleTemplate(
  templateId: Exclude<RuleTemplateId, 'custom'>
): RuleTemplateDefinition | undefined {
  return HOUSE_RULE_TEMPLATES.find((entry) => entry.id === templateId);
}

export function getRuleTemplateIcon(templateId: RuleTemplateId, customIcon?: RuleIconId): LucideIcon {
  if (templateId === 'custom') {
    return customIcon ? RULE_ICON_MAP[customIcon] : RULE_ICON_MAP.ban;
  }
  const template = getRuleTemplate(templateId);
  return template ? RULE_ICON_MAP[template.icon] : RULE_ICON_MAP.ban;
}
