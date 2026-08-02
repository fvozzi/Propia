import { KeyboardEvent, useEffect, useId, useRef, useState } from 'react';

type ComboboxOption = {
  value: string;
  label: string;
};

type SearchableComboboxProps = {
  value: string;
  options: ComboboxOption[];
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  onChange: (value: string) => void;
  placeholder: string;
  emptyLabel: string;
  loadingLabel: string;
  noResultsLabel: string;
  required?: boolean;
  disabled?: boolean;
  loading?: boolean;
};

export function SearchableCombobox({
  value,
  options,
  searchValue,
  onSearchValueChange,
  onChange,
  placeholder,
  emptyLabel,
  loadingLabel,
  noResultsLabel,
  required = false,
  disabled = false,
  loading = false,
}: SearchableComboboxProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listboxId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const selectedOption = options.find((option) => option.value === value) ?? null;
  const availableOptions = [{ value: '', label: emptyLabel }, ...options];
  const displayValue = isOpen
    ? searchValue
    : searchValue || selectedOption?.label || (value ? '' : emptyLabel);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        onSearchValueChange('');
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isOpen, onSearchValueChange]);

  useEffect(() => {
    if (!isOpen) {
      setHighlightedIndex(0);
      return;
    }

    const selectedIndex = availableOptions.findIndex((option) => option.value === value);
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [availableOptions, isOpen, value]);

  function selectOption(nextValue: string) {
    onChange(nextValue);
    onSearchValueChange('');
    setIsOpen(false);
    inputRef.current?.blur();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (disabled) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }

      setHighlightedIndex((current) =>
        Math.min(current + 1, Math.max(availableOptions.length - 1, 0)),
      );
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }

      setHighlightedIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === 'Enter' && isOpen) {
      event.preventDefault();
      const nextOption = availableOptions[highlightedIndex];
      if (nextOption) {
        selectOption(nextOption.value);
      }
      return;
    }

    if (event.key === 'Escape') {
      setIsOpen(false);
      onSearchValueChange('');
    }
  }

  return (
    <div className={`combobox${disabled ? ' disabled' : ''}`} ref={rootRef}>
      <div className={`combobox-control${isOpen ? ' open' : ''}`}>
        <input
          ref={inputRef}
          type="text"
          className="combobox-input"
          value={displayValue}
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            if (!isOpen) {
              setIsOpen(true);
            }
            onSearchValueChange(event.target.value);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-haspopup="listbox"
          role="combobox"
          disabled={disabled}
          autoComplete="off"
        />
        <button
          type="button"
          className="combobox-toggle"
          onClick={() => {
            if (disabled) {
              return;
            }

            setIsOpen((current) => {
              const next = !current;
              if (!next) {
                onSearchValueChange('');
              }
              return next;
            });
            inputRef.current?.focus();
          }}
          aria-label={placeholder}
          tabIndex={-1}
        >
          <ChevronIcon />
        </button>
      </div>
      <input
        className="combobox-validation-input"
        tabIndex={-1}
        aria-hidden="true"
        value={value}
        required={required}
        readOnly
      />
      {isOpen ? (
        <div className="combobox-menu" role="listbox" id={listboxId}>
          {availableOptions.map((option, index) => (
            <button
              key={`${option.value}-${option.label}`}
              type="button"
              className={`combobox-option${
                highlightedIndex === index ? ' active' : ''
              }${value === option.value ? ' selected' : ''}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectOption(option.value)}
            >
              {option.label}
            </button>
          ))}
          {loading ? <div className="combobox-status">{loadingLabel}</div> : null}
          {!loading && availableOptions.length === 1 ? (
            <div className="combobox-status">{noResultsLabel}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
