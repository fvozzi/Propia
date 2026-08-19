import { useMemo, useState } from 'react';
import type { Contact } from '../types';
import { SearchableCombobox } from './SearchableCombobox';

type ContactComboboxProps = {
  contacts: Contact[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  emptyLabel: string;
  loadingLabel: string;
  noResultsLabel: string;
  required?: boolean;
  disabled?: boolean;
  loading?: boolean;
  name?: string;
};

export function ContactCombobox({
  contacts,
  value,
  onChange,
  placeholder,
  emptyLabel,
  loadingLabel,
  noResultsLabel,
  required = false,
  disabled = false,
  loading = false,
  name,
}: ContactComboboxProps) {
  const [searchValue, setSearchValue] = useState('');

  const filteredContacts = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();

    if (!normalizedSearch) {
      return contacts;
    }

    return contacts.filter((contact) =>
      [
        contact.displayName,
        contact.email ?? '',
        contact.phone ?? '',
        contact.whatsapp ?? '',
      ].some((value) => value.toLowerCase().includes(normalizedSearch)),
    );
  }, [contacts, searchValue]);

  return (
    <>
      <SearchableCombobox
        value={value}
        options={filteredContacts.map((contact) => ({
          value: String(contact.id),
          label: contact.displayName,
        }))}
        searchValue={searchValue}
        onSearchValueChange={setSearchValue}
        onChange={onChange}
        placeholder={placeholder}
        emptyLabel={emptyLabel}
        loadingLabel={loadingLabel}
        noResultsLabel={noResultsLabel}
        required={required}
        disabled={disabled}
        loading={loading}
      />
      {name ? <input type="hidden" name={name} value={value} /> : null}
    </>
  );
}
