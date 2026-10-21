import type { PaymentRecord } from '../types/payment';

/**
 * Format integer IDR to Indonesian Rupiah currency format.
 * Example: 1250000 -> "Rp 1.250.000"
 */
export function formatIDR(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return 'Rp 0';
  }
  const rounded = Math.round(amount);
  const formatted = Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return rounded < 0 ? `-Rp ${formatted}` : `Rp ${formatted}`;
}

/**
 * Parse a raw user input string into an integer IDR number.
 * Example: "1.250.000" -> 1250000
 */
export function parseIDRInput(raw: string): number {
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return 0;
  const parsed = parseInt(digits, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format date string (YYYY-MM-DD) to editorial format: "21 OCT 2026"
 */
export function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  const monthNames = [
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
  ];
  const mIndex = parseInt(month, 10) - 1;
  const monthLabel = monthNames[mIndex] || month;
  return `${day} ${monthLabel} ${year}`;
}

/**
 * Format bytes to readable human unit: 4.2 MB, 820 KB, 120 B
 */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val < 10 ? val.toFixed(1) : Math.round(val)} ${units[i]}`;
}

/**
 * Extract unique months from records in format YYYY-MM with readable labels
 */
export function getAvailableMonths(records: PaymentRecord[]): { value: string; label: string }[] {
  const monthSet = new Set<string>();
  for (const r of records) {
    if (r.payment_date && r.payment_date.length >= 7) {
      monthSet.add(r.payment_date.substring(0, 7));
    }
  }

  const sorted = Array.from(monthSet).sort().reverse();
  const monthFullNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  return sorted.map((ym) => {
    const [y, m] = ym.split('-');
    const mIdx = parseInt(m, 10) - 1;
    const name = monthFullNames[mIdx] || m;
    return {
      value: ym,
      label: `${name} ${y}`,
    };
  });
}
