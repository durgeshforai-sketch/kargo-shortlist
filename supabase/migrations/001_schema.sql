-- Kargo Shortlist schema
-- Personal details and CV content live in separate columns: only cv_content is ever sent to the AI.

create extension if not exists pgcrypto;

create table if not exists rubric_criteria (
  code        text primary key,               -- e.g. PM1, SPM3
  role        text not null check (role in ('PM','SPM')),
  name        text not null,
  weight      int  not null check (weight > 0 and weight <= 100),
  description text not null,
  position    int  not null
);

create table if not exists rubric_document (
  id         int primary key default 1 check (id = 1),
  body       text not null,
  updated_at timestamptz not null default now()
);

create table if not exists candidates (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  applied_role  text not null check (applied_role in ('PM','SPM')),
  file_name     text not null,

  -- personal details: stay in Supabase, never enter Gemini
  full_name     text,
  email         text,
  phone         text,
  links         text[] not null default '{}',

  -- anonymised CV content: the only thing the AI sees
  cv_content    text not null,
  content_hash  text not null,

  status        text not null default 'processing' check (status in ('processing','scored','error')),
  error         text,

  -- AI extraction
  headline      text,
  years_total   numeric,
  years_product numeric,
  domains       text[] not null default '{}',
  closest_hire  text,
  closest_hire_reason text,
  red_flags     text[] not null default '{}',

  -- weighted totals (computed in code from criterion scores)
  pm_score      numeric,
  spm_score     numeric,

  duplicate_of  uuid references candidates(id) on delete set null,

  -- review outputs
  tier          text check (tier in ('interview','decline')),
  tier_source   text not null default 'system' check (tier_source in ('system','founder')),
  brief         text,
  email_kind    text check (email_kind in ('invite','rejection')),
  email_subject text,
  email_body    text,
  email_status  text not null default 'none' check (email_status in ('none','draft','sent','failed')),
  email_error   text,
  sent_to       text,
  sent_at       timestamptz,
  resend_id     text
);

create index if not exists candidates_role_idx on candidates (applied_role);
create index if not exists candidates_hash_idx on candidates (content_hash);

create table if not exists criterion_scores (
  candidate_id uuid not null references candidates(id) on delete cascade,
  code         text not null references rubric_criteria(code),
  score        int  not null check (score between 0 and 5),
  evidence     text,
  evidence_verified boolean not null default false,
  reasoning    text not null,
  primary key (candidate_id, code)
);

create table if not exists activity (
  id           bigserial primary key,
  at           timestamptz not null default now(),
  candidate_id uuid references candidates(id) on delete cascade,
  kind         text not null,
  detail       text
);

-- RLS on with no policies: the public anon key can read nothing. The server uses the service-role key.
alter table rubric_criteria  enable row level security;
alter table rubric_document  enable row level security;
alter table candidates       enable row level security;
alter table criterion_scores enable row level security;
alter table activity         enable row level security;
