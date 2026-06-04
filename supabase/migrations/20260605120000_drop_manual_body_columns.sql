-- Manual height/weight entry was removed from the app; drop the now-unused columns.
alter table public.profiles drop column if exists manual_height_cm;
alter table public.profiles drop column if exists manual_weight_kg;
