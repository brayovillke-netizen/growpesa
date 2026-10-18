export const DEFAULTS = {
  weekly_goal: 100,
  borrow_limit_pct: 25,
  shareout_date: '2026-12-27',
  min_weeks_in_group: 4,
  min_savings: 400,
};

// 1. How many Sundays have passed since they joined?
export function sundaysSince(joinDate: string | Date): number {
  const join = new Date(joinDate);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - join.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7);
}

// 2. What is their cumulative goal by now?
export function getGoal(sundays: number): number {
  return sundays * DEFAULTS.weekly_goal;
}

// 3. How much are they behind?
export function getBehind(saved: number, goal: number): number {
  return Math.max(0, goal - saved);
}

// 4. How much can they borrow? (25% of savings)
export function getBorrowLimit(saved: number): number {
  return Math.floor(saved * (DEFAULTS.borrow_limit_pct / 100));
}

// 5. How many Sundays until the share-out?
export function sundaysToShareout(): number {
  const end = new Date(DEFAULTS.shareout_date);
  const today = new Date();
  const diffTime = end.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, Math.floor(diffDays / 7));
}