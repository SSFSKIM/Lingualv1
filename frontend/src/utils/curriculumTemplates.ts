import type { ActivityTemplateDefinition, CurriculumPackageV1 } from '@/types';

export function buildTemplateIndex(
  curriculum: CurriculumPackageV1 | null,
): Map<string, ActivityTemplateDefinition> {
  return new Map(
    (curriculum?.templates.activityTemplates || []).map((template) => [template.id, template]),
  );
}

export function resolveActivityTemplates(
  curriculum: CurriculumPackageV1 | null,
  objectiveIds: string[],
): {
  templates: ActivityTemplateDefinition[];
  refs: string[];
  unresolvedRefs: string[];
} {
  const templateIndex = buildTemplateIndex(curriculum);
  const objectives =
    curriculum?.objectives.filter((objective) => objectiveIds.includes(objective.id)) || [];
  const refs = Array.from(
    new Set(objectives.flatMap((objective) => objective.templateRefs || []).filter(Boolean)),
  );
  const templates = refs
    .map((ref) => templateIndex.get(ref))
    .filter((template): template is ActivityTemplateDefinition => Boolean(template));
  const unresolvedRefs = refs.filter((ref) => !templateIndex.has(ref));

  return { templates, refs, unresolvedRefs };
}
