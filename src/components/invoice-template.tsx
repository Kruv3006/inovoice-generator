
"use client";

import type { StoredInvoiceData, AvailableCurrency } from "@/lib/invoice-types";
import { format, parseISO, isValid } from "date-fns";
import { cn } from "@/lib/utils";
import React from 'react'; 
import { MapPin, Mail, Phone } from "lucide-react";
import { getCompanyProfile } from "@/lib/settings-store"; // To get showClientAddressOnInvoice setting

interface InvoiceTemplateProps {
  data: StoredInvoiceData;
  forceLightMode?: boolean; 
}

const formatCurrency = (amount?: number, currency?: AvailableCurrency) => {
  if (typeof amount !== 'number') return `${currency?.symbol || '₹'}0.00`;
  const currentCurrency = currency || { symbol: '₹', code: 'INR' }; // Default to INR
  try {
    return new Intl.NumberFormat('en-IN', { // Using 'en-IN' as a base, currency symbol will override
        style: 'currency', 
        currency: currentCurrency.code, 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    }).format(amount);
  } catch (e) { // Fallback for unsupported currency codes by Intl (should be rare with common ones)
    return `${currentCurrency.symbol}${amount.toFixed(2)}`;
  }
};

// Helper component for the "Classic" style header
const ClassicHeader: React.FC<Omit<InvoiceTemplateProps, 'forceLightMode'>> = ({ data }) => {
  const { companyName, companyLogoDataUrl, customerName, invoiceNumber, invoiceDate, dueDate, currency, customerAddress, customerEmail, customerPhone } = data;
  const defaultDisplayDate = new Date();
  const parsedInvoiceDate = invoiceDate && isValid(parseISO(invoiceDate)) ? parseISO(invoiceDate) : defaultDisplayDate;
  const parsedDueDate = dueDate && isValid(parseISO(dueDate)) ? parseISO(dueDate) : null;
  const companyProfile = getCompanyProfile();
  const showClientAddress = companyProfile?.showClientAddressOnInvoice !== false;


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
          {showClientAddress && customerAddress && <p className="text-xs text-[var(--invoice-muted-text)] whitespace-pre-line print:text-gray-600"><MapPin className="inline-block mr-1 h-3 w-3 align-middle"/>{customerAddress}</p>}
          {customerEmail && <p className="text-xs text-[var(--invoice-muted-text)] print:text-gray-600"><Mail className="inline-block mr-1 h-3 w-3 align-middle"/>{customerEmail}</p>}
          {customerPhone && <p className="text-xs text-[var(--invoice-muted-text)] print:text-gray-600"><Phone className="inline-block mr-1 h-3 w-3 align-middle"/>{customerPhone}</p>}
        </div>
      </section>
    </>
  );
};

// Helper component for the "Modern" style header
const ModernHeader: React.FC<Omit<InvoiceTemplateProps, 'forceLightMode'>> = ({ data }) => {
  const { companyName, companyLogoDataUrl, customerName, invoiceNumber, invoiceDate, dueDate, currency, customerAddress, customerEmail, customerPhone } = data;
  const defaultDisplayDate = new Date();
  const parsedInvoiceDate = invoiceDate && isValid(parseISO(invoiceDate)) ? parseISO(invoiceDate) : defaultDisplayDate;
  const parsedDueDate = dueDate && isValid(parseISO(dueDate)) ? parseISO(dueDate) : null;
  const companyProfile = getCompanyProfile();
  const showClientAddress = companyProfile?.showClientAddressOnInvoice !== false;

  return (
    <>
      <header className="pb-6 mb-6 border-b border-[var(--invoice-border-color)]">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="flex items-center gap-3">
            {companyLogoDataUrl && (
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 print:w-12 print:h-12 shrink-0">
                <img src={companyLogoDataUrl} alt={`${companyName || 'Your Company Name'} Logo`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
            )}
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--invoice-primary-color)] print:text-black">{companyName || "Your Company Name"}</h1>
          </div>
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
            {showClientAddress && customerAddress && <p className="text-xs text-[var(--invoice-muted-text)] whitespace-pre-line print:text-gray-600"><MapPin className="inline-block mr-1 h-3 w-3 align-middle"/>{customerAddress}</p>}
            {customerEmail && <p className="text-xs text-[var(--invoice-muted-text)] print:text-gray-600"><Mail className="inline-block mr-1 h-3 w-3 align-middle"/>{customerEmail}</p>}
            {customerPhone && <p className="text-xs text-[var(--invoice-muted-text)] print:text-gray-600"><Phone className="inline-block mr-1 h-3 w-3 align-middle"/>{customerPhone}</p>}
        </div>
      </header>
    </>
  );
};

