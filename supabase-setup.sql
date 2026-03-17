create table if not exists public.workout_app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.workout_app_state enable row level security;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

DROP TRIGGER IF EXISTS workout_app_state_set_updated_at ON public.workout_app_state;
create trigger workout_app_state_set_updated_at
before update on public.workout_app_state
for each row
execute function public.set_updated_at();

DROP POLICY IF EXISTS "Users can view own workout state" ON public.workout_app_state;
create policy "Users can view own workout state"
on public.workout_app_state
for select
using (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own workout state" ON public.workout_app_state;
create policy "Users can insert own workout state"
on public.workout_app_state
for insert
with check (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own workout state" ON public.workout_app_state;
create policy "Users can update own workout state"
on public.workout_app_state
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
