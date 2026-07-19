import { describe, expect, it } from 'vitest';
import {
  isRegistrationContactAccordionDisabled,
  resolveOpenRegistrationAccordionItem,
  shouldShowRegistrationArrivalStep,
  shouldShowRegistrationIdentityAccordionItem,
} from './resolveRegistrationAccordionItem';

describe('resolveRegistrationAccordionItem', () => {
  it('opens identity when tourism required and incomplete', () => {
    expect(
      resolveOpenRegistrationAccordionItem({
        tourismRequired: true,
        tourismComplete: false,
        entryDateComplete: false,
        contactComplete: false,
      })
    ).toBe('identity');
  });

  it('opens contact after identity (arrival is a separate card, not accordion)', () => {
    expect(
      resolveOpenRegistrationAccordionItem({
        tourismRequired: true,
        tourismComplete: true,
        entryDateComplete: false,
        contactComplete: false,
      })
    ).toBe('contact');
  });

  it('opens contact when identity and entry date complete but contact incomplete', () => {
    expect(
      resolveOpenRegistrationAccordionItem({
        tourismRequired: true,
        tourismComplete: true,
        entryDateComplete: true,
        contactComplete: false,
      })
    ).toBe('contact');
  });

  it('opens contact when tourism not required', () => {
    expect(
      resolveOpenRegistrationAccordionItem({
        tourismRequired: false,
        tourismComplete: false,
        entryDateComplete: false,
        contactComplete: false,
      })
    ).toBe('contact');
  });

  it('shows arrival step after identity until entry dates complete', () => {
    expect(shouldShowRegistrationArrivalStep(true, true, false)).toBe(true);
    expect(shouldShowRegistrationArrivalStep(true, true, true)).toBe(false);
    expect(shouldShowRegistrationArrivalStep(true, false, false)).toBe(false);
    expect(shouldShowRegistrationArrivalStep(false, true, false)).toBe(false);
  });

  it('locks contact until identity and entry date complete when required', () => {
    expect(isRegistrationContactAccordionDisabled(true, false, false)).toBe(true);
    expect(isRegistrationContactAccordionDisabled(true, true, false)).toBe(true);
    expect(isRegistrationContactAccordionDisabled(true, true, true)).toBe(false);
    expect(isRegistrationContactAccordionDisabled(false, false, false)).toBe(false);
  });

  it('shows identity item only when tourism required', () => {
    expect(shouldShowRegistrationIdentityAccordionItem(true)).toBe(true);
    expect(shouldShowRegistrationIdentityAccordionItem(false)).toBe(false);
  });
});
