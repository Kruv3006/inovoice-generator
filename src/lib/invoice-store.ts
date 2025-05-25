
import type { StoredInvoiceData, AvailableCurrency } from './invoice-types';
import { parseISO, isValid } from 'date-fns';
import { availableCurrencies } from './invoice-types';

export const INVOICE_STORAGE_KEY_PREFIX = 'invoiceData_v2_'; // Version up for safety with new fields

export const saveInvoiceData = (invoiceId: string, data: StoredInvoiceData): void => {
  if (typeof window !== 'undefined') {
    const dataToStore: StoredInvoiceData = {
      ...data,
      invoiceDate: data.invoiceDate, // Should already be ISO string from form
      dueDate: data.dueDate, // Should also be ISO string or undefined
      items: data.items.map(item => ({
        ...item,
        unit: item.unit || '',
        itemStartDate: item.itemStartDate ? item.itemStartDate : undefined,
        itemEndDate: item.itemEndDate ? item.itemEndDate : undefined,
        itemStartTime: item.itemStartTime || undefined,
        itemEndTime: item.itemEndTime || undefined,
        discount: Number(item.discount) || 0,
      })),
      watermarkOpacity: typeof data.watermarkOpacity === 'number' ? data.watermarkOpacity : 0.05,
      globalDiscountType: data.globalDiscountType,
      globalDiscountValue: data.globalDiscountValue,
      subTotal: data.subTotal,
      totalFee: data.totalFee,
      currency: data.currency || availableCurrencies[0],
      amountInWords: data.amountInWords || `[Words for ${data.currency?.symbol || '₹'}${data.totalFee.toFixed(2)} - Placeholder]`,
      themeColor: data.themeColor || 'default',
      fontTheme: data.fontTheme || 'default',
      templateStyle: data.templateStyle || 'classic',
      invoiceNotes: data.invoiceNotes || '',
      termsAndConditions: data.termsAndConditions || '',
      customerAddress: data.customerAddress || '',
      customerEmail: data.customerEmail || '',
      customerPhone: data.customerPhone || '',
    };
    localStorage.setItem(`${INVOICE_STORAGE_KEY_PREFIX}${invoiceId}`, JSON.stringify(dataToStore));
  }
};

export const getInvoiceData = (invoiceId: string): StoredInvoiceData | null => {
  if (typeof window !== 'undefined') {
    const dataString = localStorage.getItem(`${INVOICE_STORAGE_KEY_PREFIX}${invoiceId}`);
    if (!dataString) {
      // Try falling back to old key if new one isn't found (for migration)
      const oldDataString = localStorage.getItem(`invoiceData_${invoiceId}`);
      if(!oldDataString) return null;
      // If old data is found, parse it and re-save with new key structure (basic migration)
      try {
        const oldParsedData = JSON.parse(oldDataString) as any; // Parse as any for migration flexibility
        const migratedData: StoredInvoiceData = {
            ...oldParsedData,
            id: invoiceId, // ensure id is correct
            currency: availableCurrencies[0], // default currency for old data
            amountInWords: `[Words for ${availableCurrencies[0].symbol}${(oldParsedData.totalFee || 0).toFixed(2)} - Placeholder]`,
            customerAddress: oldParsedData.customerAddress || '',
            customerEmail: oldParsedData.customerEmail || '',
            customerPhone: oldParsedData.customerPhone || '',
            // Ensure other new fields have defaults if missing
            templateStyle: oldParsedData.templateStyle || 'classic',
            termsAndConditions: oldParsedData.termsAndConditions || '',
            dueDate: oldParsedData.dueDate && isValid(parseISO(oldParsedData.dueDate)) ? oldParsedData.dueDate : undefined,
            items: (oldParsedData.items && Array.isArray(oldParsedData.items)) ? oldParsedData.items.map((item: any) => ({
                ...item,
                unit: item.unit || '',
                itemStartDate: item.itemStartDate && isValid(parseISO(item.itemStartDate)) ? item.itemStartDate : undefined,
                itemEndDate: item.itemEndDate && isValid(parseISO(item.itemEndDate)) ? item.itemEndDate : undefined,
            })) : [{ description: "Default Item", quantity: 1, rate: 0, discount: 0, unit: ""}],
            watermarkOpacity: typeof oldParsedData.watermarkOpacity === 'number' ? oldParsedData.watermarkOpacity : 0.05,
            themeColor: oldParsedData.themeColor || 'default',
            fontTheme: oldParsedData.fontTheme || 'default',
        };
        saveInvoiceData(invoiceId, migratedData); // Save with new key and structure
        return migratedData;
      } catch (e) {
        console.error("Error migrating old invoice data:", e);
        return null;
      }
    }
    
    const parsedData = JSON.parse(dataString) as StoredInvoiceData;

    // Ensure dates are valid ISO strings or undefined
    parsedData.dueDate = parsedData.dueDate && isValid(parseISO(parsedData.dueDate)) ? parsedData.dueDate : undefined;

    if (parsedData.items && Array.isArray(parsedData.items)) {
      parsedData.items = parsedData.items.map(item => ({
        ...item,
        unit: item.unit || '',
        itemStartDate: item.itemStartDate && isValid(parseISO(item.itemStartDate)) ? item.itemStartDate : undefined,
        itemEndDate: item.itemEndDate && isValid(parseISO(item.itemEndDate)) ? item.itemEndDate : undefined,
        itemStartTime: item.itemStartTime || undefined,
        itemEndTime: item.itemEndTime || undefined,
        quantity: Number(item.quantity) || 0,
        rate: Number(item.rate) || 0,
        discount: Number(item.discount) || 0,
      }));
    } else {
      parsedData.items = [{ description: "Default Item", quantity: 1, rate: 0, discount: 0, unit: "", itemStartTime: undefined, itemEndTime: undefined }];
    }

    parsedData.subTotal = Number(parsedData.subTotal) || 0;
    parsedData.globalDiscountType = parsedData.globalDiscountType || 'percentage';
    parsedData.globalDiscountValue = Number(parsedData.globalDiscountValue) || 0;
    parsedData.totalFee = Number(parsedData.totalFee) || 0;
    parsedData.watermarkOpacity = typeof parsedData.watermarkOpacity === 'number' ? parsedData.watermarkOpacity : 0.05;
    parsedData.currency = parsedData.currency || availableCurrencies[0];
    parsedData.amountInWords = parsedData.amountInWords || `[Words for ${parsedData.currency.symbol}${parsedData.totalFee.toFixed(2)} - Placeholder]`;
    parsedData.themeColor = parsedData.themeColor || 'default';
    parsedData.fontTheme = parsedData.fontTheme || 'default';
    parsedData.templateStyle = parsedData.templateStyle || 'classic';
    parsedData.invoiceNotes = parsedData.invoiceNotes || '';
    parsedData.termsAndConditions = parsedData.termsAndConditions || '';
    parsedData.customerAddress = parsedData.customerAddress || '';
    parsedData.customerEmail = parsedData.customerEmail || '';
    parsedData.customerPhone = parsedData.customerPhone || '';

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
  return ids.sort((a, b) => { // Sort by timestamp in ID, newest first
    const timeA = parseInt(a.split('_')[1] || '0');
    const timeB = parseInt(b.split('_')[1] || '0');
    return timeB - timeA;
  });
};

export const getAllInvoices = (): StoredInvoiceData[] => {
  if (typeof window === 'undefined') return [];
  const ids = getAllInvoiceIds();
  return ids.map(id => getInvoiceData(id)).filter(invoice => invoice !== null) as StoredInvoiceData[];
};

    