
import type { StoredInvoiceData, StoredLineItem } from './invoice-types';
import { parseISO, isValid } from 'date-fns';

const INVOICE_STORAGE_KEY_PREFIX = 'invoiceData_';

export const saveInvoiceData = (invoiceId: string, data: StoredInvoiceData): void => {
  if (typeof window !== 'undefined') {
    const dataToStore: StoredInvoiceData = {
      ...data,
      invoiceDate: data.invoiceDate, // Already ISO string from form
      items: data.items.map(item => ({
        ...item,
        itemStartDate: item.itemStartDate ? item.itemStartDate : undefined,
        itemEndDate: item.itemEndDate ? item.itemEndDate : undefined,
      })),
      watermarkOpacity: typeof data.watermarkOpacity === 'number' ? data.watermarkOpacity : 0.05,
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
    parsedData.watermarkOpacity = typeof parsedData.watermarkOpacity === 'number' ? parsedData.watermarkOpacity : 0.05;


    return parsedData;
  }
  return null;
};

export const removeInvoiceData = (invoiceId: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(`${INVOICE_STORAGE_KEY_PREFIX}${invoiceId}`);
  }
};
