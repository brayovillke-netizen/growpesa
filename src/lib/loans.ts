/**
 * TibaPay Loan Calculation & Eligibility Engine
 */

export interface MemberStats {
  totalSavings: number
  weeksActive: number
  consecutiveOnTimeRepayments: number
  hasActiveLoan: boolean
  isInactive: boolean
}

export function calculateBorrowingLimit(stats: MemberStats): number {
  if (stats.weeksActive < 4 || stats.totalSavings < 400 || stats.hasActiveLoan || stats.isInactive) {
    return 0
  }

  const baseLimitPct = 0.20 // 20% Base
  
  // Tenure Bonus: +5% for every 12 months (52 weeks), capped at +15%
  const tenureYears = Math.floor(stats.weeksActive / 52)
  const tenureBonusPct = Math.min(tenureYears * 0.05, 0.15)

  // Repayment Bonus: +5% for every 3 on-time repayments, capped at +10%
  const repaymentBonusPct = Math.min(Math.floor(stats.consecutiveOnTimeRepayments / 3) * 0.05, 0.10)

  // Total Percentage capped at 50%
  const totalLimitPct = Math.min(baseLimitPct + tenureBonusPct + repaymentBonusPct, 0.50)

  return Math.floor(stats.totalSavings * totalLimitPct)
}

export function calculateLoanBreakdown(requestedAmount: number, termWeeks: 1 | 2 | 4) {
  const upfrontFee = Number((requestedAmount * 0.05).toFixed(2)) // 5% Flat
  const disbursedAmount = Number((requestedAmount - upfrontFee).toFixed(2)) // 95%

  let interestRatePct = 0.03
  if (termWeeks === 2) interestRatePct = 0.05
  if (termWeeks === 4) interestRatePct = 0.10

  const interestAmount = Number((requestedAmount * interestRatePct).toFixed(2))
  const totalRepayment = Number((requestedAmount + interestAmount).toFixed(2))

  return {
    requestedAmount,
    upfrontFee,
    disbursedAmount,
    interestRatePct: interestRatePct * 100,
    interestAmount,
    totalRepayment,
    effectiveCostPct: Number((((interestAmount + upfrontFee) / requestedAmount) * 100).toFixed(1)),
  }
}

/**
 * Priority Allocation Rule:
 * 1. Late Charges -> 2. Interest -> 3. Principal
 */
export function allocateRepayment(paymentAmount: number, currentLateFee: number, currentInterest: number, currentPrincipal: number) {
  let remaining = paymentAmount

  // 1. Pay Late Fee
  const allocatedLate = Math.min(remaining, currentLateFee)
  remaining -= allocatedLate

  // 2. Pay Interest
  const allocatedInterest = Math.min(remaining, currentInterest)
  remaining -= allocatedInterest

  // 3. Pay Principal
  const allocatedPrincipal = Math.min(remaining, currentPrincipal)
  remaining -= allocatedPrincipal

  return {
    allocatedLate,
    allocatedInterest,
    allocatedPrincipal,
    unallocatedExcess: remaining,
  }
}
