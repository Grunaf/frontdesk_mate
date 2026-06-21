import type { LaunchStepId } from '@/entities/tenant/lib/resolveGuestPathReadiness';
import type { AdminSectionId } from '../lib/adminSections';

export interface LaunchStepDefinition {
  id: LaunchStepId;
  title: string;
  description: string;
  sectionIds: AdminSectionId[];
}

export const LAUNCH_STEPS: LaunchStepDefinition[] = [
  {
    id: 'identity',
    title: 'Identity & subscription',
    description: 'Who this hostel is and when guests can access the app.',
    sectionIds: ['identity', 'subscription'],
  },
  {
    id: 'contacts-landing',
    title: 'Contacts & landing',
    description: 'How guests reach you and what they see on the public landing page.',
    sectionIds: ['contacts', 'landing'],
  },
  {
    id: 'booking',
    title: 'Booking path',
    description: 'Online engine or WhatsApp-only booking from the landing hero and room cards.',
    sectionIds: ['booking', 'landing'],
  },
  {
    id: 'arrival',
    title: 'Arrival basics',
    description: 'Help guests find the building and enter during the day.',
    sectionIds: ['arrival'],
  },
  {
    id: 'room-map',
    title: 'Room map minimum',
    description: 'Preview bed, layout, and wayfinding for settlement.',
    sectionIds: ['guest-app'],
  },
  {
    id: 'rules-wifi',
    title: 'Rules, guide & WiFi',
    description: 'In-app essentials unlocked after guest check-in.',
    sectionIds: ['guest-app', 'wifi', 'identity'],
  },
  {
    id: 'preview',
    title: 'Preview & go live',
    description: 'Check guest-path readiness and share links with guests.',
    sectionIds: [],
  },
];

export const LAUNCH_STEP_ORDER = LAUNCH_STEPS.map((step) => step.id);

export function getLaunchStepDefinition(stepId: LaunchStepId): LaunchStepDefinition {
  return LAUNCH_STEPS.find((step) => step.id === stepId) ?? LAUNCH_STEPS[0];
}
