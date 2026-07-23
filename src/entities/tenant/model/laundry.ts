/** Wash machines for Cleaning hub — tenant settings (not guestStay). */

export const LAUNDRY_PROGRAMS = ['wash', 'spin_drain'] as const;

export type LaundryProgram = (typeof LAUNDRY_PROGRAMS)[number];

export const DEFAULT_LAUNDRY_PROGRAM_MINUTES = {
  wash: 45,
  spin_drain: 15,
} as const satisfies Record<LaundryProgram, number>;

export const LAUNDRY_DURATION_MIN_MINUTES = 1;
export const LAUNDRY_DURATION_MAX_MINUTES = 180;

export interface LaundryMachinePrograms {
  wash: number;
  spin_drain: number;
}

export interface LaundryMachine {
  id: string;
  label: string;
  sortOrder?: number;
  programs: LaundryMachinePrograms;
}

export interface LaundrySettings {
  machines: LaundryMachine[];
}
