-- ============================================================================
-- Woltar Archives Vivantes — schéma de base Supabase
-- ============================================================================
-- À exécuter UNE fois dans Supabase → SQL Editor → New query → Run.
-- Recréer proprement : ce script est idempotent (drop + create).
--
-- Modèle : lecture publique (le site est public), écriture réservée à
-- l'administratrice (adresse e-mail définie plus bas dans is_admin()).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Qui est admin ?  (une seule adresse pour l'instant — voir README admin)
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(
    (auth.jwt() ->> 'email') = 'defosse.marion@gmail.com',
    false
  );
$$;

-- ----------------------------------------------------------------------------
-- 1. Tables
-- ----------------------------------------------------------------------------

drop table if exists public.character_relations cascade;
drop table if exists public.characters cascade;
drop table if exists public.locations cascade;
drop table if exists public.clans cascade;
drop table if exists public.events cascade;
drop table if exists public.archives cascade;

-- Personnages -----------------------------------------------------------------
create table public.characters (
  id                text primary key,
  number            text default '',
  first_name        text default '',
  last_name         text default '',
  nickname          text default '',
  title             text default '',
  clan              text default '',
  status            text default 'to-develop',   -- active | to-develop | deceased | archived
  canon             text default 'draft',        -- confirmed | draft
  age               text default '',
  gender            text default '',
  species           text default '',
  origin            text default '',
  residence         text default '',
  occupation        text default '',
  short_description text default '',
  personality       text default '',             -- champ "character" côté front
  appearance        text default '',
  biography         text default '',
  portrait          text default '',             -- URL (Supabase Storage)
  traits            text[] default '{}',
  location_ids      text[] default '{}',         -- ids de lieux associés
  tags              text[] default '{}',
  gallery           text[] default '{}',         -- URLs
  sort_order        int   default 0,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- Relations entre personnages (dirigées : source -> target) -------------------
create table public.character_relations (
  id           uuid primary key default gen_random_uuid(),
  source_id    text not null references public.characters(id) on delete cascade,
  target_id    text not null references public.characters(id) on delete cascade,
  type         text default '',                 -- "Frère jumeau", "Fils"...
  description  text default '',
  created_at   timestamptz default now()
);
create index on public.character_relations (source_id);

-- Lieux ---------------------------------------------------------------------
create table public.locations (
  id                text primary key,
  name              text default '',
  type              text default '',
  canon             text default 'draft',
  location          text default '',             -- situé à / dans
  owner             text default '',
  faction           text default '',
  status            text default '',
  short_description text default '',
  description       text default '',
  history           text default '',
  image             text default '',
  character_ids     text[] default '{}',
  gallery           text[] default '{}',
  sort_order        int   default 0,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- Clans -------------------------------------------------------------------
create table public.clans (
  id           text primary key,
  name         text default '',
  canon        text default 'draft',
  emblem       text default '',
  description  text default '',
  history      text default '',
  residence    text default '',
  location_ids text[] default '{}',
  member_ids   text[] default '{}',
  sort_order   int   default 0,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- Chronologie ---------------------------------------------------------------
create table public.events (
  id            text primary key,
  title         text default '',
  date_rp       text default '',
  sort_order    int  default 0,
  description   text default '',
  character_ids text[] default '{}',
  location_ids  text[] default '{}',
  image         text default '',
  importance    text default '',                 -- majeur | mineur ...
  tags          text[] default '{}',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Archives RP -------------------------------------------------------------
create table public.archives (
  id            text primary key,
  arc           text default '',
  title         text default '',
  date_rp       text default '',
  character_ids text[] default '{}',
  location_ids  text[] default '{}',
  body          text default '',                 -- texte RP — ne jamais réécrire sans demande
  sort_order    int  default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 2. updated_at automatique
-- ----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['characters','locations','clans','events','archives']
  loop
    execute format(
      'create trigger trg_touch_%1$s before update on public.%1$s
       for each row execute function public.touch_updated_at();', t);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 3. Row Level Security : lecture publique, écriture admin seulement
-- ----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'characters','character_relations','locations','clans','events','archives'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);

    execute format(
      'create policy "%1$s_read_all" on public.%1$s
       for select using (true);', t);

    execute format(
      'create policy "%1$s_write_admin" on public.%1$s
       for all using (public.is_admin()) with check (public.is_admin());', t);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 4. Stockage des images
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "media_read_all"   on storage.objects;
drop policy if exists "media_write_admin" on storage.objects;

create policy "media_read_all" on storage.objects
  for select using (bucket_id = 'media');

create policy "media_write_admin" on storage.objects
  for all
  using (bucket_id = 'media' and public.is_admin())
  with check (bucket_id = 'media' and public.is_admin());
