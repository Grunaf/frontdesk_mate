export interface GuestTourismGuest {
  id: string;
  stay_id: string;
  first_name: string;
  last_name: string;
  passport_storage_path: string;
  entry_stamp_storage_path: string;
  created_at: string;
}

export interface GuestTourismRegistrationSummary {
  stay_id: string;
  tourism_contact_whatsapp: string | null;
  tourism_registration_completed_at: string | null;
  tourism_exported_at: string | null;
  guests: GuestTourismGuest[];
}
