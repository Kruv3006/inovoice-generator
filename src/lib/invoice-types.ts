
import { z } from 'zod';
import { format, parse, differenceInCalendarDays, isValid } from 'date-fns';

export const lineItemSchema = z.object({
  id: z.string().optional(), // For react-hook-form key attribute
  description: z.string().min(1, "Description is required."),
  quantity: z.preprocess(
    (val) => {
      const strVal = String(val).replace(/[^0-9.]+/g, "");
      const num = parseFloat(strVal);
      return isNaN(num) ? undefined : num;
    },
    z.number({ invalid_type_error: "Quantity must be a number.", required_error: "Quantity is required." })
     .positive({ message: "Quantity must be positive." })
  ),
  rate: z.preprocess(
    (val) => {
      const strVal = String(val).replace(/[^0-9.]+/g, "");
      const num = parseFloat(strVal);
      return isNaN(num) ? undefined : num;
    },
    z.number({ invalid_type_error: "Rate must be a number.", required_error: "Rate is required." })
     .min(0, { message: "Rate must be non-negative." }) // Allow 0 for rate
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
  customerName: z.string().min(1, "Customer name is required").regex(/^[a-zA-Z\s.'-]+$/, "Name must contain only letters, spaces, periods, apostrophes, and hyphens."),
  companyName: z.string().min(1, "Your company name is required."),
  companyLogoFile: z.custom<FileList>((val) => val === undefined || (val instanceof FileList && val.length > 0), "Please upload a logo or ensure no file is selected")
    .refine((files) => files === undefined || files?.[0]?.size <= 2 * 1024 * 1024, `Max file size is 2MB.`)
    .refine(
      (files) => files === undefined || ['image/png', 'image/jpeg', 'image/gif'].includes(files?.[0]?.type),
      ".png, .jpg, .gif files are accepted."
    )
    .optional(),
  
  invoiceDate: z.date({ required_error: "Invoice date is required." }),
  items: z.array(lineItemSchema).min(1, "At least one item is required."),

  watermarkFile: z.custom<FileList>((val) => val === undefined || (val instanceof FileList && val.length > 0), "Please upload a file or ensure no file is selected")
    .refine((files) => files === undefined || files?.[0]?.size <= 5 * 1024 * 1024, `Max file size is 5MB.`)
    .refine(
      (files) => files === undefined || ['image/png', 'image/jpeg', 'image/gif'].includes(files?.[0]?.type),
      ".png, .jpg, .gif files are accepted."
    )
    .optional(),
  watermarkOpacity: z.number().min(0).max(1).optional().default(0.05),
  invoiceNotes: z.string().optional().default("Thank you for your business! Payment is due within 30 days."),
});

export type InvoiceFormSchemaType = z.infer<typeof invoiceFormSchema>;

export interface StoredLineItem extends Omit<LineItem, 'itemStartDate' | 'itemEndDate'> {
  itemStartDate?: string; 
  itemEndDate?: string; 
}
export interface StoredInvoiceData extends Omit<InvoiceFormSchemaType, 'companyLogoFile' | 'watermarkFile' | 'items' | 'invoiceDate' | 'watermarkOpacity'> {
  id: string;
  invoiceDate: string; 
  companyLogoDataUrl?: string | null;
  watermarkDataUrl?: string | null;
  watermarkOpacity?: number;
  items: StoredLineItem[];
  totalFee: number; 
}
