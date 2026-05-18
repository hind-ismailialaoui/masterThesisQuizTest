create extension if not exists pgcrypto;

create table if not exists public.sessions (
  session_id text primary key,
  user_name text not null,
  group_number integer,
  is_aware boolean default false,
  is_weakened boolean default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.quiz_results (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references public.sessions(session_id) on delete cascade,
  user_name text not null,
  question_number integer not null,
  user_answer text not null,
  correct text not null,
  used_ia text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ai_interactions (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references public.sessions(session_id) on delete cascade,
  user_name text not null,
  question_number integer,
  user_input text not null,
  ia_answer text not null,
  time_spent text not null,
  forced_answer text,
  forced_answer_index integer,
  prompt_tokens integer,
  completion_tokens integer,
  total_tokens integer,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tcs_results (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references public.sessions(session_id) on delete cascade,
  user_name text not null,
  item_id text not null,
  statement text not null,
  value integer not null,
  label text not null,
  submitted_at timestamptz not null default timezone('utc', now())
);

create index if not exists quiz_results_session_id_idx
  on public.quiz_results(session_id);

create index if not exists ai_interactions_session_id_idx
  on public.ai_interactions(session_id);

create index if not exists tcs_results_session_id_idx
  on public.tcs_results(session_id);
