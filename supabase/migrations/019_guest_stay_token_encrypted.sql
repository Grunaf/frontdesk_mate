-- Store encrypted magic-link token so reception can re-show QR/link for active stays.

alter table guest_stays
  add column if not exists access_token_encrypted text;
