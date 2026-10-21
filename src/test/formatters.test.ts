import { describe, it, expect } from 'vitest';
import {
  formatIDR,
  parseIDRInput,
  formatDateDisplay,
  formatBytes,
  getAvailableMonths,
} from '../utils/formatters';
import { PaymentRecord } from '../types/payment';

describe('formatters', () => {
  describe('formatIDR', () => {
    it('formats positive integer IDR correctly', () => {
      expect(formatIDR(1250000)).toBe('Rp 1.250.000');
      expect(formatIDR(500000)).toBe('Rp 500.000');
      expect(formatIDR(15000000)).toBe('Rp 15.000.000');
    });

    it('handles zero correctly', () => {
      expect(formatIDR(0)).toBe('Rp 0');
    });

    it('handles negative amounts', () => {
      expect(formatIDR(-50000)).toBe('-Rp 50.000');
    });

    it('rounds non-integers safely', () => {
      expect(formatIDR(1250000.75)).toBe('Rp 1.250.001');
    });
  });

  describe('parseIDRInput', () => {
    it('parses formatted string with dots', () => {
      expect(parseIDRInput('1.250.000')).toBe(1250000);
      expect(parseIDRInput('Rp 750.000')).toBe(750000);
      expect(parseIDRInput('10000')).toBe(10000);
    });

    it('returns 0 for empty or invalid strings', () => {
      expect(parseIDRInput('')).toBe(0);
      expect(parseIDRInput('abc')).toBe(0);
      expect(parseIDRInput('  ')).toBe(0);
    });
  });

  describe('formatDateDisplay', () => {
    it('formats YYYY-MM-DD into editorial uppercase format', () => {
      expect(formatDateDisplay('2026-10-21')).toBe('21 OCT 2026');
      expect(formatDateDisplay('2026-01-05')).toBe('05 JAN 2026');
      expect(formatDateDisplay('2026-12-31')).toBe('31 DEC 2026');
    });

    it('handles invalid format gracefully', () => {
      expect(formatDateDisplay('')).toBe('');
      expect(formatDateDisplay('invalid')).toBe('invalid');
    });
  });

  describe('formatBytes', () => {
    it('formats bytes into KB and MB', () => {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(1024)).toBe('1.0 KB');
      expect(formatBytes(820 * 1024)).toBe('820 KB');
      expect(formatBytes(4.2 * 1024 * 1024)).toBe('4.2 MB');
    });
  });

  describe('getAvailableMonths', () => {
    it('extracts unique sorted months in descending order', () => {
      const records: PaymentRecord[] = [
        {
          id: '1',
          student_name: 'A',
          payment_date: '2026-10-15',
          amount_idr: 100,
          created_at: '',
          updated_at: '',
        },
        {
          id: '2',
          student_name: 'B',
          payment_date: '2026-09-20',
          amount_idr: 200,
          created_at: '',
          updated_at: '',
        },
        {
          id: '3',
          student_name: 'C',
          payment_date: '2026-10-01',
          amount_idr: 300,
          created_at: '',
          updated_at: '',
        },
      ];

      const months = getAvailableMonths(records);
      expect(months).toEqual([
        { value: '2026-10', label: 'October 2026' },
        { value: '2026-09', label: 'September 2026' },
      ]);
    });
  });
});
