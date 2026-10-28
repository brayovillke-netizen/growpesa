/**
 * TibaPay Graduated Withdrawal Fee (GWF v6) Engine
 * Calculates exact fees based on total daily aggregated cashout amounts.
 */
export function calculateGWF(amount: number): number {
  if (amount < 50) {
    throw new Error('Minimum withdrawal amount is KSh 50')
  }

  if (amount <= 100) return 10
  if (amount <= 500) return 25
  if (amount <= 1000) return 30
  if (amount <= 1500) return 30
  if (amount <= 3000) return 40
  if (amount <= 5000) return 45
  if (amount <= 10000) return 65
  if (amount <= 20000) return 80
  if (amount <= 50000) return 100
  if (amount <= 100000) return 125

  // Above KSh 100,000: 0.25% of amount (minimum KSh 125)
  const percentageFee = Math.ceil(amount * 0.0025)
  return Math.max(percentageFee, 125)
}

/**
 * Calculates complete withdrawal breakdown showing GWF, NCBA Till costs, and net cash out.
 */
export function getWithdrawalBreakdown(amount: number) {
  const gwfFee = calculateGWF(amount)
  const netAmount = amount - gwfFee

  return {
    grossAmount: amount,
    gwfFee,
    netAmount,
    effectiveRatePct: Number(((gwfFee / amount) * 100).toFixed(2)),
  }
}
