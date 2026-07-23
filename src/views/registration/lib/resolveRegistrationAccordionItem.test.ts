import { describe, expect, it } from 'vitest';
import {
  isRegistrationContactAccordionDisabled,
  isRegistrationEntryDateAccordionDisabled,
  resolveOpenRegistrationAccordionItem,
  shouldShowRegistrationEntryDateAccordionItem,
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

  it('opens entryDate after identity until entry dates complete', () => {
    expect(
      resolveOpenRegistrationAccordionItem({
        tourismRequired: true,
        tourismComplete: true,
        entryDateComplete: false,
        contactComplete: false,
      })
    ).toBe('entryDate');
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

  it('locks entryDate until identity complete when required', () => {
    expect(isRegistrationEntryDateAccordionDisabled(true, false)).toBe(true);
    expect(isRegistrationEntryDateAccordionDisabled(true, true)).toBe(false);
    expect(isRegistrationEntryDateAccordionDisabled(false, false)).toBe(false);
  });

  it('locks contact until identity and entry date complete when required', () => {
    expect(isRegistrationContactAccordionDisabled(true, false, false)).toBe(true);
    expect(isRegistrationContactAccordionDisabled(true, true, false)).toBe(true);
    expect(isRegistrationContactAccordionDisabled(true, true, true)).toBe(false);
    expect(isRegistrationContactAccordionDisabled(false, false, false)).toBe(false);
  });

  it('shows identity and entryDate items only when tourism required', () => {
    expect(shouldShowRegistrationIdentityAccordionItem(true)).toBe(true);
    expect(shouldShowRegistrationIdentityAccordionItem(false)).toBe(false);
    expect(shouldShowRegistrationEntryDateAccordionItem(true)).toBe(true);
    expect(shouldShowRegistrationEntryDateAccordionItem(false)).toBe(false);
  });
});
