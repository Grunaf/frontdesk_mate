import { describe, expect, it } from 'vitest';
import {
  isRegistrationContactAccordionDisabled,
  resolveOpenRegistrationAccordionItem,
  shouldShowRegistrationRegisterAccordionItem,
} from './resolveRegistrationAccordionItem';

describe('resolveRegistrationAccordionItem', () => {
  it('opens register when tourism required and incomplete', () => {
    expect(
      resolveOpenRegistrationAccordionItem({
        tourismRequired: true,
        tourismComplete: false,
        contactComplete: false,
      })
    ).toBe('register');
  });

  it('opens contact when tourism complete but contact incomplete', () => {
    expect(
      resolveOpenRegistrationAccordionItem({
        tourismRequired: true,
        tourismComplete: true,
        contactComplete: false,
      })
    ).toBe('contact');
  });

  it('opens contact when tourism not required', () => {
    expect(
      resolveOpenRegistrationAccordionItem({
        tourismRequired: false,
        tourismComplete: false,
        contactComplete: false,
      })
    ).toBe('contact');
  });

  it('locks contact until tourism complete when required', () => {
    expect(isRegistrationContactAccordionDisabled(true, false)).toBe(true);
    expect(isRegistrationContactAccordionDisabled(true, true)).toBe(false);
    expect(isRegistrationContactAccordionDisabled(false, false)).toBe(false);
  });

  it('shows register item only when tourism required', () => {
    expect(shouldShowRegistrationRegisterAccordionItem(true)).toBe(true);
    expect(shouldShowRegistrationRegisterAccordionItem(false)).toBe(false);
  });
});
