import { enforceGuidedSingleScenario } from './enforceGuidedSingleScenario';
import { modelOutputToPreview, parseGuidedRouteFillModelJson } from './guidedRouteFillSchema';
import type { GuidedRouteFillPreview } from '../model/types';

export function buildGuidedRoutePreviewFromPastedJson(
  rawJson: string,
  enforcementSource: string
): GuidedRouteFillPreview | null {
  const model = parseGuidedRouteFillModelJson(rawJson);
  if (!model) {
    return null;
  }

  const preview = enforceGuidedSingleScenario(modelOutputToPreview(model), enforcementSource);
  const seen = new Set<string>();
  return {
    ...preview,
    openQuestions: preview.openQuestions.filter((entry) => {
      if (seen.has(entry.id)) {
        return false;
      }
      seen.add(entry.id);
      return Boolean(entry.question.trim());
    }),
  };
}
