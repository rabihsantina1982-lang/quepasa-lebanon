-- When an applicant ticked "I agree to the Organiser Terms" on the
-- Become a promoter form (/api/promoter/apply sets it).
alter table promoter_applications add column if not exists terms_accepted_at timestamptz;

notify pgrst, 'reload schema';
