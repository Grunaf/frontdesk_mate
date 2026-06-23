import { GUEST_ISSUE_CATEGORIES, type GuestIssueCategory } from '../model/types';

export function isGuestIssueCategory(value: string): value is GuestIssueCategory {
  return (GUEST_ISSUE_CATEGORIES as readonly string[]).includes(value);
}
