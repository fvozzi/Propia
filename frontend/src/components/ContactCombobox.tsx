import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../lib/api';
import type { Contact } from '../types';
import type { Paginated } from '../types';
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
  remoteSearch?: boolean;
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
  remoteSearch = false,
}: ContactComboboxProps) {
  const [searchValue, setSearchValue] = useState('');
  const [knownContacts, setKnownContacts] = useState<Contact[]>(contacts);
  const [remoteMatches, setRemoteMatches] = useState<Contact[] | null>(null);
  const [remoteLoading, setRemoteLoading] = useState(false);

  const normalizedSearch = searchValue.trim().toLowerCase();
  const selectedContact =
    knownContacts.find((contact) => String(contact.id) === value) ??
    remoteMatches?.find((contact) => String(contact.id) === value) ??
    null;

  useEffect(() => {
    setKnownContacts((current) => mergeContacts(current, contacts));
  }, [contacts]);

  useEffect(() => {
    if (!remoteSearch || !normalizedSearch) {
      setRemoteMatches(null);
      setRemoteLoading(false);
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      setRemoteLoading(true);
      void apiRequest<Paginated<Contact>>(
        `/contacts?page=1&limit=100&sortBy=DISPLAY_NAME&sortDirection=ASC&search=${encodeURIComponent(normalizedSearch)}`,
      )
        .then((response) => {
          if (cancelled) {
            return;
          }

          setRemoteMatches(response.items);
          setKnownContacts((current) => mergeContacts(current, response.items));
        })
        .catch(() => {
          if (cancelled) {
            return;
          }

          setRemoteMatches([]);
        })
        .finally(() => {
          if (cancelled) {
            return;
          }

          setRemoteLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [normalizedSearch, remoteSearch]);

  const filteredContacts = useMemo(() => {
    if (remoteSearch && normalizedSearch) {
      return mergeContacts(remoteMatches ?? [], selectedContact ? [selectedContact] : []);
    }

    if (!normalizedSearch) {
      return mergeContacts(knownContacts, selectedContact ? [selectedContact] : []);
    }

    return knownContacts.filter((contact) =>
      [
        contact.displayName,
        contact.email ?? '',
        contact.phone ?? '',
        contact.whatsapp ?? '',
      ].some((value) => value.toLowerCase().includes(normalizedSearch)),
    );
  }, [knownContacts, normalizedSearch, remoteMatches, remoteSearch, selectedContact]);

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
        loading={loading || remoteLoading}
      />
      {name ? <input type="hidden" name={name} value={value} /> : null}
    </>
  );
}

function mergeContacts(...groups: Array<Contact[] | null | undefined>) {
  const uniqueContacts = new Map<number, Contact>();

  groups.forEach((group) => {
    group?.forEach((contact) => {
      uniqueContacts.set(contact.id, contact);
    });
  });

  return Array.from(uniqueContacts.values()).sort((left, right) =>
    left.displayName.localeCompare(right.displayName, 'es', { sensitivity: 'base' }),
  );
}
