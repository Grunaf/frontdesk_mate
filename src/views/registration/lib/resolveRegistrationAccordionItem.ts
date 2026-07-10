export type RegistrationAccordionItem = 'register' | 'contact';

export type RegistrationAccordionCompletion = {
  tourismRequired: boolean;
  tourismComplete: boolean;
  contactComplete: boolean;
};

export function shouldShowRegistrationRegisterAccordionItem(tourismRequired: boolean): boolean {
  return tourismRequired;
}

export function isRegistrationContactAccordionDisabled(
  tourismRequired: boolean,
  tourismComplete: boolean
): boolean {
  return tourismRequired && !tourismComplete;
}

/** First incomplete prerequisite; when all complete, defaults to `contact`. */
export function resolveOpenRegistrationAccordionItem(
  completion: RegistrationAccordionCompletion
): RegistrationAccordionItem {
  if (completion.tourismRequired && !completion.tourismComplete) {
    return 'register';
  }

  return 'contact';
}
