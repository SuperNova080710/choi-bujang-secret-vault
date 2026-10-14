create table if not exists public.vault_devices (
    device_id uuid primary key,
    owner_id uuid not null,
    public_key_jwk jsonb not null,
    public_key_sha256 text not null
        check (public_key_sha256 ~ '^[0-9a-f]{64}$'),
    status text not null
        check (status in ('pending', 'approved', 'revoked')),
    approval_challenge text,
    challenge_expires_at timestamptz,
    created_at timestamptz not null default now(),
    approved_at timestamptz
);

create index if not exists vault_devices_owner_id_idx
    on public.vault_devices(owner_id);

create index if not exists vault_devices_owner_status_idx
    on public.vault_devices(owner_id, status);

alter table public.vault_devices
    enable row level security;

revoke all on table public.vault_devices
    from public;

revoke all on table public.vault_devices
    from anon;

revoke all on table public.vault_devices
    from authenticated;


create table if not exists public.vault_device_request_nonces (
    device_id uuid not null
        references public.vault_devices(device_id)
        on delete cascade,
    nonce text not null,
    used_at timestamptz not null default now(),
    primary key (device_id, nonce)
);

alter table public.vault_device_request_nonces
    enable row level security;

revoke all on table public.vault_device_request_nonces
    from public;

revoke all on table public.vault_device_request_nonces
    from anon;

revoke all on table public.vault_device_request_nonces
    from authenticated;