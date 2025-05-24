
"use client";

import type { StoredInvoiceData } from "@/lib/invoice-types";
import { format, parseISO, isValid, differenceInCalendarDays } from "date-fns";
import { cn } from "@/lib/utils"; // Added this import

interface InvoiceTemplateProps {
  data: StoredInvoiceData;
}

const formatCurrency = (amount?: number) => {
  if (typeof amount !== 'number') return '₹0.00';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
};

export const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({ data }) => {
  const {
    companyName,
    companyLogoDataUrl,
    customerName,
    invoiceNumber,
    invoiceDate,
    items,
    subTotal, // Use subTotal
    globalDiscountType,
    globalDiscountValue,
    totalFee, // Final totalFee
    invoiceNotes,
    watermarkDataUrl,
    watermarkOpacity,
    themeColor = 'default',
  } = data;

  const defaultDisplayDate = new Date();
  const parsedInvoiceDate = invoiceDate && isValid(parseISO(invoiceDate)) ? parseISO(invoiceDate) : defaultDisplayDate;
  const displayWatermarkOpacity = typeof watermarkOpacity === 'number' ? watermarkOpacity : 0.05;

  let globalDiscountAmount = 0;
  if (globalDiscountValue && globalDiscountValue > 0 && subTotal) {
    if (globalDiscountType === 'percentage') {
      globalDiscountAmount = subTotal * (globalDiscountValue / 100);
    } else {
      globalDiscountAmount = globalDiscountValue;
    }
  }


  return (
    <div
      className={cn(
        "bg-[var(--invoice-background)] text-[var(--invoice-text)] font-sans shadow-lg print:shadow-none min-w-[320px] md:min-w-[700px] lg:min-w-[800px] max-w-4xl mx-auto print:border-none print:bg-white",
        `theme-${themeColor}`
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
          style={{ zIndex: 0 }}
        >
          <img
            src={watermarkDataUrl}
            alt="Watermark"
            style={{
              maxWidth: '80%',
              maxHeight: '70%',
              objectFit: 'contain',
              opacity: displayWatermarkOpacity,
            }}
            data-ai-hint="abstract pattern"
          />
        </div>
      )}

      {/* Content Layer */}
      <div
        className="relative p-6 sm:p-8 md:p-10"
        style={{ zIndex: 1 }}
      >
        <header className="flex flex-col sm:flex-row justify-between items-start pb-6 mb-6 border-b border-[var(--invoice-border-color)]">
          <div className="flex items-center gap-4 mb-4 sm:mb-0">
            {companyLogoDataUrl && (
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 print:w-16 print:h-16 shrink-0" data-ai-hint="company brand">
                <img src={companyLogoDataUrl} alt={`${companyName || 'Your Company Name'} Logo`} style={{width: '100%', height: '100%', objectFit: 'contain'}} />
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
          </div>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <div>
            <h3 className="text-sm font-semibold uppercase text-[var(--invoice-muted-text)] mb-1 print:text-gray-600">BILL TO</h3>
            <p className="text-lg font-medium text-[var(--invoice-text)] print:text-black">{customerName || "Client Name"}</p>
          </div>
        </section>

        <section className="mb-8">
          <div className="overflow-x-auto rounded-md border border-[var(--invoice-border-color)]">
            <table className="w-full table-auto">
              <thead className="bg-[var(--invoice-header-bg)] print:bg-gray-100">
                <tr>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--invoice-muted-text)] print:text-gray-600 w-2/5 sm:w-[45%]">Description</th>
                  <th className="p-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--invoice-muted-text)] print:text-gray-600">Qty/Days</th>
                  <th className="p-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--invoice-muted-text)] print:text-gray-600">Rate (₹)</th>
                  <th className="p-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--invoice-muted-text)] print:text-gray-600">Disc (%)</th>
                  <th className="p-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--invoice-muted-text)] print:text-gray-600">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--invoice-border-color)]">
                {items && items.length > 0 ? (
                  items.map((item, index) => {
                    const itemStartDate = item.itemStartDate && isValid(parseISO(item.itemStartDate)) ? parseISO(item.itemStartDate) : null;
                    const itemEndDate = item.itemEndDate && isValid(parseISO(item.itemEndDate)) ? parseISO(item.itemEndDate) : null;
                    let displayQuantity = Number(item.quantity) || 0;

                    if (itemStartDate && itemEndDate && itemEndDate >= itemStartDate) {
                        displayQuantity = differenceInCalendarDays(itemEndDate, itemStartDate) + 1;
                    }

                    const itemRate = Number(item.rate) || 0;
                    const itemDiscount = Number(item.discount) || 0;
                    const itemSubtotal = displayQuantity * itemRate;
                    const discountedAmount = itemSubtotal * (1 - itemDiscount / 100);

                    return (
                    <tr key={item.id || index} className="bg-[var(--invoice-background)] hover:bg-[var(--invoice-header-bg)]/50 print:bg-white">
                      <td className="p-3 align-top text-[var(--invoice-text)] print:text-black">
                        {item.description}
                        {itemStartDate && itemEndDate && (
                          <div className="text-xs text-[var(--invoice-muted-text)] print:text-gray-500 mt-1">
                            ({format(itemStartDate, "MMM d, yyyy")} - {format(itemEndDate, "MMM d, yyyy")})
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right align-top text-[var(--invoice-text)] print:text-gray-700">
                        {displayQuantity}
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
                    <td colSpan={5} className="p-3 text-center text-[var(--invoice-muted-text)] print:text-gray-500">
                      No items listed.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="flex justify-end mb-8">
          <div className="w-full sm:w-1/2 md:w-2/5 lg:w-1/3 space-y-2">
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

        {invoiceNotes && (
          <section className="mb-8 pt-4 border-t border-[var(--invoice-border-color)]">
            <h4 className="text-sm font-semibold uppercase text-[var(--invoice-muted-text)] mb-1 print:text-gray-600">Notes & Terms</h4>
            <p className="text-xs text-[var(--invoice-muted-text)] whitespace-pre-line print:text-gray-600">{invoiceNotes}</p>
          </section>
        )}

        <footer className="text-center text-xs text-[var(--invoice-muted-text)] pt-6 border-t border-[var(--invoice-border-color)] print:text-gray-500">
          <p>Thank you for your business!</p>
        </footer>
      </div>
    </div>
  );
};

