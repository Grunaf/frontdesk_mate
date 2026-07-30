export type RegistrationAccordionItem = 'identity' | 'entryDate' | 'contact';

/** Open accordion section, or `null` when all prerequisites are complete (collapsed). */
export type RegistrationAccordionOpenValue = RegistrationAccordionItem | null;

export type RegistrationAccordionCompletion = {
  tourismRequired: boolean;
  tourismComplete: boolean;
  entryDateComplete: boolean;
  contactComplete: boolean;
};

export function shouldShowRegistrationIdentityAccordionItem(tourismRequired: boolean): boolean {
  return tourismRequired;
}

export function shouldShowRegistrationEntryDateAccordionItem(tourismRequired: boolean): boolean {
  return tourismRequired;
}

export function isRegistrationEntryDateAccordionDisabled(
  tourismRequired: boolean,
  tourismComplete: boolean
): boolean {
  return tourismRequired && !tourismComplete;
}

export function isRegistrationContactAccordionDisabled(
  tourismRequired: boolean,
  tourismComplete: boolean,
  entryDateComplete: boolean
): boolean {
  return tourismRequired && (!tourismComplete || !entryDateComplete);
}

/**
 * Accordion open state: identity → entryDate → contact when tourism required.
 * Returns `null` when all visible sections are complete (collapsed headers).
 */
export function resolveOpenRegistrationAccordionItem(
  completion: RegistrationAccordionCompletion
): RegistrationAccordionOpenValue {
  if (completion.tourismRequired && !completion.tourismComplete) {
    return 'identity';
  }

  if (completion.tourismRequired && !completion.entryDateComplete) {
    return 'entryDate';
  }

  if (!completion.contactComplete) {
    return 'contact';
  }

  return null;
}
