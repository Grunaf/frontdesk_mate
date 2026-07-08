import type { RouteId } from '@/entities/hostel';
import { ROUTE_PRESETS } from '@/entities/city-pack';
import { getGuidedInterviewQuestions } from '@/features/city-pack-guided-fill';

function formatTaxiCardChecklist(hubLabel: string): string {
  const taxiQuestions = getGuidedInterviewQuestions('transit', hubLabel).filter(
    (question) => question.id === 'taxi-backup'
  );
  const lines = [
    'Taxi card (guest backup — not the main step-by-step path):',
    '  - Typical metered price or range to hostel district (source?)',
    '  - Official taxi stand / desk / pickup point at this hub',
    '  - When taxi is backup vs public transport (night, no service)',
  ];
  for (const question of taxiQuestions) {
    const hint = question.hint ? ` (${question.hint})` : '';
    lines.push(`  - ${question.label}${hint}`);
  }
  return lines.join('\n');
}

function formatQuestionBlock(
  hubLabel: string,
  mode: 'transit' | 'walk_only',
  heading: string
): string {
  const questions = getGuidedInterviewQuestions(mode, hubLabel);
  const lines = questions.map((question) => {
    const hint = question.hint ? ` (${question.hint})` : '';
    const required = question.required ? ' [required]' : ' [optional]';
    return `  - ${question.label}${hint}${required}`;
  });
  return [`${heading}:`, ...lines].join('\n');
}

/** Research checklist per hub — transit + walk scenarios + taxi context. */
export function formatPackBulkInterviewChecklist(routeIds: RouteId[]): string {
  const sections: string[] = [
    'For each hub below, research BOTH public transit and walk-only if they exist in this city. Skip hubs that do not apply.',
    'Also note taxi cost range, official pickup point, and when taxi is backup (not the main step-by-step path).',
    '',
  ];

  for (const routeId of routeIds) {
    const hubLabel = ROUTE_PRESETS.find((entry) => entry.id === routeId)?.label ?? routeId;
    sections.push(`## ${hubLabel} (routeId: ${routeId})`);
    sections.push(
      formatQuestionBlock(hubLabel, 'transit', 'If public transit is used')
    );
    sections.push('  - Schedule reliability/frequency (peak, evening, weekend)');
    sections.push('  - Ticket payment path (kiosk/driver/app/online + validation)');
    sections.push(
      '  - Keep final guest advice concise: each line max 10 words (for schedule/payment blocks)'
    );
    sections.push('');
    sections.push(formatQuestionBlock(hubLabel, 'walk_only', 'If walk-only from this hub'));
    sections.push('');
    sections.push(formatTaxiCardChecklist(hubLabel));
    sections.push('');
  }

  return sections.join('\n');
}
