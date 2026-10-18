export const LOAN_RATES = {
  1: 3,  // 1 week = 3%
  2: 5,  // 2 weeks = 5%
  4: 10, // 4 weeks = 10%
};

export function getQuote(amount: number, weeks: 1 | 2 | 4, acceptDate: Date = new Date()) {
  const rate = LOAN_RATES[weeks];
  const fee = Math.round(amount * 0.05); // 5% fee
  const payout = amount - fee;           // Member gets 95%
  const interest = Math.round(amount * (rate / 100));
  const repayTotal = amount + interest;  // Repays full amount + interest
  
  // Calculate due date
  const due = new Date(acceptDate.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);
  
  return {
    amount,
    rate,
    fee,
    payout,
    interest,
    repayTotal,
    dueDate: due.toISOString().split('T')[0]
  };
}