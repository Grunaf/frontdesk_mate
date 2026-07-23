export type RegistrationAccordionItem = 'identity' | 'entryDate' | 'contact';

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
 */
export function resolveOpenRegistrationAccordionItem(
  completion: RegistrationAccordionCompletion
): RegistrationAccordionItem {
  if (completion.tourismRequired && !completion.tourismComplete) {
    return 'identity';
  }

  if (completion.tourismRequired && !completion.entryDateComplete) {
    return 'entryDate';
  }

  return 'contact';
}
