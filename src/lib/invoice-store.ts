
import type { StoredInvoiceData } from './invoice-types';
import { parseISO, isValid } from 'date-fns';

const INVOICE_STORAGE_KEY_PREFIX = 'invoiceData_';

export const saveInvoiceData = (invoiceId: string, data: StoredInvoiceData): void => {
  if (typeof window !== 'undefined') {
    const dataToStore: StoredInvoiceData = {
      ...data,
      invoiceDate: data.invoiceDate, 
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

    // Ensure items is an array and items have numeric quantity/rate
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

export const getAllInvoiceIds = (): string[] => {
  if (typeof window === 'undefined') return [];
  const ids: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(INVOICE_STORAGE_KEY_PREFIX)) {
      ids.push(key.replace(INVOICE_STORAGE_KEY_PREFIX, ''));
    }
  }
  return ids.sort((a, b) => b.localeCompare(a)); // Sort by most recent first if IDs are timestamp-based
};

export const getAllInvoices = (): StoredInvoiceData[] => {
  if (typeof window === 'undefined') return [];
  const ids = getAllInvoiceIds();
  return ids.map(id => getInvoiceData(id)).filter(invoice => invoice !== null) as StoredInvoiceData[];
};
