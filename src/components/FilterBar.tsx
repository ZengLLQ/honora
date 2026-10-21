import React from 'react';
import { Search, X, RotateCcw, Calendar } from 'lucide-react';
import type { RecordFilter } from '../types/payment';

interface FilterBarProps {
  filter: RecordFilter;
  onChange: (filter: RecordFilter) => void;
  availableMonths: { value: string; label: string }[];
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filter,
  onChange,
  availableMonths,
}) => {
  const isFiltered = Boolean(
    filter.search?.trim() ||
    filter.month?.trim() ||
    filter.from_date?.trim() ||
    filter.to_date?.trim()
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filter, search: e.target.value });
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({
      ...filter,
      month: e.target.value || undefined,
      from_date: undefined,
      to_date: undefined,
    });
  };

  const handleFromDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...filter,
      from_date: e.target.value || undefined,
      month: undefined,
    });
  };

  const handleToDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...filter,
      to_date: e.target.value || undefined,
      month: undefined,
    });
  };

  const handleReset = () => {
    onChange({});
  };

  return (
    <div className="py-4 border-b border-heron-border bg-heron-bg/80">
      <div className="max-w-page mx-auto px-6 lg:px-12">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4">
          {/* Search by Student Name */}
          <div className="relative flex-1 max-w-lg">
            <Search className="w-3.5 h-3.5 text-heron-tertiary absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search student name..."
              aria-label="Search student name"
              value={filter.search || ''}
              onChange={handleSearchChange}
              className="w-full bg-heron-surface border border-heron-border text-heron-primary pl-9 pr-8 py-2 text-xs font-sans placeholder:text-heron-tertiary/70 focus:border-heron-brand focus:outline-none transition-colors"
            />
            {filter.search && (
              <button
                onClick={() => onChange({ ...filter, search: undefined })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-heron-tertiary hover:text-heron-primary p-1 transition-colors"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters: Month Selector & Custom Date Range */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Month Filter */}
            <div className="relative min-w-[160px]">
              <select
                value={filter.month || ''}
                onChange={handleMonthChange}
                aria-label="Filter by month"
                className="w-full bg-heron-surface border border-heron-border text-heron-primary px-3 py-2 text-xs font-sans tracking-wide focus:border-heron-brand focus:outline-none appearance-none cursor-pointer pr-8 transition-colors"
              >
                <option value="">All Months</option>
                {availableMonths.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <Calendar className="w-3.5 h-3.5 text-heron-tertiary absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Custom Date Range */}
            <div className="flex items-center bg-heron-surface border border-heron-border px-2 py-1">
              <span className="text-[10px] font-sans tracking-wider text-heron-tertiary uppercase px-1 font-medium">
                FROM
              </span>
              <input
                type="date"
                value={filter.from_date || ''}
                onChange={handleFromDateChange}
                aria-label="From date"
                className="bg-transparent text-heron-primary text-xs font-sans py-0.5 px-1 outline-none"
              />
              <span className="text-[10px] font-sans tracking-wider text-heron-tertiary uppercase px-1 border-l border-heron-border-subtle font-medium">
                TO
              </span>
              <input
                type="date"
                value={filter.to_date || ''}
                onChange={handleToDateChange}
                aria-label="To date"
                className="bg-transparent text-heron-primary text-xs font-sans py-0.5 px-1 outline-none"
              />
            </div>

            {/* Reset Button */}
            {isFiltered && (
              <button
                onClick={handleReset}
                className="btn-heron flex items-center gap-1.5 px-3 py-2 text-xs font-sans font-medium tracking-wider uppercase text-heron-secondary hover:text-white bg-heron-surface hover:bg-heron-primary border border-heron-border hover:border-heron-primary transition-all duration-200 cursor-pointer shadow-sm"
                title="Reset active filters"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
