export type RegistrationAccordionItem = 'identity' | 'contact';

export type RegistrationAccordionCompletion = {
  tourismRequired: boolean;
  tourismComplete: boolean;
  entryDateComplete: boolean;
  contactComplete: boolean;
};

export function shouldShowRegistrationIdentityAccordionItem(tourismRequired: boolean): boolean {
  return tourismRequired;
}

/** Arrival / entry dates card between identity and contact — not an accordion item. */
export function shouldShowRegistrationArrivalStep(
  tourismRequired: boolean,
  tourismComplete: boolean,
  entryDateComplete: boolean
): boolean {
  return tourismRequired && tourismComplete && !entryDateComplete;
}

export function isRegistrationContactAccordionDisabled(
  tourismRequired: boolean,
  tourismComplete: boolean,
  entryDateComplete: boolean
): boolean {
  return tourismRequired && (!tourismComplete || !entryDateComplete);
}

/**
 * Accordion open state only: identity | contact.
 * When arrival dates are still incomplete, callers should show the Arrival card
 * instead of relying on an accordion item.
 */
export function resolveOpenRegistrationAccordionItem(
  completion: RegistrationAccordionCompletion
): RegistrationAccordionItem {
  if (completion.tourismRequired && !completion.tourismComplete) {
    return 'identity';
  }

  return 'contact';
}
