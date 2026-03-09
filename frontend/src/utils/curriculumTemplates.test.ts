import type { CurriculumPackageV1 } from '@/types';
import { buildTemplateIndex, resolveActivityTemplates } from './curriculumTemplates';

const MOCK_CURRICULUM = {
  objectives: [
    { id: 'obj.1', templateRefs: ['tpl.a', 'tpl.b'] },
    { id: 'obj.2', templateRefs: ['tpl.b', 'tpl.c'] },
    { id: 'obj.3', templateRefs: ['tpl.missing'] },
    { id: 'obj.4', templateRefs: [] },
  ],
  templates: {
    activityTemplates: [
      {
        id: 'tpl.a',
        title: { en: 'Template A' },
        mode: 'interpersonal_speaking',
        assistantRole: 'Role A',
        interactionPattern: { openingMoves: ['open'], sustainMoves: ['sustain'], closingMoves: ['close'], completionRule: 'rule' },
        promptCues: ['cue'],
      },
      {
        id: 'tpl.b',
        title: { en: 'Template B' },
        mode: 'presentational_speaking',
        assistantRole: 'Role B',
        interactionPattern: { openingMoves: [], sustainMoves: [], closingMoves: [], completionRule: '' },
        promptCues: [],
      },
    ],
  },
} as unknown as CurriculumPackageV1;

describe('buildTemplateIndex', () => {
  it('builds a map from template id to definition', () => {
    const index = buildTemplateIndex(MOCK_CURRICULUM);
    expect(index.size).toBe(2);
    expect(index.get('tpl.a')?.title.en).toBe('Template A');
    expect(index.get('tpl.b')?.title.en).toBe('Template B');
  });

  it('returns empty map for null curriculum', () => {
    expect(buildTemplateIndex(null).size).toBe(0);
  });
});

describe('resolveActivityTemplates', () => {
  it('resolves templates from a single objective', () => {
    const result = resolveActivityTemplates(MOCK_CURRICULUM, ['obj.1']);
    expect(result.templates).toHaveLength(2);
    expect(result.refs).toEqual(['tpl.a', 'tpl.b']);
    expect(result.unresolvedRefs).toEqual([]);
  });

  it('deduplicates refs across multiple objectives', () => {
    const result = resolveActivityTemplates(MOCK_CURRICULUM, ['obj.1', 'obj.2']);
    expect(result.refs).toEqual(['tpl.a', 'tpl.b', 'tpl.c']);
    expect(result.templates).toHaveLength(2);
    expect(result.unresolvedRefs).toEqual(['tpl.c']);
  });

  it('reports unresolved refs', () => {
    const result = resolveActivityTemplates(MOCK_CURRICULUM, ['obj.3']);
    expect(result.templates).toHaveLength(0);
    expect(result.refs).toEqual(['tpl.missing']);
    expect(result.unresolvedRefs).toEqual(['tpl.missing']);
  });

  it('returns empty for null curriculum', () => {
    const result = resolveActivityTemplates(null, ['obj.1']);
    expect(result.templates).toHaveLength(0);
    expect(result.refs).toEqual([]);
    expect(result.unresolvedRefs).toEqual([]);
  });

  it('returns empty for empty objectiveIds', () => {
    const result = resolveActivityTemplates(MOCK_CURRICULUM, []);
    expect(result.templates).toHaveLength(0);
    expect(result.refs).toEqual([]);
  });

  it('handles objective with empty templateRefs', () => {
    const result = resolveActivityTemplates(MOCK_CURRICULUM, ['obj.4']);
    expect(result.templates).toHaveLength(0);
    expect(result.refs).toEqual([]);
  });
});
