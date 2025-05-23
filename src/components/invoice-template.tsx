
"use client";

import type { StoredInvoiceData } from "@/lib/invoice-types";
import { format, parseISO } from "date-fns";
import Image from "next/image";
import { Paperclip } from "lucide-react"; // Example logo icon

interface InvoiceTemplateProps {
  data: StoredInvoiceData;
  watermarkDataUrl?: string | null; // Added this prop explicitly
}

const formatCurrency = (amount?: number) => {
  if (typeof amount !== 'number') return 'N/A';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

export const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({ data, watermarkDataUrl }) => {
  const {
    companyName,
    companyAddress,
    customerName,
    clientAddress,
    invoiceNumber,
    invoiceDate,
    dueDate,
    startDate,
    startTime,
    endDate,
    endTime,
    duration,
    totalFee,
    invoiceNotes,
  } = data;

  const parsedInvoiceDate = invoiceDate ? parseISO(invoiceDate) : new Date();
  const parsedDueDate = dueDate ? parseISO(dueDate) : addDays(new Date(), 30);
  const parsedServiceStartDate = startDate ? new Date(startDate) : new Date();
  const parsedServiceEndDate = endDate ? new Date(endDate) : new Date();

  // Helper function to format address string
  const formatAddress = (address: string | undefined) => {
    return address?.split(',').map((part, index) => <div key={index}>{part.trim()}</div>);
  };


  return (
    <div className="bg-card p-8 md:p-12 shadow-lg rounded-lg border border-border text-card-foreground font-sans relative min-w-[800px] max-w-4xl mx-auto">
      {/* Watermark */}
      {watermarkDataUrl && (
        <div
          className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none"
          data-ai-hint="company logo"
        >
          <Image
            src={watermarkDataUrl}
            alt="Watermark"
            layout="intrinsic"
            width={400}
            height={400}
            objectFit="contain"
          />
        </div>
      )}

      <div className="relative z-10">
        {/* Header */}
        <div className="flex justify-between items-start mb-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Paperclip className="h-10 w-10 text-primary" /> {/* Placeholder logo */}
              <h1 className="text-4xl font-bold text-primary">{companyName || "Your Company"}</h1>
            </div>
            <div className="text-sm text-muted-foreground">
                {formatAddress(companyAddress)}
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-3xl font-semibold uppercase text-gray-700 dark:text-gray-300">Invoice</h2>
            <p className="text-muted-foreground mt-1"># {invoiceNumber}</p>
          </div>
        </div>

        {/* Client and Dates */}
        <div className="grid grid-cols-2 gap-8 mb-10">
          <div>
            <h3 className="font-semibold text-foreground mb-1">Bill To:</h3>
            <p className="font-medium text-primary">{customerName}</p>
            <div className="text-sm text-muted-foreground">
                {formatAddress(clientAddress)}
            </div>
          </div>
          <div className="text-right">
            <div className="mb-2">
              <span className="font-semibold text-foreground">Invoice Date: </span>
              <span className="text-muted-foreground">{format(parsedInvoiceDate, "MMMM d, yyyy")}</span>
            </div>
            <div>
              <span className="font-semibold text-foreground">Due Date: </span>
              <span className="text-muted-foreground">{format(parsedDueDate, "MMMM d, yyyy")}</span>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full table-fixed mb-10">
            <thead className="bg-secondary/50">
              <tr>
                <th className="p-3 text-left font-semibold text-foreground w-3/5">Description</th>
                <th className="p-3 text-right font-semibold text-foreground w-1/5">Duration</th>
                <th className="p-3 text-right font-semibold text-foreground w-1/5">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="p-3 align-top">
                  <p className="font-medium text-foreground">Service Rendered</p>
                  <p className="text-xs text-muted-foreground">
                    From {format(parsedServiceStartDate, "MMM d, yyyy")} {startTime} to {format(parsedServiceEndDate, "MMM d, yyyy")} {endTime}
                  </p>
                </td>
                <td className="p-3 text-right align-top text-muted-foreground">
                  {duration ? `${duration.days}d ${duration.hours}h` : "N/A"}
                </td>
                <td className="p-3 text-right align-top text-foreground">{formatCurrency(totalFee)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        

        {/* Total */}
        <div className="flex justify-end mb-10">
          <div className="w-full max-w-xs">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="font-medium text-muted-foreground">Subtotal:</span>
              <span className="font-medium text-foreground">{formatCurrency(totalFee)}</span>
            </div>
            {/* Add Tax or Discount rows here if needed */}
            {/* <div className="flex justify-between py-2 border-b border-border">
              <span className="font-medium text-muted-foreground">Tax (0%):</span>
              <span className="font-medium text-foreground">{formatCurrency(0)}</span>
            </div> */}
            <div className="flex justify-between py-3 bg-primary/10 px-3 rounded-md mt-2">
              <span className="text-xl font-bold text-primary">Total Due:</span>
              <span className="text-xl font-bold text-primary">{formatCurrency(totalFee)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoiceNotes && (
          <div className="mb-10">
            <h4 className="font-semibold text-foreground mb-1">Notes:</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{invoiceNotes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pt-6 border-t border-border">
          <p>If you have any questions concerning this invoice, please contact {companyName || "us"}.</p>
          <p>&copy; {new Date().getFullYear()} {companyName || "Your Company"}. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

// Helper to add days, include here if not globally available for template
const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

