
"use client";

import type { StoredInvoiceData } from "@/lib/invoice-types";
import { format, parseISO } from "date-fns";
import Image from "next/image"; // Keep Next/Image for web display optimization

interface InvoiceTemplateProps {
  data: StoredInvoiceData;
  watermarkDataUrl?: string | null;
}

const formatCurrency = (amount?: number) => {
  if (typeof amount !== 'number') return '₹0.00'; // Default to 0.00 if undefined
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
};

export const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({ data, watermarkDataUrl }) => {
  const {
    companyName,
    companyLogoDataUrl,
    customerName,
    invoiceNumber,
    invoiceDate,
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
  
  const displayServiceStartDate = startDate instanceof Date && !isNaN(startDate.valueOf()) 
                                  ? startDate 
                                  : (startDate ? (parseISO(startDate as unknown as string) instanceof Date && !isNaN(parseISO(startDate as unknown as string).valueOf()) ? parseISO(startDate as unknown as string) : defaultDisplayDate) : defaultDisplayDate);
  const displayServiceEndDate = endDate instanceof Date && !isNaN(endDate.valueOf()) 
                                ? endDate 
                                : (endDate ? (parseISO(endDate as unknown as string) instanceof Date && !isNaN(parseISO(endDate as unknown as string).valueOf()) ? parseISO(endDate as unknown as string) : defaultDisplayDate) : defaultDisplayDate);

  return (
    <div className="bg-[var(--invoice-background)] text-[var(--invoice-text)] font-sans shadow-lg print:shadow-none min-w-[320px] md:min-w-[700px] lg:min-w-[800px] max-w-4xl mx-auto print:border-none print:bg-white"
         style={{ width: '100%', border: '1px solid var(--invoice-border-color)', borderRadius: '0.5rem', overflow: 'hidden' }}>
      
      {/* Watermark positioned behind content */}
      {watermarkDataUrl && (
        <div
          className="absolute inset-0 flex items-center justify-center opacity-[0.03] print:opacity-[0.02] pointer-events-none"
          style={{ zIndex: 0 }}
          data-ai-hint="abstract pattern"
        >
          {/* Standard img tag for potentially better html2canvas compatibility */}
          <img 
            src={watermarkDataUrl}
            alt="Watermark"
            style={{
              width: '80%', 
              height: 'auto',
              maxWidth: '500px',
              maxHeight: '80%',
              objectFit: 'contain',
            }}
          />
        </div>
      )}

      <div className="relative p-6 sm:p-8 md:p-10" style={{ zIndex: 1 }}> {/* Content wrapper */}
        {/* Header Section */}
        <header className="flex flex-col sm:flex-row justify-between items-start pb-6 mb-6 border-b border-[var(--invoice-border-color)]">
          <div className="flex items-center gap-4 mb-4 sm:mb-0">
            {companyLogoDataUrl && (
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 print:w-16 print:h-16 shrink-0" data-ai-hint="company brand">
                <Image src={companyLogoDataUrl} alt={`${companyName || 'Company'} Logo`} layout="fill" objectFit="contain" />
              </div>
            )}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--invoice-primary-color)] print:text-black">{companyName || "Your Company Name"}</h1>
              {/* Company Address can be added here if needed in future */}
            </div>
          </div>
          <div className="text-left sm:text-right w-full sm:w-auto">
            <h2 className="text-3xl sm:text-4xl font-semibold uppercase text-[var(--invoice-muted-text)] print:text-gray-700">INVOICE</h2>
            <p className="text-sm text-[var(--invoice-muted-text)] mt-1 print:text-gray-600">
              <span className="font-medium text-[var(--invoice-text)] print:text-black">Invoice No:</span> {invoiceNumber}
            </p>
            <p className="text-sm text-[var(--invoice-muted-text)] print:text-gray-600">
              <span className="font-medium text-[var(--invoice-text)] print:text-black">Date:</span> {format(parsedInvoiceDate, "MMMM d, yyyy")}
            </p>
          </div>
        </header>

        {/* Client Info & Service Dates Section */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <div>
            <h3 className="text-sm font-semibold uppercase text-[var(--invoice-muted-text)] mb-1 print:text-gray-600">BILL TO</h3>
            <p className="text-lg font-medium text-[var(--invoice-text)] print:text-black">{customerName || "Client Name"}</p>
            {/* Client Address can be added here if needed in future */}
          </div>
          <div className="sm:text-right">
            <h3 className="text-sm font-semibold uppercase text-[var(--invoice-muted-text)] mb-1 print:text-gray-600">SERVICE DETAILS</h3>
            <p className="text-sm text-[var(--invoice-text)] print:text-gray-700">
              <span className="font-medium">Start:</span> {format(displayServiceStartDate, "MMM d, yyyy")} {startTime}
            </p>
            <p className="text-sm text-[var(--invoice-text)] print:text-gray-700">
              <span className="font-medium">End:</span> {format(displayServiceEndDate, "MMM d, yyyy")} {endTime}
            </p>
          </div>
        </section>

        {/* Items Table Section */}
        <section className="mb-8">
          <div className="overflow-x-auto rounded-md border border-[var(--invoice-border-color)]">
            <table className="w-full table-auto">
              <thead className="bg-[var(--invoice-header-bg)] print:bg-gray-100">
                <tr>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--invoice-muted-text)] print:text-gray-600 w-3/5 sm:w-auto">Description</th>
                  <th className="p-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--invoice-muted-text)] print:text-gray-600">Duration</th>
                  <th className="p-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--invoice-muted-text)] print:text-gray-600">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--invoice-border-color)]">
                <tr className="bg-[var(--invoice-background)] hover:bg-[var(--invoice-header-bg)]/50 print:bg-white">
                  <td className="p-3 align-top">
                    <p className="font-medium text-[var(--invoice-text)] print:text-black">Service Rendered</p>
                    <p className="text-xs text-[var(--invoice-muted-text)] print:text-gray-500">
                      Consultation / Project Work as per agreement.
                    </p>
                  </td>
                  <td className="p-3 text-right align-top text-[var(--invoice-text)] print:text-gray-700">
                    {duration ? `${duration.days}d ${duration.hours}h` : "N/A"}
                  </td>
                  <td className="p-3 text-right align-top text-[var(--invoice-text)] print:text-black">{formatCurrency(totalFee)}</td>
                </tr>
                {/* Add more item rows here if functionality expands */}
              </tbody>
            </table>
          </div>
        </section>
        
        {/* Totals Section */}
        <section className="flex justify-end mb-8">
          <div className="w-full sm:w-1/2 md:w-2/5 lg:w-1/3 space-y-2">
            <div className="flex justify-between py-2 border-b border-dashed border-[var(--invoice-border-color)]">
              <span className="text-sm text-[var(--invoice-muted-text)] print:text-gray-600">Subtotal:</span>
              <span className="text-sm font-medium text-[var(--invoice-text)] print:text-black">{formatCurrency(totalFee)}</span>
            </div>
            {/* Tax line (can be implemented later) */}
            {/* <div className="flex justify-between py-2 border-b border-dashed border-[var(--invoice-border-color)]">
              <span className="text-sm text-[var(--invoice-muted-text)] print:text-gray-600">Tax (0%):</span>
              <span className="text-sm font-medium text-[var(--invoice-text)] print:text-black">{formatCurrency(0)}</span>
            </div> */}
            <div className="flex justify-between items-center py-3 bg-[var(--invoice-primary-color)]/10 dark:bg-[var(--invoice-primary-color)]/20 px-3 rounded-md">
              <span className="text-lg font-bold text-[var(--invoice-primary-color)] print:text-black">TOTAL:</span>
              <span className="text-lg font-bold text-[var(--invoice-primary-color)] print:text-black">{formatCurrency(totalFee)}</span>
            </div>
          </div>
        </section>

        {/* Notes Section */}
        {invoiceNotes && (
          <section className="mb-8 pt-4 border-t border-[var(--invoice-border-color)]">
            <h4 className="text-sm font-semibold uppercase text-[var(--invoice-muted-text)] mb-1 print:text-gray-600">Notes & Terms</h4>
            <p className="text-xs text-[var(--invoice-muted-text)] whitespace-pre-line print:text-gray-600">{invoiceNotes}</p>
          </section>
        )}

        {/* Footer Section */}
        <footer className="text-center text-xs text-[var(--invoice-muted-text)] pt-6 border-t border-[var(--invoice-border-color)] print:text-gray-500">
          <p>Thank you for your business!</p>
          <p>If you have any questions concerning this invoice, please contact: {companyName || "Your Company Name"}.</p>
        </footer>
      </div>
    </div>
  );
};
