
import type { StoredInvoiceData } from './invoice-types';

const INVOICE_STORAGE_KEY_PREFIX = 'invoiceData_';

export const saveInvoiceData = (invoiceId: string, data: StoredInvoiceData): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`${INVOICE_STORAGE_KEY_PREFIX}${invoiceId}`, JSON.stringify(data));
  }
};

export const getInvoiceData = (invoiceId: string): StoredInvoiceData | null => {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem(`${INVOICE_STORAGE_KEY_PREFIX}${invoiceId}`);
    return data ? JSON.parse(data) : null;
  }
  return null;
};

export const removeInvoiceData = (invoiceId: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(`${INVOICE_STORAGE_KEY_PREFIX}${invoiceId}`);
  }
};
