
import { z } from 'zod';
import { format, parse } from 'date-fns';

export const lineItemSchema = z.object({
  id: z.string().optional(), // For react-hook-form key attribute
  description: z.string().min(1, "Description is required."),
  quantity: z.preprocess(
    (val) => {
      const strVal = String(val).replace(/[^0-9.]+/g, ""); // Allow decimals
      const num = parseFloat(strVal);
      return isNaN(num) ? undefined : num;
    },
    z.number({ invalid_type_error: "Quantity must be a number.", required_error: "Quantity is required." })
     .positive({ message: "Quantity must be positive." })
  ),
  rate: z.preprocess(
    (val) => {
      const strVal = String(val).replace(/[^0-9.]+/g, ""); // Allow decimals
      const num = parseFloat(strVal);
      return isNaN(num) ? undefined : num;
    },
    z.number({ invalid_type_error: "Rate must be a number.", required_error: "Rate is required." })
     .positive({ message: "Rate must be positive." })
  ),
  // Amount will be calculated: quantity * rate
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
  startDate: z.date({ required_error: "Start date is required." }),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Valid 24-hour time (HH:MM) is required."),
  endDate: z.date({ required_error: "End date is required." }),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Valid 24-hour time (HH:MM) is required."),
  
  items: z.array(lineItemSchema).min(1, "At least one item is required."),

  watermarkFile: z.custom<FileList>((val) => val instanceof FileList && val.length > 0, "Please upload a file")
    .refine((files) => files?.[0]?.size <= 5 * 1024 * 1024, `Max file size is 5MB.`)
    .refine(
      (files) => ['image/png', 'image/jpeg', 'image/gif'].includes(files?.[0]?.type),
      ".png, .jpg, .gif files are accepted."
    )
    .optional(),
  invoiceNotes: z.string().optional().default("Thank you for your business! Payment is due within 30 days."),
}).refine(data => {
  if (data.startDate && data.startTime && data.endDate && data.endTime) {
    const startFullDateString = `${format(data.startDate, "yyyy-MM-dd")} ${data.startTime}`;
    const endFullDateString = `${format(data.endDate, "yyyy-MM-dd")} ${data.endTime}`;
    const startFullDate = parse(startFullDateString, 'yyyy-MM-dd HH:mm', new Date());
    const endFullDate = parse(endFullDateString, 'yyyy-MM-dd HH:mm', new Date());
    return endFullDate > startFullDate;
  }
  return true;
}, {
  message: "End date & time must be after start date & time.",
  path: ["endDate"],
});

export type InvoiceFormSchemaType = z.infer<typeof invoiceFormSchema>;

export interface StoredInvoiceData extends Omit<InvoiceFormSchemaType, 'companyLogoFile' | 'watermarkFile' | 'items'> {
  id: string;
  invoiceDate: string; // ISO string
  companyLogoDataUrl?: string | null;
  watermarkDataUrl?: string | null;
  items: LineItem[];
  totalFee: number; // Calculated total fee
}
