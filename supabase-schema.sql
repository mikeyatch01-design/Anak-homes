-- Anak Homes — Supabase schema
-- Run this once in your Supabase project: Dashboard → SQL Editor → New query → paste → Run.

create table if not exists bookings (
  id            text primary key default gen_random_uuid()::text,
  booking_code  text not null,          -- e.g. "B001" — display id, unique per month per user
  month_key     text not null,          -- "YYYY-MM"
  date_booked   date,
  guest         text not null default '',
  apartment     text not null default '',
  checkin       date,
  checkout      date,
  total         numeric not null default 0,
  host_share    numeric not null default 0,
  commission    numeric not null default 0,
  amount_paid   numeric not null default 0,
  remaining     numeric not null default 0,
  host_paid     text not null default '',   -- kept as text: sheet sometimes has "225000+185000"
  status        text not null default '',   -- '' or "DIDN'T STAY"
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade
);
create index if not exists bookings_user_month_idx on bookings (user_id, month_key);

create table if not exists custom_hosts (
  key       text primary key,
  name      text not null,
  icon      text not null default '',
  keywords  text[] not null default '{}',
  user_id   uuid not null default auth.uid() references auth.users(id) on delete cascade
);

create table if not exists hidden_hosts (
  key      text not null,
  user_id  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  primary key (key, user_id)
);

create table if not exists profile (
  user_id  uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  name     text not null default 'Mike'
);

alter table bookings      enable row level security;
alter table custom_hosts  enable row level security;
alter table hidden_hosts  enable row level security;
alter table profile       enable row level security;

-- One "owns their rows" policy per table — this is the actual security
-- boundary: Postgres refuses the query server-side if the JWT's uid
-- doesn't match, regardless of what the client claims.
create policy "owns bookings"      on bookings      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owns custom_hosts"  on custom_hosts  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owns hidden_hosts"  on hidden_hosts  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owns profile"       on profile       for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
