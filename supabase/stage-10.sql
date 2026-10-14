create extension if not exists pgcrypto;

create table if not exists public.virtual_note_backups (
    public_id uuid primary key,
    owner_id uuid not null,
    title text not null,
    content text not null,
    content_sha256 text not null
        check (content_sha256 ~ '^[0-9a-f]{64}$'),
    backup_version text not null,
    backed_up_at timestamptz not null default now()
);

alter table public.virtual_note_backups
    enable row level security;

revoke all on table public.virtual_note_backups
    from public;

revoke all on table public.virtual_note_backups
    from anon;

revoke all on table public.virtual_note_backups
    from authenticated;

insert into public.virtual_note_backups (
    public_id,
    owner_id,
    title,
    content,
    content_sha256,
    backup_version
)
select
    public_id,
    owner_id,
    title,
    content,
    encode(
        digest(content, 'sha256'),
        'hex'
    ),
    'stage10-pre-incident-v1'
from public.virtual_notes
where owner_id is not null
on conflict (public_id) do nothing;