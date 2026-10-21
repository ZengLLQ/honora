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
    filter.search || filter.month || filter.from_date || filter.to_date
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filter, search: e.target.value });
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    // If month is selected, clear custom date range to avoid contradictory filters
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
      month: undefined, // Clear month preset when custom date range is used
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
    <div className="py-6 border-b border-editorial-border bg-ivory/50">
      <div className="max-w-page mx-auto px-6 lg:px-12">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Search by Student Name */}
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 text-editorial-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search student name..."
              value={filter.search || ''}
              onChange={handleSearchChange}
              className="w-full bg-white border border-editorial-border text-nearblack pl-10 pr-9 py-2.5 text-xs font-medium placeholder:text-editorial-muted/70 editorial-focus transition-all rounded-none"
            />
            {filter.search && (
              <button
                onClick={() => onChange({ ...filter, search: undefined })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-editorial-muted hover:text-nearblack p-0.5"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters: Month Selector & Custom Date Range */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Month Filter */}
            <div className="relative min-w-[170px]">
              <select
                value={filter.month || ''}
                onChange={handleMonthChange}
                aria-label="Filter by month"
                className="w-full bg-white border border-editorial-border text-nearblack px-3 py-2.5 text-xs font-mono tracking-wide editorial-focus appearance-none rounded-none cursor-pointer pr-8"
              >
                <option value="">All Months</option>
                {availableMonths.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <Calendar className="w-3.5 h-3.5 text-editorial-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Custom Date Range */}
            <div className="flex items-center gap-1.5 bg-white border border-editorial-border px-2 py-1">
              <span className="text-[10px] font-mono tracking-wider text-editorial-muted uppercase px-1">
                FROM
              </span>
              <input
                type="date"
                value={filter.from_date || ''}
                onChange={handleFromDateChange}
                aria-label="From date"
                className="bg-transparent text-nearblack text-xs font-mono py-1 px-1.5 outline-none"
              />
              <span className="text-[10px] font-mono tracking-wider text-editorial-muted uppercase px-1">
                TO
              </span>
              <input
                type="date"
                value={filter.to_date || ''}
                onChange={handleToDateChange}
                aria-label="To date"
                className="bg-transparent text-nearblack text-xs font-mono py-1 px-1.5 outline-none"
              />
            </div>

            {/* Reset Button */}
            {isFiltered && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-mono tracking-wider uppercase text-editorial-muted hover:text-nearblack border border-editorial-border hover:border-nearblack transition-colors bg-white rounded-none"
                title="Reset active filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
