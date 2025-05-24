
import type { StoredInvoiceData, LineItem } from './invoice-types';
import { parseISO } from 'date-fns';

const INVOICE_STORAGE_KEY_PREFIX = 'invoiceData_';

export const saveInvoiceData = (invoiceId: string, data: StoredInvoiceData): void => {
  if (typeof window !== 'undefined') {
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

    if (parsedData.startDate && typeof parsedData.startDate === 'string') {
      parsedData.startDate = parseISO(parsedData.startDate);
    }
    if (parsedData.endDate && typeof parsedData.endDate === 'string') {
      parsedData.endDate = parseISO(parsedData.endDate);
    }
    
    // Ensure items have numeric quantity and rate if they were stringified/parsed weirdly
    if (parsedData.items && Array.isArray(parsedData.items)) {
      parsedData.items = parsedData.items.map(item => ({
        ...item,
        quantity: Number(item.quantity) || 0,
        rate: Number(item.rate) || 0,
      }));
    } else {
      // Provide a default empty item if items array is missing or malformed
      parsedData.items = [{ description: "Default Item", quantity: 1, rate: 0 }];
    }
    
    // Ensure totalFee is a number
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
