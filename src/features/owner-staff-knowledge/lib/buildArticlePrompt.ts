export function buildStaffKnowledgeArticlePrompt(input: {
  hostelName: string;
  topicNotes: string;
  roleName?: string;
  existingRoles: string[];
}): string {
  const hostelName = input.hostelName.trim() || 'this hostel';
  const topic = input.topicNotes.trim() || '(owner left no topic notes)';
  const roleHint = input.roleName?.trim();
  const rolesLine =
    input.existingRoles.length > 0
      ? input.existingRoles.join(', ')
      : '(no roles defined yet)';

  return `You write staff knowledge-base instructions for hostel employees.

Hostel: ${hostelName}
Existing roles: ${rolesLine}
${roleHint ? `Preferred related role: ${roleHint}` : 'Preferred related role: none'}

Owner wants an instruction about:
${topic}

Write one clear staff instruction (SOP-style). Include where tools/supplies are if the owner mentioned them.
If a public video URL would help and the owner provided one, put it in videoUrl; otherwise null.

Reply with ONLY one JSON object (JSON fence OK):
{
  "title": "Short title",
  "body": "Full instruction text. Use short paragraphs or numbered steps.",
  "videoUrl": null,
  "roleName": "Exact role name from the list above, or null"
}`;
}
