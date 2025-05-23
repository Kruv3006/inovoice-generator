
import { z } from 'zod';
import { format, parse } from 'date-fns';

export const invoiceFormSchema = z.object({
  customerName: z.string().min(1, "Customer name is required").regex(/^[a-zA-Z\s.'-]+$/, "Name must contain only letters, spaces, periods, apostrophes, and hyphens."),
  startDate: z.date({ required_error: "Start date is required." }),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Valid 24-hour time (HH:MM) is required."),
  endDate: z.date({ required_error: "End date is required." }),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Valid 24-hour time (HH:MM) is required."),
  totalFee: z.preprocess(
    (val) => {
      const strVal = String(val).replace(/[^0-9.-]+/g, "");
      const num = parseFloat(strVal);
      return isNaN(num) ? undefined : num;
    },
    z.number({ invalid_type_error: "Total fee must be a number.", required_error: "Total fee is required." })
     .positive({ message: "Total fee must be a positive amount." })
     .max(1000000000, "Total fee seems too large.")
  ),
  watermarkFile: z.custom<FileList>((val) => val instanceof FileList && val.length > 0, "Please upload a file")
    .refine((files) => files?.[0]?.size <= 5 * 1024 * 1024, `Max file size is 5MB.`)
    .refine(
      (files) => ['image/png', 'image/jpeg', 'image/gif'].includes(files?.[0]?.type),
      ".png, .jpg, .gif files are accepted."
    )
    .optional(),
  companyName: z.string().min(1, "Your company name is required.").optional().default("Your Company LLC"),
  companyAddress: z.string().min(1, "Your company address is required.").optional().default("123 Main St, Anytown, USA"),
  clientAddress: z.string().min(1, "Client address is required.").optional().default("456 Client Ave, Otherville, USA"),
  invoiceNotes: z.string().optional().default("Thank you for your business!"),
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

export interface StoredInvoiceData extends InvoiceFormSchemaType {
  id: string;
  invoiceNumber: string;
  invoiceDate: string; // ISO string
  dueDate: string; // ISO string
  watermarkDataUrl?: string | null;
  duration?: { days: number; hours: number };
  // Note: startDate and endDate from InvoiceFormSchemaType are Date objects.
  // When serialized to JSON, they become strings.
  // Deserialization back to Date objects happens in getInvoiceData.
}
