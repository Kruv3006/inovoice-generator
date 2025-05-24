
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
     .positive({ message: "Rate must be positive." })
  ),
  itemStartDate: z.date().optional(),
  itemEndDate: z.date().optional(),
}).refine(data => {
  // If both item dates are provided, end date must be after or same as start date
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
  companyLogoFile: z.custom<FileList>((val) => val instanceof FileList && val.length > 0, "Please upload a logo")
    .refine((files) => files?.[0]?.size <= 2 * 1024 * 1024, `Max file size is 2MB.`)
    .refine(
      (files) => ['image/png', 'image/jpeg', 'image/gif'].includes(files?.[0]?.type),
      ".png, .jpg, .gif files are accepted."
    )
    .optional(),
  
  invoiceDate: z.date({ required_error: "Invoice date is required." }),
  items: z.array(lineItemSchema).min(1, "At least one item is required."),

  watermarkFile: z.custom<FileList>((val) => val instanceof FileList && val.length > 0, "Please upload a file")
    .refine((files) => files?.[0]?.size <= 5 * 1024 * 1024, `Max file size is 5MB.`)
    .refine(
      (files) => ['image/png', 'image/jpeg', 'image/gif'].includes(files?.[0]?.type),
      ".png, .jpg, .gif files are accepted."
    )
    .optional(),
  invoiceNotes: z.string().optional().default("Thank you for your business! Payment is due within 30 days."),
});

export type InvoiceFormSchemaType = z.infer<typeof invoiceFormSchema>;

// StoredInvoiceData will store dates as ISO strings for localStorage compatibility
// but they will be converted back to Date objects when read by getInvoiceData
export interface StoredLineItem extends Omit<LineItem, 'itemStartDate' | 'itemEndDate'> {
  itemStartDate?: string; // ISO string
  itemEndDate?: string; // ISO string
}
export interface StoredInvoiceData extends Omit<InvoiceFormSchemaType, 'companyLogoFile' | 'watermarkFile' | 'items' | 'invoiceDate'> {
  id: string;
  invoiceDate: string; // ISO string for main invoice date
  companyLogoDataUrl?: string | null;
  watermarkDataUrl?: string | null;
  items: StoredLineItem[];
  totalFee: number; // Calculated total fee
}
