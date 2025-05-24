
import { z } from 'zod';

export const lineItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, "Description is required."),
  quantity: z.preprocess(
    (val) => {
      const strVal = String(val).replace(/[^0-9.]+/g, "");
      const num = parseFloat(strVal);
      return isNaN(num) || num < 0 ? 0 : num;
    },
    z.number({ invalid_type_error: "Quantity must be a number.", required_error: "Quantity is required." })
     .min(0, { message: "Quantity must be non-negative." })
  ),
  unit: z.string().optional(), // New: Unit for line item
  rate: z.preprocess(
    (val) => {
      const strVal = String(val).replace(/[^0-9.]+/g, "");
      const num = parseFloat(strVal);
      return isNaN(num) || num < 0 ? 0 : num;
    },
    z.number({ invalid_type_error: "Rate must be a number.", required_error: "Rate is required." })
     .min(0, { message: "Rate must be non-negative." })
  ),
  discount: z.preprocess(
    (val) => {
      const strVal = String(val).replace(/[^0-9.]+/g, "");
      const num = parseFloat(strVal);
      return isNaN(num) || num < 0 ? 0 : (num > 100 ? 100 : num);
    },
    z.number({ invalid_type_error: "Discount must be a number."})
     .min(0, { message: "Discount must be non-negative." })
     .max(100, { message: "Discount cannot exceed 100%."})
     .optional()
     .default(0)
  ),
  itemStartDate: z.date().optional(),
  itemEndDate: z.date().optional(),
}).refine(data => {
  if (data.itemStartDate && data.itemEndDate) {
    return data.itemEndDate >= data.itemStartDate;
  }
  return true;
}, {
  message: "Item end date must be on or after item start date.",
  path: ["itemEndDate"],
});

export type LineItem = z.infer<typeof lineItemSchema>;

export const invoiceFormSchema = z.object({
  invoiceNumber: z.string().min(1, "Invoice number is required."),
  customerName: z.string().min(1, "Customer name is required"),
  companyName: z.string().min(1, "Your company name is required."),
  companyLogoFile: z.custom<FileList>((val) => val === undefined || (val instanceof FileList && val.length > 0), "Please upload a logo or ensure no file is selected")
    .refine((files) => files === undefined || !files || files.length === 0 || files[0].size <= 2 * 1024 * 1024, `Max file size is 2MB.`)
    .refine(
      (files) => files === undefined || !files || files.length === 0 || ['image/png', 'image/jpeg', 'image/gif'].includes(files[0].type),
      ".png, .jpg, .gif files are accepted."
    )
    .optional(),

  invoiceDate: z.date({ required_error: "Invoice date is required." }),
  dueDate: z.date().optional(), // New: Optional due date
  items: z.array(lineItemSchema).min(1, "At least one item is required."),

  globalDiscountType: z.enum(['percentage', 'fixed']).optional().default('percentage'),
  globalDiscountValue: z.preprocess(
    (val) => {
      const strVal = String(val).replace(/[^0-9.]+/g, "");
      const num = parseFloat(strVal);
      return isNaN(num) || num < 0 ? 0 : num;
    },
    z.number().min(0, "Discount value must be non-negative.").optional().default(0)
  ),

  watermarkFile: z.custom<FileList>((val) => val === undefined || (val instanceof FileList && val.length > 0), "Please upload a file or ensure no file is selected")
    .refine((files) => files === undefined || !files || files.length === 0 || files[0].size <= 5 * 1024 * 1024, `Max file size is 5MB.`)
    .refine(
      (files) => files === undefined || !files || files.length === 0 || ['image/png', 'image/jpeg', 'image/gif'].includes(files[0].type),
      ".png, .jpg, .gif files are accepted."
    )
    .optional(),
  watermarkOpacity: z.number().min(0).max(1).optional().default(0.05),
  invoiceNotes: z.string().optional(),
  termsAndConditions: z.string().optional(),
  themeColor: z.string().optional().default('default'),
  fontTheme: z.string().optional().default('default'), // New: Font theme
});

export type InvoiceFormSchemaType = z.infer<typeof invoiceFormSchema>;

export interface StoredLineItem extends Omit<LineItem, 'itemStartDate' | 'itemEndDate' | 'discount'> {
  itemStartDate?: string;
  itemEndDate?: string;
  discount?: number;
  unit?: string; // New: Unit for stored line item
}
export interface StoredInvoiceData extends Omit<InvoiceFormSchemaType, 'companyLogoFile' | 'watermarkFile' | 'items' | 'invoiceDate' | 'dueDate' | 'watermarkOpacity' | 'invoiceNotes' | 'termsAndConditions' | 'globalDiscountType' | 'globalDiscountValue' | 'themeColor' | 'fontTheme'> {
  id: string;
  invoiceDate: string;
  dueDate?: string; // New: Stored due date
  companyLogoDataUrl?: string | null;
  watermarkDataUrl?: string | null;
  watermarkOpacity: number;
  invoiceNotes?: string;
  termsAndConditions?: string;
  items: StoredLineItem[];
  subTotal: number;
  globalDiscountType?: 'percentage' | 'fixed';
  globalDiscountValue?: number;
  totalFee: number;
  themeColor?: string;
  fontTheme?: string; // New: Stored font theme
}

// Settings Page Types
export interface CompanyProfileData {
  companyName?: string;
  companyLogoDataUrl?: string | null;
  defaultInvoiceNotes?: string;
  defaultTermsAndConditions?: string;
}

export interface ClientData {
  id: string;
  name: string;
}

export interface SavedItemData {
  id: string;
  description: string;
  rate: number;
  defaultQuantity?: number; // New: Default quantity for saved item
  defaultUnit?: string;     // New: Default unit for saved item
}
