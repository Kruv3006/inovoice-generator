
import type { StoredInvoiceData, StoredLineItem } from './invoice-types';
import { parseISO, isValid } from 'date-fns';

const INVOICE_STORAGE_KEY_PREFIX = 'invoiceData_';

export const saveInvoiceData = (invoiceId: string, data: StoredInvoiceData): void => {
  if (typeof window !== 'undefined') {
    // Ensure dates in items are stored as ISO strings
    const dataToStore = {
      ...data,
      invoiceDate: data.invoiceDate, // Already ISO string from form
      items: data.items.map(item => ({
        ...item,
        itemStartDate: item.itemStartDate ? item.itemStartDate : undefined,
        itemEndDate: item.itemEndDate ? item.itemEndDate : undefined,
      }))
    };
    localStorage.setItem(`${INVOICE_STORAGE_KEY_PREFIX}${invoiceId}`, JSON.stringify(dataToStore));
  }
};

export const getInvoiceData = (invoiceId: string): StoredInvoiceData | null => {
  if (typeof window !== 'undefined') {
    const dataString = localStorage.getItem(`${INVOICE_STORAGE_KEY_PREFIX}${invoiceId}`);
    if (!dataString) {
      return null;
    }
    const parsedData = JSON.parse(dataString) as StoredInvoiceData;

    // Convert main invoiceDate back to string if needed or ensure it's a valid ISO string
    // It should be stored as ISO string from form submission.

    // Convert item dates from ISO strings back to Date objects
    if (parsedData.items && Array.isArray(parsedData.items)) {
      parsedData.items = parsedData.items.map(item => ({
        ...item,
        itemStartDate: item.itemStartDate && isValid(parseISO(item.itemStartDate)) ? item.itemStartDate : undefined,
        itemEndDate: item.itemEndDate && isValid(parseISO(item.itemEndDate)) ? item.itemEndDate : undefined,
        quantity: Number(item.quantity) || 0,
        rate: Number(item.rate) || 0,
      }));
    } else {
      parsedData.items = [{ description: "Default Item", quantity: 1, rate: 0 }];
    }
    
    parsedData.totalFee = Number(parsedData.totalFee) || 0;

    return parsedData;
  }
  return null;
};

export const removeInvoiceData = (invoiceId: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(`${INVOICE_STORAGE_KEY_PREFIX}${invoiceId}`);
  }
};
