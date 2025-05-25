
"use client";

import type { StoredInvoiceData } from "@/lib/invoice-types";
import { format, parseISO, isValid } from "date-fns";
import { cn } from "@/lib/utils";
import React from 'react'; // Import React for React.memo

interface InvoiceTemplateProps {
  data: StoredInvoiceData;
  forceLightMode?: boolean; // New prop
}

const formatCurrency = (amount?: number) => {
  if (typeof amount !== 'number') return '₹0.00';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
};

// Helper component for the "Classic" style header
const ClassicHeader: React.FC<Omit<InvoiceTemplateProps, 'forceLightMode'>> = ({ data }) => {
  const { companyName, companyLogoDataUrl, customerName, invoiceNumber, invoiceDate, dueDate } = data;
  const defaultDisplayDate = new Date();
  const parsedInvoiceDate = invoiceDate && isValid(parseISO(invoiceDate)) ? parseISO(invoiceDate) : defaultDisplayDate;
  const parsedDueDate = dueDate && isValid(parseISO(dueDate)) ? parseISO(dueDate) : null;

  return (
    <>
      <header className="flex flex-col sm:flex-row justify-between items-start pb-6 mb-6 border-b border-[var(--invoice-border-color)]">
        <div className="flex items-center gap-4 mb-4 sm:mb-0">
          {companyLogoDataUrl && (
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 print:w-16 print:h-16 shrink-0">
              <img src={companyLogoDataUrl} alt={`${companyName || 'Your Company Name'} Logo`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--invoice-primary-color)] print:text-black">{companyName || "Your Company Name"}</h1>
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
          {parsedDueDate && (
            <p className="text-sm text-[var(--invoice-muted-text)] print:text-gray-600">
              <span className="font-medium text-[var(--invoice-text)] print:text-black">Due Date:</span> {format(parsedDueDate, "MMMM d, yyyy")}
            </p>
          )}
        </div>
      </header>
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <div>
          <h3 className="text-sm font-semibold uppercase text-[var(--invoice-muted-text)] mb-1 print:text-gray-600">BILL TO</h3>
          <p className="text-lg font-medium text-[var(--invoice-text)] print:text-black">{customerName || "Client Name"}</p>
        </div>
      </section>
    </>
  );
};

// Helper component for the "Modern" style header
const ModernHeader: React.FC<Omit<InvoiceTemplateProps, 'forceLightMode'>> = ({ data }) => {
  const { companyName, companyLogoDataUrl, customerName, invoiceNumber, invoiceDate, dueDate } = data;
  const defaultDisplayDate = new Date();
  const parsedInvoiceDate = invoiceDate && isValid(parseISO(invoiceDate)) ? parseISO(invoiceDate) : defaultDisplayDate;
  const parsedDueDate = dueDate && isValid(parseISO(dueDate)) ? parseISO(dueDate) : null;

  return (
    <>
      <header className="pb-6 mb-6 border-b border-[var(--invoice-border-color)]">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          {/* Left Side: Logo and Company Name */}
          <div className="flex items-center gap-3">
            {companyLogoDataUrl && (
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 print:w-12 print:h-12 shrink-0">
                <img src={companyLogoDataUrl} alt={`${companyName || 'Your Company Name'} Logo`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
            )}
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--invoice-primary-color)] print:text-black">{companyName || "Your Company Name"}</h1>
          </div>

          {/* Right Side: Invoice Title and Details */}
          <div className="text-left sm:text-right w-full sm:w-auto mt-4 sm:mt-0">
            <h2 className="text-2xl sm:text-3xl font-semibold uppercase text-[var(--invoice-muted-text)] print:text-gray-700">INVOICE</h2>
            <p className="text-xs text-[var(--invoice-muted-text)] mt-1 print:text-gray-600">
              <span className="font-medium text-[var(--invoice-text)] print:text-black">No:</span> {invoiceNumber}
            </p>
            <p className="text-xs text-[var(--invoice-muted-text)] print:text-gray-600">
              <span className="font-medium text-[var(--invoice-text)] print:text-black">Date:</span> {format(parsedInvoiceDate, "MMMM d, yyyy")}
            </p>
            {parsedDueDate && (
              <p className="text-xs text-[var(--invoice-muted-text)] print:text-gray-600">
                <span className="font-medium text-[var(--invoice-text)] print:text-black">Due:</span> {format(parsedDueDate, "MMMM d, yyyy")}
              </p>
            )}
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-[var(--invoice-border-color)]">
            <h3 className="text-sm font-semibold uppercase text-[var(--invoice-muted-text)] mb-1 print:text-gray-600">BILL TO:</h3>
            <p className="text-md font-medium text-[var(--invoice-text)] print:text-black">{customerName || "Client Name"}</p>
        </div>
      </header>
    </>
  );
};


