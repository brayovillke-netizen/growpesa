begin;

create table if not exists settings (
  key         text primary key,
  value       jsonb not null,
  updated_by  bigint,
  updated_at  timestamptz not null default now()
);

create table if not exists members (
  id             bigserial primary key,
  name           text not null,
  phone          text unique not null,
  join_date      date not null default current_date,
  status         text not null default 'active' check (status in ('active','inactive','left')),
  is_18          boolean not null default false,
  referrer_id    bigint references members(id),
  referral_code  text unique not null,
  referral_paid  boolean not null default false,
  behind_streak  int not null default 0,
  created_at     timestamptz not null default now()
);

create table if not exists savings (
  id          bigserial primary key,
  member_id   bigint not null references members(id),
  amount      int not null check (amount > 0),
  week_date   date not null,
  kind        text not null default 'save' check (kind in ('save','referral')),
  code        text,
  status      text not null default 'pending' check (status in ('pending','confirmed','void')),
  note        text,
  entered_by  bigint references members(id),
  created_at  timestamptz not null default now()
);
create unique index if not exists savings_code_uniq on savings(code) where code is not null;

create table if not exists loans (
  id             bigserial primary key,
  member_id      bigint not null references members(id),
  amount         int not null check (amount > 0),
  weeks          int not null check (weeks in (1,2,4)),
  rate_pct       int not null,
  fee            int not null,
  payout         int not null,
  interest       int not null,
  repay_total    int not null,
  paid           int not null default 0,
  late_charge    int not null default 0,
  due_date       date not null,
  status         text not null default 'asked' check (status in ('asked','declined','approved','accepted','paid_out','closed')),
  reason         text,
  decline_note   text,
  accepted_at    timestamptz,
  sent_at        timestamptz,
  receipt        text,
  created_at     timestamptz not null default now()
);
create unique index if not exists loans_one_open on loans(member_id) where status in ('asked','approved','accepted','paid_out');

create table if not exists repayments (
  id         bigserial primary key,
  loan_id    bigint not null references loans(id),
  amount     int not null check (amount > 0),
  code       text unique,
  paid_at    timestamptz not null default now()
);

create table if not exists referrals (
  id           bigserial primary key,
  referrer_id  bigint not null references members(id),
  invited_id   bigint not null unique references members(id),
  credited_at  timestamptz,
  created_at   timestamptz not null default now()
);

create table if not exists shareout (
  id         bigserial primary key,
  member_id  bigint not null references members(id),
  saved      int not null,
  owed       int not null,
  fee        int not null,
  net        int not null,
  code       text unique,
  sent_at    timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists audit (
  id       bigserial primary key,
  actor    bigint references members(id),
  action   text not null,
  target   text,
  before   jsonb,
  after    jsonb,
  at       timestamptz not null default now()
);

commit;