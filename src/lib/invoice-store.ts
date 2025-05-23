
import type { StoredInvoiceData } from './invoice-types';
import { parseISO } from 'date-fns';

const INVOICE_STORAGE_KEY_PREFIX = 'invoiceData_';

export const saveInvoiceData = (invoiceId: string, data: StoredInvoiceData): void => {
  if (typeof window !== 'undefined') {
    // Date objects will be stringified to ISO strings automatically by JSON.stringify
    localStorage.setItem(`${INVOICE_STORAGE_KEY_PREFIX}${invoiceId}`, JSON.stringify(data));
  }
};

export const getInvoiceData = (invoiceId: string): StoredInvoiceData | null => {
  if (typeof window !== 'undefined') {
    const dataString = localStorage.getItem(`${INVOICE_STORAGE_KEY_PREFIX}${invoiceId}`);
    if (!dataString) {
      return null;
    }
    const parsedData = JSON.parse(dataString) as StoredInvoiceData;

    // Convert date strings back to Date objects
    // The type StoredInvoiceData expects Date objects for startDate and endDate
    // due to extending InvoiceFormSchemaType.
    if (parsedData.startDate && typeof parsedData.startDate === 'string') {
      parsedData.startDate = parseISO(parsedData.startDate);
    }
    if (parsedData.endDate && typeof parsedData.endDate === 'string') {
      parsedData.endDate = parseISO(parsedData.endDate);
    }
    
    return parsedData;
  }
  return null;
};

export const removeInvoiceData = (invoiceId: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(`${INVOICE_STORAGE_KEY_PREFIX}${invoiceId}`);
  }
};
