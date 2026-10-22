import React, { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface StudentComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
  id?: string;
  name?: string;
}

export const StudentCombobox: React.FC<StudentComboboxProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Student name',
  required = false,
  autoFocus = false,
  disabled = false,
  id,
  name,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const trimmedQuery = value.trim().toLowerCase();

  // Filter options based on typed input
  const filteredOptions = options.filter((opt) => {
    if (!trimmedQuery) return true;
    return opt.toLowerCase().includes(trimmedQuery);
  });

  const isExactMatch = options.some(
    (opt) => opt.toLowerCase() === trimmedQuery
  );
  const showNewStudentHint = Boolean(trimmedQuery && !isExactMatch);

  const handleSelect = (selectedName: string) => {
    onChange(selectedName);
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(filteredOptions.length > 0 ? 0 : -1);
      } else if (filteredOptions.length > 0) {
        setHighlightedIndex((prev) => (prev + 1) % filteredOptions.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(filteredOptions.length > 0 ? filteredOptions.length - 1 : -1);
      } else if (filteredOptions.length > 0) {
        setHighlightedIndex((prev) =>
          prev <= 0 ? filteredOptions.length - 1 : prev - 1
        );
      }
    } else if (e.key === 'Enter') {
      if (isOpen && highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        e.preventDefault();
        handleSelect(filteredOptions[highlightedIndex]);
      }
      // If not navigating dropdown, let normal form submit proceed
    } else if (e.key === 'Escape') {
      if (isOpen) {
        e.stopPropagation();
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    } else if (e.key === 'Tab') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const hasDropdownContent = filteredOptions.length > 0 || showNewStudentHint;

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          id={id}
          name={name}
          required={required}
          autoFocus={autoFocus}
          disabled={disabled}
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => {
            if (options.length > 0 || showNewStudentHint) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={isOpen ? listboxId : undefined}
          aria-autocomplete="list"
          className="w-full bg-heron-surface border border-heron-border px-3.5 py-2.5 pr-10 text-sm font-sans text-heron-primary placeholder:text-heron-tertiary/60 focus:border-heron-brand focus:outline-none transition-colors"
        />

        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => {
            setIsOpen((prev) => !prev);
            inputRef.current?.focus();
          }}
          aria-label="Toggle student suggestions list"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-heron-tertiary hover:text-heron-primary cursor-pointer transition-colors"
        >
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-heron-brand' : 'text-heron-tertiary'
            }`}
          />
        </button>
      </div>

      {/* Suggestion Dropdown Popover */}
      {isOpen && hasDropdownContent && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1 z-50 bg-heron-surface border border-heron-border shadow-xl max-h-52 overflow-y-auto"
        >
          {filteredOptions.length > 0 ? (
            <ul className="divide-y divide-heron-border/40 py-1">
              {filteredOptions.map((opt, idx) => {
                const isSelected = opt.toLowerCase() === trimmedQuery;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <li
                    key={opt}
                    role="option"
                    aria-selected={isSelected || isHighlighted}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(opt);
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`px-3.5 py-2.5 text-xs sm:text-sm font-sans flex items-center justify-between cursor-pointer transition-colors ${
                      isHighlighted
                        ? 'bg-heron-brand/10 text-heron-brand font-medium'
                        : isSelected
                        ? 'bg-heron-surface text-heron-primary font-semibold'
                        : 'text-heron-primary hover:bg-heron-brand/5'
                    }`}
                  >
                    <span className="truncate">{opt}</span>
                    {isSelected && (
                      <Check className="w-4 h-4 text-heron-brand shrink-0 ml-2" />
                    )}
                  </li>
                );
              })}
            </ul>
          ) : null}

          {showNewStudentHint && (
            <div className="px-3.5 py-2 text-xs font-sans text-heron-secondary border-t border-heron-border/60 bg-heron-bg/60 flex items-center justify-between">
              <span className="truncate mr-2">
                New student: <strong className="text-heron-primary">"{value.trim()}"</strong>
              </span>
              <span className="shrink-0 text-[10px] font-sans font-semibold uppercase tracking-wider text-heron-brand bg-heron-brand/10 px-1.5 py-0.5 border border-heron-brand/20">
                Auto-saves
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentCombobox;
