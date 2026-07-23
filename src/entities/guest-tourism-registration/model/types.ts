export type GuestTourismGender = 'male' | 'female';

export type GuestTourismDocumentType = 'passport' | 'id_card';

export type EntryTransportType = 'plane' | 'bus' | 'car' | 'train' | 'other';

export type EntryDetailsStatus = 'incomplete' | 'complete' | 'skipped';

export interface GuestTourismGuest {
  id: string;
  stay_id: string;
  first_name: string;
  last_name: string;
  citizenship: string;
  passport_number: string;
  date_of_birth: string;
  country_of_birth: string;
  place_of_birth: string;
  gender: GuestTourismGender;
  document_type: GuestTourismDocumentType;
  passport_storage_path: string;
  /** Legacy storage path; reception no longer uploads entry-stamp photos. Prefer `entry_stamp_date`. */
  entry_stamp_storage_path: string;
  /** Border entry date (YYYY-MM-DD), set at reception. */
  entry_stamp_date: string | null;
  /** Passport page number of the entry stamp (optional). */
  entry_stamp_page: number | null;
  created_at: string;
}

export interface GuestTourismRegistrationSummary {
  stay_id: string;
  tourism_contact_whatsapp: string | null;
  tourism_registration_completed_at: string | null;
  tourism_exported_at: string | null;
  entry_transport_type: EntryTransportType | null;
  entry_point_code: string | null;
  entry_point_label: string | null;
  entry_details_status: EntryDetailsStatus | null;
  guests: GuestTourismGuest[];
}
