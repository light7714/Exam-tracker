create extension if not exists pgcrypto;

create table if not exists daily_entries (
  entry_date date primary key,
  notes_html text not null default '',
  font_scale text not null default 'md' check (font_scale in ('sm', 'md', 'lg')),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists mock_tests (
  id uuid primary key default gen_random_uuid(),
  test_date date not null,
  label varchar(10),
  physics integer not null check (physics >= 0 and physics <= 180),
  chemistry integer not null check (chemistry >= 0 and chemistry <= 180),
  zoology integer not null check (zoology >= 0 and zoology <= 180),
  botany integer not null check (botany >= 0 and botany <= 180),
  total integer not null check (total >= 0),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists mock_tests_test_date_idx on mock_tests (test_date);

create table if not exists revision_chapters (
  id uuid primary key default gen_random_uuid(),
  subject text not null check (subject in ('physics', 'chemistry', 'zoology', 'botany')),
  title text not null,
  status text not null default 'not-started' check (status in ('not-started', 'in-progress', 'done')),
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists revision_chapters_subject_idx on revision_chapters (subject, sort_order, created_at);

create table if not exists revision_units (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references revision_chapters(id) on delete cascade,
  title text not null,
  status text not null default 'not-started' check (status in ('not-started', 'in-progress', 'done')),
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists revision_units_chapter_idx on revision_units (chapter_id, sort_order, created_at);

create table if not exists revision_chapter_notes (
  chapter_id uuid primary key references revision_chapters(id) on delete cascade,
  notes_html text not null default '',
  weak_points jsonb not null default '[]'::jsonb,
  formulas jsonb not null default '[]'::jsonb,
  mistakes jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists revision_unit_notes (
  unit_id uuid primary key references revision_units(id) on delete cascade,
  notes_html text not null default '',
  weak_points jsonb not null default '[]'::jsonb,
  formulas jsonb not null default '[]'::jsonb,
  mistakes jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);
