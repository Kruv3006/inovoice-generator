
import type { StoredInvoiceData, AvailableCurrency } from './invoice-types';
import { parseISO, isValid } from 'date-fns';
import { availableCurrencies } from './invoice-types';

export const INVOICE_STORAGE_KEY_PREFIX = 'invoiceData_v3_'; // Version up for currency and appearance fields

export const saveInvoiceData = (invoiceId: string, data: StoredInvoiceData): void => {
  if (typeof window !== 'undefined') {
    const dataToStore: StoredInvoiceData = {
      ...data,
      items: data.items.map(item => ({
        ...item,
        description: item.description || 'Item',
        quantity: Number(item.quantity) || 0,
        unit: item.unit || '',
        rate: Number(item.rate) || 0,
        itemStartDate: item.itemStartDate ? item.itemStartDate : undefined,
        itemEndDate: item.itemEndDate ? item.itemEndDate : undefined,
        itemStartTime: item.itemStartTime || undefined,
        itemEndTime: item.itemEndTime || undefined,
        discount: Number(item.discount) || 0,
      })),
      watermarkOpacity: typeof data.watermarkOpacity === 'number' ? data.watermarkOpacity : 0.05,
      globalDiscountType: data.globalDiscountType || 'percentage',
      globalDiscountValue: Number(data.globalDiscountValue) || 0,
      subTotal: Number(data.subTotal) || 0,
      totalFee: Number(data.totalFee) || 0,
      currency: data.currency || availableCurrencies[0],
      amountInWords: data.amountInWords || `[Amount for ${data.currency?.symbol || availableCurrencies[0].symbol}${(data.totalFee || 0).toFixed(2)} in words - Auto-generation pending]`,
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
    let parsedData: StoredInvoiceData | null = null;

    if (dataString) {
        try {
            parsedData = JSON.parse(dataString) as StoredInvoiceData;
        } catch (e) {
            console.error("Error parsing invoice data from localStorage:", e);
            // Attempt to remove corrupted data
            localStorage.removeItem(`${INVOICE_STORAGE_KEY_PREFIX}${invoiceId}`);
            return null;
        }
    } else {
      // Try falling back to old key v2 (which included templateStyle but maybe not currency)
      const oldV2DataString = localStorage.getItem(`invoiceData_v2_${invoiceId}`);
      if (oldV2DataString) {
        try {
          const oldParsedData = JSON.parse(oldV2DataString) as any; // Parse as any for migration flexibility
          parsedData = {
              ...oldParsedData,
              id: invoiceId,
              currency: oldParsedData.currency || availableCurrencies[0], // Default currency
              amountInWords: oldParsedData.amountInWords || `[Amount for ${ (oldParsedData.currency || availableCurrencies[0]).symbol}${(oldParsedData.totalFee || 0).toFixed(2)} in words - Auto-generation pending]`,
              fontTheme: oldParsedData.fontTheme || 'default',
          };
          // Re-save with new key and structure
          saveInvoiceData(invoiceId, parsedData);
        } catch (e) {
          console.error("Error migrating old v2 invoice data:", e);
          localStorage.removeItem(`invoiceData_v2_${invoiceId}`); // Remove corrupted old data
          return null;
        }
      } else {
        // Try falling back to original key (before v2)
        const originalDataString = localStorage.getItem(`invoiceData_${invoiceId}`);
        if (originalDataString) {
          try {
            const oldParsedData = JSON.parse(originalDataString) as any;
            parsedData = {
                ...oldParsedData,
                id: invoiceId,
                currency: availableCurrencies[0], // Default currency
                amountInWords: `[Words for ${availableCurrencies[0].symbol}${(oldParsedData.totalFee || 0).toFixed(2)} - Auto-generation pending]`,
                themeColor: 'default',
                fontTheme: 'default',
                templateStyle: 'classic',
                watermarkOpacity: 0.05,
                globalDiscountType: 'percentage',
                globalDiscountValue: 0,
            };
            saveInvoiceData(invoiceId, parsedData);
          } catch (e) {
            console.error("Error migrating original invoice data:", e);
            localStorage.removeItem(`invoiceData_${invoiceId}`);
            return null;
          }
        } else {
            return null; // No data found for any key
        }
      }
    }
    
    if (!parsedData) return null;


    // Ensure dates are valid ISO strings or undefined
    parsedData.invoiceDate = parsedData.invoiceDate && isValid(parseISO(parsedData.invoiceDate)) ? parsedData.invoiceDate : new Date().toISOString();
    parsedData.dueDate = parsedData.dueDate && isValid(parseISO(parsedData.dueDate)) ? parsedData.dueDate : undefined;

    if (parsedData.items && Array.isArray(parsedData.items)) {
      parsedData.items = parsedData.items.map(item => ({
        description: item.description || "Item",
        quantity: Number(item.quantity) || 0,
        unit: item.unit || '',
        rate: Number(item.rate) || 0,
        discount: Number(item.discount) || 0,
        itemStartDate: item.itemStartDate && isValid(parseISO(item.itemStartDate)) ? item.itemStartDate : undefined,
        itemEndDate: item.itemEndDate && isValid(parseISO(item.itemEndDate)) ? item.itemEndDate : undefined,
        itemStartTime: item.itemStartTime || undefined,
        itemEndTime: item.itemEndTime || undefined,
      }));
    } else {
      parsedData.items = [{ description: "Default Item", quantity: 1, unit: "", rate: 0, discount: 0, itemStartTime: undefined, itemEndTime: undefined }];
    }

    parsedData.subTotal = Number(parsedData.subTotal) || 0;
    parsedData.globalDiscountType = parsedData.globalDiscountType || 'percentage';
    parsedData.globalDiscountValue = Number(parsedData.globalDiscountValue) || 0;
    parsedData.totalFee = Number(parsedData.totalFee) || 0;
    parsedData.watermarkOpacity = typeof parsedData.watermarkOpacity === 'number' ? parsedData.watermarkOpacity : 0.05;
    
    // Ensure currency object is valid
    const foundCurrency = availableCurrencies.find(c => c.code === parsedData.currency?.code);
    parsedData.currency = foundCurrency || availableCurrencies[0];
    
    parsedData.amountInWords = parsedData.amountInWords || `[Amount for ${parsedData.currency.symbol}${(parsedData.totalFee || 0).toFixed(2)} in words - Auto-generation pending]`;
    parsedData.themeColor = parsedData.themeColor || 'default';
    parsedData.fontTheme = parsedData.fontTheme || 'default';
    parsedData.templateStyle = parsedData.templateStyle || 'classic';
    parsedData.invoiceNotes = parsedData.invoiceNotes || '';
    parsedData.termsAndConditions = parsedData.termsAndConditions || '';
    parsedData.customerAddress = parsedData.customerAddress || '';
    parsedData.customerEmail = parsedData.customerEmail || '';
    parsedData.customerPhone = parsedData.customerPhone || '';
    parsedData.companyName = parsedData.companyName || '';


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
