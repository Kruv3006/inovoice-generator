
import { z } from 'zod';

export const lineItemSchema = z.object({
  id: z.string().optional(), 
  description: z.string().min(1, "Description is required."),
  quantity: z.preprocess(
    (val) => {
      const strVal = String(val).replace(/[^0-9.]+/g, "");
      const num = parseFloat(strVal);
      return isNaN(num) || num < 0 ? 0 : num; // Allow 0, default to 0 if invalid
    },
    z.number({ invalid_type_error: "Quantity must be a number.", required_error: "Quantity is required." })
     .min(0, { message: "Quantity must be non-negative." })
  ),
  rate: z.preprocess(
    (val) => {
      const strVal = String(val).replace(/[^0-9.]+/g, "");
      const num = parseFloat(strVal);
      return isNaN(num) || num < 0 ? 0 : num; // Allow 0, default to 0 if invalid
    },
    z.number({ invalid_type_error: "Rate must be a number.", required_error: "Rate is required." })
     .min(0, { message: "Rate must be non-negative." }) 
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
  customerName: z.string().min(1, "Customer name is required"), // Regex removed for flexibility with selected clients
  companyName: z.string().min(1, "Your company name is required."),
  companyLogoFile: z.custom<FileList>((val) => val === undefined || (val instanceof FileList && val.length > 0), "Please upload a logo or ensure no file is selected")
    .refine((files) => files === undefined || !files || files.length === 0 || files[0].size <= 2 * 1024 * 1024, `Max file size is 2MB.`)
    .refine(
      (files) => files === undefined || !files || files.length === 0 || ['image/png', 'image/jpeg', 'image/gif'].includes(files[0].type),
      ".png, .jpg, .gif files are accepted."
    )
    .optional(),
  
  invoiceDate: z.date({ required_error: "Invoice date is required." }),
  items: z.array(lineItemSchema).min(1, "At least one item is required."),

  watermarkFile: z.custom<FileList>((val) => val === undefined || (val instanceof FileList && val.length > 0), "Please upload a file or ensure no file is selected")
    .refine((files) => files === undefined || !files || files.length === 0 || files[0].size <= 5 * 1024 * 1024, `Max file size is 5MB.`)
    .refine(
      (files) => files === undefined || !files || files.length === 0 || ['image/png', 'image/jpeg', 'image/gif'].includes(files[0].type),
      ".png, .jpg, .gif files are accepted."
    )
    .optional(),
  watermarkOpacity: z.number().min(0).max(1).optional().default(0.05),
  invoiceNotes: z.string().optional(),
});

export type InvoiceFormSchemaType = z.infer<typeof invoiceFormSchema>;

export interface StoredLineItem extends Omit<LineItem, 'itemStartDate' | 'itemEndDate'> {
  itemStartDate?: string; 
  itemEndDate?: string; 
}
export interface StoredInvoiceData extends Omit<InvoiceFormSchemaType, 'companyLogoFile' | 'watermarkFile' | 'items' | 'invoiceDate' | 'watermarkOpacity' | 'invoiceNotes'> {
  id: string;
  invoiceDate: string; 
  companyLogoDataUrl?: string | null;
  watermarkDataUrl?: string | null;
  watermarkOpacity: number; // Made non-optional, will always have a default
  invoiceNotes?: string; // Made optional
  items: StoredLineItem[];
  totalFee: number; 
}

// Settings Page Types
export interface CompanyProfileData {
  companyName?: string;
  companyLogoDataUrl?: string | null;
  defaultInvoiceNotes?: string;
}

export interface ClientData {
  id: string;
  name: string;
}

export interface SavedItemData {
  id: string;
  description: string;
  rate: number;
}
