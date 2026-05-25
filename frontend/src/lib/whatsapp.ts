import type { Activity, Contact } from '../types';

type ShareableContact = Pick<Contact, 'phone' | 'whatsapp'>;

export function buildPropertySearchMessage(activity: Pick<Activity, 'externalUrl' | 'whatsappComment'>) {
  return [activity.whatsappComment, activity.externalUrl].filter(Boolean).join('\n\n');
}

export function getContactWhatsappPhone(contact: ShareableContact) {
  return contact.whatsapp || contact.phone || '';
}

export function buildWhatsAppShareUrl(contact: ShareableContact, message: string) {
  const normalizedPhone = getContactWhatsappPhone(contact).replace(/\D/g, '');
  const params = new URLSearchParams({
    text: message,
  });

  if (normalizedPhone) {
    params.set('phone', normalizedPhone);
  }

  params.set('type', 'phone_number');
  params.set('app_absent', '0');

  return `https://web.whatsapp.com/send?${params.toString()}`;
}
