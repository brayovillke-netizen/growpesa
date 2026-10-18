import postgres from 'postgres';
const url = process.env.DATABASE_URL;
const sql = postgres(url, { max: 1, prepare: false });

const defaults = {
  weekly_goal: 100,
  inactive_behind: 500,
  inactive_weeks: 5,
  min_weeks_in_group: 4,
  min_savings: 400,
  borrow_limit_pct: 50,
  max_open_loans: 1,
  loan_fee_pct: 5,
  interest_1wk: 3,
  interest_2wk: 5,
  interest_4wk: 10,
  late_charge_pct: 2,
  late_cap_pct: 10,
  auto_approve_max: 1000,
  auto_approve_pool_pct: 30,
  b2c_min: 200,
  referral_reward: 3,
  referral_monthly_cap: 20,
  reserve: 1000,
  shareout_date: '2026-12-27',
  shareout_fee_pct: 5,
  support_phone: '0700 413 388'
};

for (const [key, value] of Object.entries(defaults)) {
  await sql`
    insert into settings (key, value) 
    values (${key}, ${JSON.stringify(value)})
    on conflict (key) do nothing
  `;
}
console.log('Settings seeded successfully!');
await sql.end();