export const InvoiceTemplate: React.FC<InvoiceTemplateProps> = React.memo(function InvoiceTemplate({ data, forceLightMode = false }) {
  const {
    items,
    subTotal,
    globalDiscountType,
    globalDiscountValue,
    totalFee,
    invoiceNotes,
    termsAndConditions,
    watermarkDataUrl,
    watermarkOpacity,
    themeColor = 'default',
    fontTheme = 'default',
    templateStyle = 'classic',
  } = data;

  const displayWatermarkOpacity = typeof watermarkOpacity === 'number' ? watermarkOpacity : 0.05;

  let globalDiscountAmount = 0;
  if (globalDiscountValue && globalDiscountValue > 0 && subTotal) {
    if (globalDiscountType === 'percentage') {
      globalDiscountAmount = subTotal * (globalDiscountValue / 100);
    } else {
      globalDiscountAmount = globalDiscountValue;
    }
  }

  const fontThemeClass = `font-theme-${fontTheme}`;

  return (
    <div
      className={cn(
        "bg-[var(--invoice-background)] text-[var(--invoice-text)] shadow-lg print:shadow-none min-w-[320px] md:min-w-[700px] lg:min-w-[800px] max-w-4xl mx-auto print:border-none print:bg-white",
        `theme-${themeColor}`,
        fontThemeClass,
        forceLightMode && "invoice-render-light" // Apply force light mode class
      )}
      style={{
        width: '100%',
        border: '1px solid var(--invoice-border-color)',
        borderRadius: '0.5rem',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* Watermark Layer */}
      {watermarkDataUrl && (
         <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex: 0 }} // Watermark is at the bottom
         >
            <img
                src={watermarkDataUrl}
                alt="Watermark"
                style={{
                maxWidth: '70%', 
                maxHeight: '60%',
                objectFit: 'contain',
                opacity: displayWatermarkOpacity,
                filter: templateStyle === 'modern' ? 'grayscale(50%)' : 'none', 
                }}
                data-ai-hint="background pattern"
            />
        </div>
      )}

      {/* Content Layer */}
      <div
        className="relative p-6 sm:p-8 md:p-10"
        style={{ zIndex: 1 }} // Content is on top
      >
        {templateStyle === 'modern' ? <ModernHeader data={data} /> : <ClassicHeader data={data} />}

        <section className="mb-8">
          <div className="overflow-x-auto rounded-md border border-[var(--invoice-border-color)]">
            <table className="w-full table-auto">
              <thead className={cn(
                "bg-[var(--invoice-header-bg)] print:bg-gray-100",
                templateStyle === 'modern' && "border-b-2 border-[var(--invoice-primary-color)]"
              )}>
                <tr>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--invoice-muted-text)] print:text-gray-600 w-2/5 sm:w-[40%]">Description</th>
                  <th className="p-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--invoice-muted-text)] print:text-gray-600">Qty/Dur.</th>
                  <th className="p-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--invoice-muted-text)] print:text-gray-600">Unit</th>
                  <th className="p-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--invoice-muted-text)] print:text-gray-600">Rate (₹)</th>
                  <th className="p-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--invoice-muted-text)] print:text-gray-600">Disc (%)</th>
                  <th className="p-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--invoice-muted-text)] print:text-gray-600">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--invoice-border-color)]">
                {items && items.length > 0 ? (
                  items.map((item, index) => {
                    let displayDurationString = "";
                    if (item.itemStartDate && item.itemEndDate && item.itemStartTime && item.itemEndTime &&
                        isValid(parseISO(item.itemStartDate)) && isValid(parseISO(item.itemEndDate))) {
                        try {
                            const startDateTime = new Date(parseISO(item.itemStartDate));
                            const [startH, startM] = item.itemStartTime.split(':').map(Number);
                            startDateTime.setHours(startH, startM, 0, 0);

                            const endDateTime = new Date(parseISO(item.itemEndDate));
                            const [endH, endM] = item.itemEndTime.split(':').map(Number);
                            endDateTime.setHours(endH, endM, 0, 0);

                            if (endDateTime.getTime() > startDateTime.getTime()) {
                                const diffMs = endDateTime.getTime() - startDateTime.getTime();
                                const totalMinutes = Math.floor(diffMs / (1000 * 60));
                                const totalHoursDecimal = totalMinutes / 60;

                                const fullDays = Math.floor(totalHoursDecimal / 24);
                                const remainingHoursAfterFullDays = Math.floor(totalHoursDecimal % 24);
                                const remainingMinutesAfterFullHours = Math.round(totalMinutes % 60);

                                let durationParts = [];
                                if (fullDays > 0) durationParts.push(`${fullDays} day${fullDays > 1 ? 's' : ''}`);
                                if (remainingHoursAfterFullDays > 0) durationParts.push(`${remainingHoursAfterFullDays} hour${remainingHoursAfterFullDays > 1 ? 's' : ''}`);
                                if (remainingMinutesAfterFullHours > 0 && (fullDays > 0 || remainingHoursAfterFullDays > 0)) {
                                    durationParts.push(`${remainingMinutesAfterFullHours} min${remainingMinutesAfterFullHours > 1 ? 's' : ''}`);
                                } else if (fullDays === 0 && remainingHoursAfterFullDays === 0 && remainingMinutesAfterFullHours > 0) {
                                     durationParts.push(`${remainingMinutesAfterFullHours} min${remainingMinutesAfterFullHours > 1 ? 's' : ''}`);
                                }

                                if (durationParts.length > 0) {
                                    displayDurationString = `(Duration: ${durationParts.join(', ')})`;
                                }
                            }
                        } catch (e) { console.error("Error formatting duration string:", e); }
                    } else if (item.itemStartDate && item.itemEndDate && isValid(parseISO(item.itemStartDate)) && isValid(parseISO(item.itemEndDate))) {
                         displayDurationString = `(${format(parseISO(item.itemStartDate), "MMM d, yyyy")} - ${format(parseISO(item.itemEndDate), "MMM d, yyyy")})`;
                    }


                    const itemQuantity = Number(item.quantity) || 0;
                    const itemRate = Number(item.rate) || 0;
                    const itemDiscount = Number(item.discount) || 0;
                    const itemSubtotal = itemQuantity * itemRate;
                    const discountedAmount = itemSubtotal * (1 - itemDiscount / 100);

                    return (
                    <tr key={item.id || index} className="bg-[var(--invoice-background)] hover:bg-[var(--invoice-header-bg)]/50 print:bg-white">
                      <td className="p-3 align-top text-[var(--invoice-text)] print:text-black">
                        {item.description}
                        {displayDurationString && (
                          <div className="text-xs text-[var(--invoice-muted-text)] print:text-gray-500 mt-1">
                            {displayDurationString}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right align-top text-[var(--invoice-text)] print:text-gray-700">
                        {itemQuantity}
                      </td>
                      <td className="p-3 text-right align-top text-[var(--invoice-text)] print:text-gray-700">
                        {item.unit || '-'}
                      </td>
                      <td className="p-3 text-right align-top text-[var(--invoice-text)] print:text-gray-700">
                        {formatCurrency(itemRate)}
                      </td>
                      <td className="p-3 text-right align-top text-[var(--invoice-text)] print:text-gray-700">
                        {itemDiscount > 0 ? `${itemDiscount}%` : '-'}
                      </td>
                      <td className="p-3 text-right align-top text-[var(--invoice-text)] print:text-black">
                        {formatCurrency(discountedAmount)}
                      </td>
                    </tr>
                  )})
                ) : (
                  <tr className="bg-[var(--invoice-background)] print:bg-white">
                    <td colSpan={6} className="p-3 text-center text-[var(--invoice-muted-text)] print:text-gray-500">
                      No items listed.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="flex justify-end mb-8">
          <div className={cn(
              "w-full sm:w-1/2 md:w-2/5 lg:w-1/3 space-y-2",
              templateStyle === 'modern' && "md:w-1/2 lg:w-2/5"
            )}>
             <div className="flex justify-between items-center py-2 px-3 border-b border-[var(--invoice-border-color)]">
              <span className="text-sm text-[var(--invoice-muted-text)] print:text-gray-600">SUBTOTAL:</span>
              <span className="text-sm font-medium text-[var(--invoice-text)] print:text-black">{formatCurrency(subTotal)}</span>
            </div>
            {globalDiscountAmount > 0 && (
              <div className="flex justify-between items-center py-2 px-3 border-b border-[var(--invoice-border-color)]">
                <span className="text-sm text-[var(--invoice-muted-text)] print:text-gray-600">
                  DISCOUNT
                  {globalDiscountType === 'percentage' && globalDiscountValue ? ` (${globalDiscountValue}%)` : ''}
                  :
                </span>
                <span className="text-sm font-medium text-[var(--invoice-text)] print:text-black">- {formatCurrency(globalDiscountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-3 bg-[var(--invoice-primary-color)]/10 dark:bg-[var(--invoice-primary-color)]/20 px-3 rounded-md">
              <span className="text-lg font-bold text-[var(--invoice-primary-color)] print:text-black">TOTAL:</span>
              <span className="text-lg font-bold text-[var(--invoice-primary-color)] print:text-black">{formatCurrency(totalFee)}</span>
            </div>
          </div>
        </section>

        <div className={cn(
          "grid gap-6",
           (invoiceNotes && termsAndConditions && templateStyle === 'classic') && "grid-cols-1", // Stack if both exist in classic
           (invoiceNotes && termsAndConditions && templateStyle === 'modern') && "md:grid-cols-2", // Side-by-side if both exist in modern
           (!invoiceNotes || !termsAndConditions) && "grid-cols-1" // Always single column if one is missing
        )}>
          {invoiceNotes && (
            <section className="pt-4 border-t border-[var(--invoice-border-color)]">
              <h4 className="text-sm font-semibold uppercase text-[var(--invoice-muted-text)] mb-1 print:text-gray-600">Notes</h4>
              <p className="text-sm text-[var(--invoice-muted-text)] whitespace-pre-line print:text-gray-600">{invoiceNotes}</p>
            </section>
          )}

          {termsAndConditions && (
            <section className={cn(
              "pt-4 border-t border-[var(--invoice-border-color)]",
               // Add left border only if notes exist and template is modern and on md+ screens
              (invoiceNotes && templateStyle === 'modern') && "md:border-t-0 md:pt-0 md:pl-6 md:border-l"
            )}>
              <h4 className="text-sm font-semibold uppercase text-[var(--invoice-muted-text)] mb-1 print:text-gray-600">Terms &amp; Conditions</h4>
              <p className="text-xs text-[var(--invoice-muted-text)]/80 whitespace-pre-line print:text-gray-500 print:text-[10px]">{termsAndConditions}</p>
            </section>
          )}
        </div>


        <footer className="text-center text-xs text-[var(--invoice-muted-text)] pt-6 mt-8 border-t border-[var(--invoice-border-color)] print:text-gray-500">
          <p>Thank you for your business!</p>
        </footer>
      </div>
    </div>
  );
});
