export type GuestTourismGender = 'male' | 'female';

export interface GuestTourismGuest {
  id: string;
  stay_id: string;
  first_name: string;
  last_name: string;
  citizenship: string;
  passport_number: string;
  date_of_birth: string;
  gender: GuestTourismGender;
  passport_storage_path: string;
  /** Legacy storage path; reception no longer uploads entry-stamp photos. Prefer `entry_stamp_date`. */
  entry_stamp_storage_path: string;
  /** Border entry date (YYYY-MM-DD), set at reception. */
  entry_stamp_date: string | null;
  created_at: string;
}

export interface GuestTourismRegistrationSummary {
  stay_id: string;
  tourism_contact_whatsapp: string | null;
  tourism_registration_completed_at: string | null;
  tourism_exported_at: string | null;
  guests: GuestTourismGuest[];
}
