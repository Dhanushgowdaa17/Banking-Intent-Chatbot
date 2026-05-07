
export function calculateCashback(amount: number): number {
  const cashback = Math.min(amount * 0.02, 50);
  return parseFloat(cashback.toFixed(2));
}

export function getRewardMessage(cashback: number): string {
  if (cashback <= 0) return "";
  return `You earned ₹${cashback} cashback! 🎁`;
}
