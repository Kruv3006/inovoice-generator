
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
        discount: Number(item.discount) || 0,
      })),
      watermarkOpacity: typeof data.watermarkOpacity === 'number' ? data.watermarkOpacity : 0.05,
      globalDiscountType: data.globalDiscountType,
      globalDiscountValue: data.globalDiscountValue,
      subTotal: data.subTotal, // ensure subTotal is stored
      totalFee: data.totalFee, // ensure totalFee is stored
      themeColor: data.themeColor || 'default',
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
        discount: Number(item.discount) || 0,
      }));
    } else {
      parsedData.items = [{ description: "Default Item", quantity: 1, rate: 0, discount: 0 }];
    }

    parsedData.subTotal = Number(parsedData.subTotal) || 0;
    parsedData.globalDiscountType = parsedData.globalDiscountType || 'percentage';
    parsedData.globalDiscountValue = Number(parsedData.globalDiscountValue) || 0;
    parsedData.totalFee = Number(parsedData.totalFee) || 0;
    parsedData.watermarkOpacity = typeof parsedData.watermarkOpacity === 'number' ? parsedData.watermarkOpacity : 0.05;
    parsedData.themeColor = parsedData.themeColor || 'default';

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
  // Sort by date, assuming invoiceId is time-based like 'inv_timestamp'
  return ids.sort((a, b) => {
    const timeA = parseInt(a.split('_')[1] || '0');
    const timeB = parseInt(b.split('_')[1] || '0');
    return timeB - timeA; // Sort descending (newest first)
  });
};

export const getAllInvoices = (): StoredInvoiceData[] => {
  if (typeof window === 'undefined') return [];
  const ids = getAllInvoiceIds();
  return ids.map(id => getInvoiceData(id)).filter(invoice => invoice !== null) as StoredInvoiceData[];
};