const CompactHeader: React.FC<Omit<InvoiceTemplateProps, 'forceLightMode'>> = ({ data }) => {
  const { companyName, companyLogoDataUrl, customerName, invoiceNumber, invoiceDate, dueDate, currency, customerAddress, customerEmail, customerPhone } = data;
  const defaultDisplayDate = new Date();
  const parsedInvoiceDate = invoiceDate && isValid(parseISO(invoiceDate)) ? parseISO(invoiceDate) : defaultDisplayDate;
  const parsedDueDate = dueDate && isValid(parseISO(dueDate)) ? parseISO(dueDate) : null;
  const companyProfile = getCompanyProfile();
  const showClientAddress = companyProfile?.showClientAddressOnInvoice !== false;

  return (
    <>
      <header className="pb-4 mb-4 border-b-2 border-[var(--invoice-primary-color)] print:border-black">
        <div className="flex justify-between items-center mb-3">
          {companyLogoDataUrl && (
            <div className="relative w-16 h-16 print:w-12 print:h-12 shrink-0">
              <img src={companyLogoDataUrl} alt={`${companyName || 'Your Company Name'} Logo`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
          )}
          <h2 className="text-2xl font-bold uppercase text-[var(--invoice-primary-color)] print:text-black">INVOICE</h2>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <div>
            <p className="font-semibold text-[var(--invoice-text)] print:text-black">{companyName || "Your Company Name"}</p>
          </div>
          <div className="text-right">
            <p><strong className="text-[var(--invoice-muted-text)] print:text-gray-700">Invoice #:</strong> {invoiceNumber}</p>
            <p><strong className="text-[var(--invoice-muted-text)] print:text-gray-700">Date:</strong> {format(parsedInvoiceDate, "dd/MM/yyyy")}</p>
            {parsedDueDate && <p><strong className="text-[var(--invoice-muted-text)] print:text-gray-700">Due:</strong> {format(parsedDueDate, "dd/MM/yyyy")}</p>}
          </div>
        </div>
      </header>
      <section className="mb-6 text-xs">
        <h3 className="text-xs font-semibold uppercase text-[var(--invoice-muted-text)] mb-1 print:text-gray-600">BILLED TO:</h3>
        <p className="font-medium text-[var(--invoice-text)] print:text-black">{customerName || "Client Name"}</p>
        {showClientAddress && customerAddress && <p className="text-[var(--invoice-muted-text)] whitespace-pre-line print:text-gray-600">{customerAddress}</p>}
        {customerEmail && <p className="text-[var(--invoice-muted-text)] print:text-gray-600">{customerEmail}</p>}
        {customerPhone && <p className="text-[var(--invoice-muted-text)] print:text-gray-600">{customerPhone}</p>}
      </section>
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
    currency,
    amountInWords,
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
  const currentCurrency = currency || { symbol: '₹', code: 'INR', name: 'Indian Rupee' };

  const renderHeader = () => {
    switch(templateStyle) {
      case 'modern':
        return <ModernHeader data={data} />;
      case 'compact':
        return <CompactHeader data={data} />;
      case 'classic':
      default:
        return <ClassicHeader data={data} />;
    }
  };

  return (
    <div
      className={cn(
        "bg-[var(--invoice-background)] text-[var(--invoice-text)] shadow-lg print:shadow-none min-w-[320px] md:min-w-[700px] lg:min-w-[800px] max-w-4xl mx-auto print:border-none print:bg-white",
        `theme-${themeColor}`,
        fontThemeClass,
        forceLightMode && "invoice-render-light" 
      )}
      style={{
        width: '100%',
        border: '1px solid var(--invoice-border-color)',
        borderRadius: '0.5rem',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {watermarkDataUrl && (
         <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex: 0 }} 
         >
            <img
                src={watermarkDataUrl}
                alt="Watermark"
                style={{
                maxWidth: '70%', 
                maxHeight: '60%',
                objectFit: 'contain',
                opacity: displayWatermarkOpacity,
                filter: templateStyle === 'modern' || templateStyle === 'compact' ? 'grayscale(50%)' : 'none', 
                }}
                data-ai-hint="background pattern"
            />
        </div>
      )}

      <div
        className={cn(
          "relative p-6 sm:p-8 md:p-10",
          templateStyle === 'compact' && "p-4 sm:p-6 md:p-8"
        )}
        style={{ zIndex: 1 }} 
      >
        {renderHeader()}

        <section className="mb-8">
          <div className={cn(
            "overflow-x-auto rounded-md border border-[var(--invoice-border-color)]",
            templateStyle === 'compact' && "border-0"
            )}>
            <table className="w-full table-auto">
              <thead className={cn(
                "bg-[var(--invoice-header-bg)] print:bg-gray-100",
                (templateStyle === 'modern' || templateStyle === 'compact') && "border-b-2 border-[var(--invoice-primary-color)]"
              )}>
                <tr>
                  <th className={cn("p-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--invoice-muted-text)] print:text-gray-600 w-2/5 sm:w-[40%]", templateStyle === 'compact' && "p-2 text-[10px]")}>Description</th>
                  <th className={cn("p-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--invoice-muted-text)] print:text-gray-600", templateStyle === 'compact' && "p-2 text-[10px]")}>Qty/Dur.</th>
                  <th className={cn("p-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--invoice-muted-text)] print:text-gray-600", templateStyle === 'compact' && "p-2 text-[10px]")}>Unit</th>
                  <th className={cn("p-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--invoice-muted-text)] print:text-gray-600", templateStyle === 'compact' && "p-2 text-[10px]")}>Rate ({currentCurrency.symbol})</th>
                  <th className={cn("p-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--invoice-muted-text)] print:text-gray-600", templateStyle === 'compact' && "p-2 text-[10px]")}>Disc (%)</th>
                  <th className={cn("p-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--invoice-muted-text)] print:text-gray-600", templateStyle === 'compact' && "p-2 text-[10px]")}>Amount ({currentCurrency.symbol})</th>
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
                      <td className={cn("p-3 align-top text-[var(--invoice-text)] print:text-black", templateStyle === 'compact' && "p-2 text-xs")}>
                        {item.description}
                        {displayDurationString && (
                          <div className={cn("text-xs text-[var(--invoice-muted-text)] print:text-gray-500 mt-1", templateStyle === 'compact' && "text-[10px]")}>
                            {displayDurationString}
                          </div>
                        )}
                      </td>
                      <td className={cn("p-3 text-right align-top text-[var(--invoice-text)] print:text-gray-700", templateStyle === 'compact' && "p-2 text-xs")}>
                        {itemQuantity}
                      </td>
                      <td className={cn("p-3 text-right align-top text-[var(--invoice-text)] print:text-gray-700", templateStyle === 'compact' && "p-2 text-xs")}>
                        {item.unit || '-'}
                      </td>
                      <td className={cn("p-3 text-right align-top text-[var(--invoice-text)] print:text-gray-700", templateStyle === 'compact' && "p-2 text-xs")}>
                        {formatCurrency(itemRate, currentCurrency)}
                      </td>
                      <td className={cn("p-3 text-right align-top text-[var(--invoice-text)] print:text-gray-700", templateStyle === 'compact' && "p-2 text-xs")}>
                        {itemDiscount > 0 ? `${itemDiscount}%` : '-'}
                      </td>
                      <td className={cn("p-3 text-right align-top text-[var(--invoice-text)] print:text-black", templateStyle === 'compact' && "p-2 text-xs")}>
                        {formatCurrency(discountedAmount, currentCurrency)}
                      </td>
                    </tr>
                  )})
                ) : (
                  <tr className="bg-[var(--invoice-background)] print:bg-white">
                    <td colSpan={6} className={cn("p-3 text-center text-[var(--invoice-muted-text)] print:text-gray-500", templateStyle === 'compact' && "p-2 text-xs")}>
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
              (templateStyle === 'modern' || templateStyle === 'compact') && "md:w-1/2 lg:w-2/5"
            )}>
             <div className="flex justify-between items-center py-2 px-3 border-b border-[var(--invoice-border-color)]">
              <span className="text-sm text-[var(--invoice-muted-text)] print:text-gray-600">SUBTOTAL:</span>
              <span className="text-sm font-medium text-[var(--invoice-text)] print:text-black">{formatCurrency(subTotal, currentCurrency)}</span>
            </div>
            {globalDiscountAmount > 0 && (
              <div className="flex justify-between items-center py-2 px-3 border-b border-[var(--invoice-border-color)]">
                <span className="text-sm text-[var(--invoice-muted-text)] print:text-gray-600">
                  DISCOUNT
                  {globalDiscountType === 'percentage' && globalDiscountValue ? ` (${globalDiscountValue}%)` : ''}
                  :
                </span>
                <span className="text-sm font-medium text-[var(--invoice-text)] print:text-black">- {formatCurrency(globalDiscountAmount, currentCurrency)}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-3 bg-[var(--invoice-primary-color)]/10 dark:bg-[var(--invoice-primary-color)]/20 px-3 rounded-md">
              <span className="text-lg font-bold text-[var(--invoice-primary-color)] print:text-black">TOTAL:</span>
              <span className="text-lg font-bold text-[var(--invoice-primary-color)] print:text-black">{formatCurrency(totalFee, currentCurrency)}</span>
            </div>
          </div>
        </section>
        
        {amountInWords && (
            <section className="mb-6 pt-3 border-t border-[var(--invoice-border-color)]">
                <p className="text-xs text-[var(--invoice-muted-text)] italic print:text-gray-600">
                    <span className="font-semibold">Amount in Words:</span> {amountInWords}
                </p>
            </section>
        )}


        <div className={cn(
          "grid gap-6",
           (invoiceNotes && termsAndConditions && (templateStyle === 'classic' || templateStyle === 'compact')) && "grid-cols-1",
           (invoiceNotes && termsAndConditions && templateStyle === 'modern') && "md:grid-cols-2", 
           (!invoiceNotes || !termsAndConditions) && "grid-cols-1" 
        )}>
          {invoiceNotes && (
            <section className={cn("pt-4 border-t border-[var(--invoice-border-color)]", templateStyle === 'compact' && "pt-2 text-xs")}>
              <h4 className="text-sm font-semibold uppercase text-[var(--invoice-muted-text)] mb-1 print:text-gray-600">Notes</h4>
              <p className="text-sm text-[var(--invoice-muted-text)] whitespace-pre-line print:text-gray-600">{invoiceNotes}</p>
            </section>
          )}

          {termsAndConditions && (
            <section className={cn(
              "pt-4 border-t border-[var(--invoice-border-color)]",
              templateStyle === 'compact' && "pt-2",
              (invoiceNotes && templateStyle === 'modern') && "md:border-t-0 md:pt-0 md:pl-6 md:border-l"
            )}>
              <h4 className={cn("text-sm font-semibold uppercase text-[var(--invoice-muted-text)] mb-1 print:text-gray-600", templateStyle === 'compact' && "text-xs")}>Terms &amp; Conditions</h4>
              <p className={cn("text-xs text-[var(--invoice-muted-text)]/80 whitespace-pre-line print:text-gray-500 print:text-[10px]", templateStyle === 'compact' && "text-[10px]")}>{termsAndConditions}</p>
            </section>
          )}
        </div>

        <footer className={cn("text-center text-xs text-[var(--invoice-muted-text)] pt-6 mt-8 border-t border-[var(--invoice-border-color)] print:text-gray-500", templateStyle === 'compact' && "pt-4 mt-6 text-[10px]")}>
          <p>Thank you for your business!</p>
        </footer>
      </div>
    </div>
  );
});

    