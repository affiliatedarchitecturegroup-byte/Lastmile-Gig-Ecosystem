/**
 * Shared formatting utilities for the Lastmile Gig platform.
 */

/**
 * Format amount in South African Rand.
 */
export function formatZAR(amount: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format distance in kilometers.
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
}

/**
 * Format estimated delivery time.
 */
export function formatDeliveryTime(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

/**
 * Format ISO timestamp to South African locale.
 */
export function formatDateTime(isoString: string): string {
  return new Intl.DateTimeFormat('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Johannesburg',
  }).format(new Date(isoString));
}

/**
 * Format driver performance score with tier badge.
 */
export function formatDriverScore(score: number): { display: string; tier: string } {
  let tier: string;
  if (score >= 90) tier = 'Elite';
  else if (score >= 75) tier = 'Gold';
  else if (score >= 60) tier = 'Silver';
  else tier = 'Bronze';

  return { display: `${score.toFixed(1)}/100`, tier };
}

/**
 * Truncate text with ellipsis.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

/**
 * Generate a slug from a restaurant/partner name.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Mask sensitive data for logging (POPIA compliance).
 * Never log raw PII - use this function to mask before logging.
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***@***.***';
  const maskedLocal = local.length > 2
    ? `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}`
    : '**';
  return `${maskedLocal}@${domain}`;
}

export function maskPhone(phone: string): string {
  if (phone.length < 4) return '****';
  return `${'*'.repeat(phone.length - 4)}${phone.slice(-4)}`;
}
