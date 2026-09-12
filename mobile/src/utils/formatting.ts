export function formatINR(amount: number): string {
  // Indian number system: 1,00,000
  const num = Number(amount || 0);
  const hasDecimals = num % 1 !== 0;
  return num.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  });
}

export const formatCurrency = formatINR;

export function formatPercentage(value: number | string | null | undefined, decimals: number = 1): string {
  if (value === undefined || value === null) return '0.0%';
  const num = Number(value);
  if (isNaN(num)) return '0.0%';
  return `${num.toFixed(decimals)}%`;
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

