
"use client";

import type { StoredInvoiceData } from "@/lib/invoice-types";
import { format, parseISO } from "date-fns"; // Removed addDays as dueDate is removed
import Image from "next/image"; 

interface InvoiceTemplateProps {
  data: StoredInvoiceData;
  watermarkDataUrl?: string | null;
}

const formatCurrency = (amount?: number) => {
  if (typeof amount !== 'number') return 'N/A';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
};

export const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({ data, watermarkDataUrl }) => {
  const {
    companyName,
    companyLogoDataUrl,
    customerName,
    invoiceNumber,
    invoiceDate, 
    // dueDate, // Removed    
    startDate,   
    endDate,     
    startTime,
    endTime,
    duration,
    totalFee,
    invoiceNotes,
  } = data;

  const defaultDisplayDate = new Date();

  const parsedInvoiceDate = invoiceDate ? (parseISO(invoiceDate) instanceof Date && !isNaN(parseISO(invoiceDate).valueOf()) ? parseISO(invoiceDate) : defaultDisplayDate) : defaultDisplayDate;
  // const parsedDueDate = dueDate ? (parseISO(dueDate) instanceof Date && !isNaN(parseISO(dueDate).valueOf()) ? parseISO(dueDate) : addDays(defaultDisplayDate, 30)) : addDays(defaultDisplayDate, 30); // Removed
  
  const displayServiceStartDate = startDate instanceof Date && !isNaN(startDate.valueOf()) 
                                  ? startDate 
                                  : (startDate ? (parseISO(startDate as unknown as string) instanceof Date && !isNaN(parseISO(startDate as unknown as string).valueOf()) ? parseISO(startDate as unknown as string) : defaultDisplayDate) : defaultDisplayDate);
  const displayServiceEndDate = endDate instanceof Date && !isNaN(endDate.valueOf()) 
                                ? endDate 
                                : (endDate ? (parseISO(endDate as unknown as string) instanceof Date && !isNaN(parseISO(endDate as unknown as string).valueOf()) ? parseISO(endDate as unknown as string) : defaultDisplayDate) : defaultDisplayDate);

  return (
    <div className="bg-card p-8 md:p-12 shadow-lg rounded-lg border border-border text-card-foreground font-sans relative min-w-[800px] max-w-4xl mx-auto print:shadow-none print:border-none print:bg-white">
      {/* Watermark */}
      {watermarkDataUrl && (
        <div
          className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none print:opacity-[0.03]"
          style={{ zIndex: 0 }}
          data-ai-hint="abstract pattern"
        >
          <img 
            src={watermarkDataUrl}
            alt="Watermark"
            style={{
              maxWidth: '80%', 
              maxHeight: '80%',
              objectFit: 'contain',
            }}
          />
        </div>
      )}

      <div className="relative" style={{ zIndex: 1 }}> {/* Content wrapper to be above watermark */}
        {/* Header */}
        <div className="flex justify-between items-start mb-10 pb-4 border-b border-border print:border-gray-300">
          <div className="flex items-center gap-4">
            {companyLogoDataUrl && (
              <div className="relative w-20 h-20 mr-3 print:w-16 print:h-16" data-ai-hint="company brand">
                <Image src={companyLogoDataUrl} alt={`${companyName} Logo`} layout="fill" objectFit="contain" />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-primary print:text-black">{companyName || "Your Company"}</h1>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-3xl font-semibold uppercase text-gray-700 dark:text-gray-300 print:text-black">Invoice</h2>
            <p className="text-muted-foreground mt-1 print:text-gray-600">{invoiceNumber}</p> {/* Removed # prefix */}
            <p className="text-sm text-muted-foreground print:text-gray-600">
                Invoice Date: {format(parsedInvoiceDate, "MMMM d, yyyy")}
            </p>
            {/* Due Date Removed
            <p className="text-sm text-muted-foreground print:text-gray-600">
                Due Date: {format(parsedDueDate, "MMMM d, yyyy")}
            </p>
            */}
          </div>
        </div>

        {/* Client Info & Service Dates */}
        <div className="grid grid-cols-2 gap-8 mb-10">
          <div>
            <h3 className="font-semibold text-foreground mb-1 print:text-black">Bill To:</h3>
            <p className="font-medium text-primary print:text-black">{customerName}</p>
          </div>
          <div className="text-right">
            <h3 className="font-semibold text-foreground mb-1 print:text-black">Service Period:</h3>
            <p className="text-sm text-muted-foreground print:text-gray-600">
              Start: {format(displayServiceStartDate, "MMM d, yyyy")} {startTime}
            </p>
            <p className="text-sm text-muted-foreground print:text-gray-600">
              End: {format(displayServiceEndDate, "MMM d, yyyy")} {endTime}
            </p>
          </div>
        </div>


        {/* Items Table */}
        <div className="overflow-x-auto mb-10">
          <table className="w-full table-auto border-collapse border border-border print:border-gray-400">
            <thead className="bg-secondary/50 print:bg-gray-100">
              <tr>
                <th className="p-3 text-left font-semibold text-foreground border border-border print:border-gray-400 print:text-black w-3/5">Description</th>
                <th className="p-3 text-right font-semibold text-foreground border border-border print:border-gray-400 print:text-black w-1/5">Duration</th>
                <th className="p-3 text-right font-semibold text-foreground border border-border print:border-gray-400 print:text-black w-1/5">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border print:border-gray-400">
                <td className="p-3 align-top border border-border print:border-gray-400">
                  <p className="font-medium text-foreground print:text-black">Service Rendered</p>
                  <p className="text-xs text-muted-foreground print:text-gray-500">
                    Detailed service period is mentioned above.
                  </p>
                </td>
                <td className="p-3 text-right align-top text-muted-foreground border border-border print:border-gray-400 print:text-gray-700">
                  {duration ? `${duration.days}d ${duration.hours}h` : "N/A"}
                </td>
                <td className="p-3 text-right align-top text-foreground border border-border print:border-gray-400 print:text-black">{formatCurrency(totalFee)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        {/* Total */}
        <div className="flex justify-end mb-10">
          <div className="w-full max-w-sm">
            <div className="flex justify-between py-2 border-b border-border print:border-gray-400">
              <span className="font-medium text-muted-foreground print:text-gray-600">Subtotal:</span>
              <span className="font-medium text-foreground print:text-black">{formatCurrency(totalFee)}</span>
            </div>
            <div className="flex justify-between py-3 bg-primary/10 dark:bg-primary/20 px-3 rounded-md mt-2 print:bg-gray-100">
              <span className="text-xl font-bold text-primary print:text-black">Total:</span>
              <span className="text-xl font-bold text-primary print:text-black">{formatCurrency(totalFee)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoiceNotes && (
          <div className="mb-10 pt-4 border-t border-border print:border-gray-400">
            <h4 className="font-semibold text-foreground mb-1 print:text-black">Notes:</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-line print:text-gray-600">{invoiceNotes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pt-6 border-t border-border print:border-gray-400 print:text-gray-500">
          <p>If you have any questions concerning this invoice, please contact {companyName || "us"}.</p>
          {/* Copyright line removed
          <p>&copy; {new Date().getFullYear()} {companyName || "Your Company"}. All rights reserved.</p> 
          */}
        </div>
      </div>
    </div>
  );
};

