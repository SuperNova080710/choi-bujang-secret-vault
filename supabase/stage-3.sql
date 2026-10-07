alter table public.virtual_notes
  add column if not exists public_id uuid;

update public.virtual_notes
set public_id = gen_random_uuid()
where public_id is null;

alter table public.virtual_notes
  alter column public_id set default gen_random_uuid();

alter table public.virtual_notes
  alter column public_id set not null;

create unique index if not exists virtual_notes_public_id_key
  on public.virtual_notes (public_id);

