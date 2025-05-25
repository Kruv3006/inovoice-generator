
"use client";

import type { StoredInvoiceData, AvailableCurrency } from "@/lib/invoice-types";
import { format, parseISO, isValid } from "date-fns";
import { cn } from "@/lib/utils";
import React from 'react'; 
import { MapPin, Mail, Phone } from "lucide-react";
import { getCompanyProfile } from "@/lib/settings-store"; 
import { availableCurrencies } from "@/lib/invoice-types";

interface InvoiceTemplateProps {
  data: StoredInvoiceData;
  forceLightMode?: boolean; 
}

const formatCurrency = (amount?: number, currency?: AvailableCurrency) => {
  const currentCurrency = currency || availableCurrencies[0]; 
  if (typeof amount !== 'number') return `${currentCurrency.symbol}0.00`;
  try {
    return new Intl.NumberFormat('en-IN', { 
        style: 'currency', 
        currency: currentCurrency.code, 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    }).format(amount);
  } catch (e) { 
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
              <img src={companyLogoDataUrl} alt={`${companyName || 'Your Company Name'} Logo`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} data-ai-hint="company brand logo"/>
            </div>
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--invoice-primary-color)] print:text-black">{companyName || "Your Company Name"}</h1>
            {/* Classic style might have company address here if not showing client's */}
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
        {/* Placeholder for sender details if needed on right for classic */}
        {/* <div className="text-left sm:text-right">
           <h3 className="text-sm font-semibold uppercase text-[var(--invoice-muted-text)] mb-1 print:text-gray-600">FROM</h3>
        </div> */}
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
      <header className="pb-6 mb-6 border-b-2 border-[var(--invoice-primary-color)] print:border-black">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="flex items-center gap-3">
            {companyLogoDataUrl && (
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 print:w-12 print:h-12 shrink-0 rounded-md overflow-hidden bg-[var(--invoice-header-bg)] p-1">
                <img src={companyLogoDataUrl} alt={`${companyName || 'Your Company Name'} Logo`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} data-ai-hint="company brand logo"/>
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
          {companyLogoDataUrl ? (
            <div className="relative w-16 h-16 print:w-12 print:h-12 shrink-0">
              <img src={companyLogoDataUrl} alt={`${companyName || 'Your Company Name'} Logo`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} data-ai-hint="company brand logo"/>
            </div>
          ) : (
             <h1 className="text-lg font-bold text-[var(--invoice-primary-color)] print:text-black">{companyName || "Your Company Name"}</h1>
          )}
          <h2 className="text-xl font-bold uppercase text-[var(--invoice-primary-color)] print:text-black">INVOICE</h2>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <div>
            <p className="font-semibold text-[var(--invoice-text)] print:text-black">{!companyLogoDataUrl ? "" : companyName || "Your Company Name"}</p>
            {/* Add compact company address if needed */}
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

const MinimalistHeader: React.FC<Omit<InvoiceTemplateProps, 'forceLightMode'>> = ({ data }) => {
  const { companyName, companyLogoDataUrl, customerName, invoiceNumber, invoiceDate, dueDate, currency, customerAddress, customerEmail, customerPhone } = data;
  const defaultDisplayDate = new Date();
  const parsedInvoiceDate = invoiceDate && isValid(parseISO(invoiceDate)) ? parseISO(invoiceDate) : defaultDisplayDate;
  const parsedDueDate = dueDate && isValid(parseISO(dueDate)) ? parseISO(dueDate) : null;
  const companyProfile = getCompanyProfile();
  const showClientAddress = companyProfile?.showClientAddressOnInvoice !== false;

  return (
    <>
      <header className="pb-8 mb-8">
        <div className="flex justify-between items-start mb-6">
          {companyLogoDataUrl ? (
            <div className="relative w-20 h-20 print:w-16 print:h-16 shrink-0">
              <img src={companyLogoDataUrl} alt={`${companyName || 'Your Company Name'} Logo`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} data-ai-hint="company brand logo"/>
            </div>
          ) : (
             <h1 className="text-3xl font-semibold text-[var(--invoice-primary-color)] print:text-black">{companyName || "Your Company Name"}</h1>
          )}
          <div className="text-right">
            <h2 className="text-xl font-normal uppercase text-[var(--invoice-muted-text)] print:text-gray-700 tracking-wider">INVOICE</h2>
            <p className="text-xs text-[var(--invoice-muted-text)] mt-0.5 print:text-gray-600">
              {invoiceNumber}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8 text-sm">
          <div>
            {!companyLogoDataUrl && !companyName && <div className="h-8"></div>} {/* Placeholder if no logo and no name for alignment */}
            {companyLogoDataUrl && companyName && <h1 className="text-2xl font-semibold text-[var(--invoice-primary-color)] print:text-black mt-2">{companyName}</h1>}
            {/* Minimalist usually omits sender address from header or places it subtly in footer */}
          </div>
          <div className="text-right">
            <p className="text-[var(--invoice-text)] print:text-black"><strong>Date:</strong> {format(parsedInvoiceDate, "MMMM d, yyyy")}</p>
            {parsedDueDate && <p className="text-[var(--invoice-text)] print:text-black"><strong>Due Date:</strong> {format(parsedDueDate, "MMMM d, yyyy")}</p>}
          </div>
        </div>
      </header>
      <section className="mb-10 text-sm">
        <h3 className="text-xs font-medium uppercase text-[var(--invoice-muted-text)] mb-2 print:text-gray-600 tracking-wider">BILLED TO</h3>
        <p className="text-md font-semibold text-[var(--invoice-text)] print:text-black">{customerName || "Client Name"}</p>
        {showClientAddress && customerAddress && <p className="text-xs text-[var(--invoice-muted-text)] whitespace-pre-line print:text-gray-600 mt-1">{customerAddress}</p>}
        {customerEmail && <p className="text-xs text-[var(--invoice-muted-text)] print:text-gray-600 mt-0.5">{customerEmail}</p>}
        {customerPhone && <p className="text-xs text-[var(--invoice-muted-text)] print:text-gray-600 mt-0.5">{customerPhone}</p>}
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
    amountInWords, // This is the placeholder string
    themeColor = 'default',
    fontTheme = 'default',
    templateStyle = 'classic', 
  } = data;

  const displayWatermarkOpacity = typeof watermarkOpacity === 'number' ? watermarkOpacity : 0.05;
  const currentCurrency = currency || availableCurrencies[0];

  let globalDiscountAmount = 0;
  if (globalDiscountValue && globalDiscountValue > 0 && subTotal) {
    if (globalDiscountType === 'percentage') {
      globalDiscountAmount = subTotal * (globalDiscountValue / 100);
    } else {
      globalDiscountAmount = globalDiscountValue;
    }
  }

  const fontThemeClass = `font-theme-${fontTheme}`;
  
  const renderHeader = () => {
    switch(templateStyle) {
      case 'modern':
        return <ModernHeader data={data} />;
      case 'compact':
        return <CompactHeader data={data} />;
      case 'minimalist':
        return <MinimalistHeader data={data} />;
      case 'classic':
      default:
        return <ClassicHeader data={data} />;
    }
  };

  const tableClasses = cn(
    "w-full table-auto text-sm print:text-xs", // Base classes
    templateStyle === 'classic' && "border-collapse",
    templateStyle === 'modern' && "mt-2", // Add some margin for modern
    templateStyle === 'compact' && "text-xs",
    templateStyle === 'minimalist' && "border-y border-[var(--invoice-border-color)]"
  );
  const tableWrapperClasses = cn(
    "overflow-x-auto", // Base
    templateStyle === 'classic' && "rounded-lg border border-[var(--invoice-border-color)]",
    templateStyle === 'modern' && "rounded-md shadow-md",
    (templateStyle === 'compact' || templateStyle === 'minimalist') && "border-0" // No wrapper border for compact/minimalist
  );
  const thClasses = cn(
    "p-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--invoice-muted-text)] print:text-gray-600",
    templateStyle === 'classic' && "border-b border-[var(--invoice-border-color)] bg-[var(--invoice-header-bg)] print:bg-gray-100",
    templateStyle === 'modern' && "pb-2 border-b-2 border-[var(--invoice-primary-color)] bg-transparent print:bg-transparent",
    templateStyle === 'compact' && "p-2 text-[10px] border-b border-[var(--invoice-border-color)] bg-[var(--invoice-header-bg)] print:bg-gray-100",
    templateStyle === 'minimalist' && "pb-2 pt-1 border-b-2 border-[var(--invoice-primary-color)] font-medium tracking-normal text-left first:pl-0 last:pr-0 text-xs bg-transparent print:bg-transparent",
  );
  const tdClasses = cn(
    "p-3 align-top text-[var(--invoice-text)] print:text-black border-b border-[var(--invoice-border-color)]",
    templateStyle === 'classic' && "", // Classic td has border from table-collapse
    templateStyle === 'modern' && "py-3",
    templateStyle === 'compact' && "p-2 text-xs",
    templateStyle === 'minimalist' && "py-4 first:pl-0 last:pr-0 border-b border-dashed border-[var(--invoice-border-color)]",
  );
  const totalsSectionClasses = cn(
    "w-full sm:w-2/5 md:w-1/3 space-y-1 mt-6", // Base, more space above for all
    templateStyle === 'classic' && "sm:w-1/2 md:w-2/5",
    templateStyle === 'modern' && "md:w-1/2 lg:w-2/5",
    templateStyle === 'compact' && "text-xs sm:w-1/2",
    templateStyle === 'minimalist' && "w-full sm:w-2/3 md:w-1/2 text-sm" 
  );
  const totalLineItemClasses = cn( // For subtotal, discount lines
    "flex justify-between items-center py-2 px-3",
    templateStyle === 'classic' && "border-b border-[var(--invoice-border-color)]",
    templateStyle === 'modern' && "border-b border-dashed border-[var(--invoice-border-color)]",
    templateStyle === 'compact' && "py-1",
    templateStyle === 'minimalist' && "px-0 py-2 border-b border-dashed border-[var(--invoice-border-color)]"
  );
  const totalLineClasses = cn( // For the main "TOTAL"
    "flex justify-between items-center py-3 px-3 rounded-md font-bold",
    templateStyle === 'classic' && "bg-[var(--invoice-primary-color)]/10 text-[var(--invoice-primary-color)] text-lg print:bg-gray-100 print:text-black",
    templateStyle === 'modern' && "bg-[var(--invoice-primary-color)] text-[var(--invoice-primary-color-foreground)] text-lg print:bg-black print:text-white",
    templateStyle === 'compact' && "bg-[var(--invoice-primary-color)]/15 text-[var(--invoice-primary-color)] text-md print:bg-gray-100 print:text-black py-2",
    templateStyle === 'minimalist' && "bg-transparent dark:bg-transparent px-0 border-t-2 border-[var(--invoice-primary-color)] pt-3 text-[var(--invoice-primary-color)] text-xl print:text-black print:border-black"
  );
  const notesSectionClasses = cn(
    "pt-6 mt-6", 
    templateStyle !== 'minimalist' && "border-t border-[var(--invoice-border-color)]", 
    templateStyle === 'compact' && "pt-3 mt-3 text-xs", 
    templateStyle === 'minimalist' && "pt-0 mt-8" // More space before notes in minimalist
  );
  const termsSectionClasses = cn(
    "pt-4 border-t border-[var(--invoice-border-color)]",
    templateStyle === 'compact' && "pt-2 text-xs",
    templateStyle === 'minimalist' && "pt-3 text-xs"
  );
  const termsTextClasses = cn(
    "text-xs text-[var(--invoice-muted-text)]/80 whitespace-pre-line print:text-gray-500 print:text-[10px]",
    templateStyle === 'classic' && "leading-relaxed",
    templateStyle === 'modern' && "leading-normal",
    templateStyle === 'compact' && "text-[10px]",
    templateStyle === 'minimalist' && "text-[10px] leading-relaxed"
  );

  // Layout for Notes and Terms
  let notesAndTermsLayout;
  if (invoiceNotes && termsAndConditions) {
    if (templateStyle === 'modern' || templateStyle === 'minimalist') {
      notesAndTermsLayout = (
        <div className={cn("grid md:grid-cols-2 gap-x-8 gap-y-4", templateStyle === 'minimalist' && "mt-8")}>
          <section className={notesSectionClasses}>
            <h4 className={cn("text-sm font-semibold uppercase text-[var(--invoice-muted-text)] mb-2 print:text-gray-600", templateStyle === 'minimalist' && 'text-xs tracking-wider')}>Notes</h4>
            <p className="text-sm text-[var(--invoice-muted-text)] whitespace-pre-line print:text-gray-600">{invoiceNotes}</p>
          </section>
          <section className={cn(termsSectionClasses, "md:border-t-0 md:pt-0", templateStyle === 'modern' && "md:pl-6 md:border-l")}>
            <h4 className={cn("text-sm font-semibold uppercase text-[var(--invoice-muted-text)] mb-2 print:text-gray-600", templateStyle === 'minimalist' && 'text-xs tracking-wider')}>Terms &amp; Conditions</h4>
            <p className={termsTextClasses}>{termsAndConditions}</p>
          </section>
        </div>
      );
    } else { // Classic & Compact
      notesAndTermsLayout = (
        <>
          {invoiceNotes && (
            <section className={notesSectionClasses}>
              <h4 className="text-sm font-semibold uppercase text-[var(--invoice-muted-text)] mb-1 print:text-gray-600">Notes</h4>
              <p className="text-sm text-[var(--invoice-muted-text)] whitespace-pre-line print:text-gray-600">{invoiceNotes}</p>
            </section>
          )}
          {termsAndConditions && (
            <section className={cn(termsSectionClasses, invoiceNotes && "mt-4")}>
              <h4 className="text-sm font-semibold uppercase text-[var(--invoice-muted-text)] mb-1 print:text-gray-600">Terms &amp; Conditions</h4>
              <p className={termsTextClasses}>{termsAndConditions}</p>
            </section>
          )}
        </>
      );
    }
  } else if (invoiceNotes) {
    notesAndTermsLayout = (
      <section className={notesSectionClasses}>
        <h4 className="text-sm font-semibold uppercase text-[var(--invoice-muted-text)] mb-1 print:text-gray-600">Notes</h4>
        <p className="text-sm text-[var(--invoice-muted-text)] whitespace-pre-line print:text-gray-600">{invoiceNotes}</p>
      </section>
    );
  } else if (termsAndConditions) {
    notesAndTermsLayout = (
      <section className={termsSectionClasses}>
        <h4 className="text-sm font-semibold uppercase text-[var(--invoice-muted-text)] mb-1 print:text-gray-600">Terms &amp; Conditions</h4>
        <p className={termsTextClasses}>{termsAndConditions}</p>
      </section>
    );
  }


  return (
    <div
      className={cn(
        "bg-[var(--invoice-background)] text-[var(--invoice-text)] shadow-lg print:shadow-none min-w-[320px] md:min-w-[700px] lg:min-w-[800px] max-w-4xl mx-auto print:border-none print:bg-white",
        `theme-${themeColor}`,
        fontThemeClass,
        forceLightMode && "invoice-render-light",
        templateStyle === 'minimalist' && "shadow-none border-0" // Minimalist has no outer shadow/border by default
      )}
      style={{
        width: '100%',
        border: (templateStyle === 'minimalist' && !forceLightMode) ? 'none' : '1px solid var(--invoice-border-color)', 
        borderRadius: (templateStyle === 'minimalist' && !forceLightMode) ? '0' : '0.5rem',
        boxShadow: (templateStyle === 'minimalist' && !forceLightMode) ? 'none' : undefined,
        overflow: 'hidden',
      }}
    >
      <div className="relative" /* Watermark and content wrapper */>
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
                  filter: (templateStyle === 'modern' || templateStyle === 'compact' || templateStyle === 'minimalist') ? 'grayscale(50%)' : 'none', 
                  }}
                  data-ai-hint="background pattern"
              />
          </div>
        )}

        <div
          className={cn(
            "relative p-6 sm:p-8 md:p-10", 
            templateStyle === 'compact' && "p-4 sm:p-6 md:p-8",
            templateStyle === 'minimalist' && "p-8 sm:p-10 md:p-12" 
          )}
          style={{ zIndex: 1 }} 
        >
          {renderHeader()}

          <section className="mb-8">
            <div className={tableWrapperClasses}>
              <table className={tableClasses}>
                <thead className={cn(templateStyle !== 'minimalist' && "bg-[var(--invoice-header-bg)] print:bg-gray-100")}>
                  <tr>
                    <th className={cn(thClasses, "w-2/5 sm:w-[40%]", templateStyle === 'minimalist' && "text-left")}>Description</th>
                    <th className={cn(thClasses, "text-right")}>Qty/Dur.</th>
                    <th className={cn(thClasses, "text-right")}>Unit</th>
                    <th className={cn(thClasses, "text-right")}>Rate ({currentCurrency.symbol})</th>
                    <th className={cn(thClasses, "text-right")}>Disc (%)</th>
                    <th className={cn(thClasses, "text-right")}>Amount ({currentCurrency.symbol})</th>
                  </tr>
                </thead>
                <tbody className={cn(templateStyle !== 'minimalist' && "divide-y divide-[var(--invoice-border-color)]")}>
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
                        <td className={cn(tdClasses, templateStyle === 'minimalist' && "text-left")}>
                          {item.description}
                          {displayDurationString && (
                            <div className={cn("text-xs text-[var(--invoice-muted-text)] print:text-gray-500 mt-1", templateStyle === 'compact' && "text-[10px]", templateStyle === 'minimalist' && "text-[11px]")}>
                              {displayDurationString}
                            </div>
                          )}
                        </td>
                        <td className={cn(tdClasses, "text-right")}>
                          {itemQuantity}
                        </td>
                        <td className={cn(tdClasses, "text-right")}>
                          {item.unit || '-'}
                        </td>
                        <td className={cn(tdClasses, "text-right")}>
                          {formatCurrency(itemRate, currentCurrency)}
                        </td>
                        <td className={cn(tdClasses, "text-right")}>
                          {itemDiscount > 0 ? `${itemDiscount}%` : '-'}
                        </td>
                        <td className={cn(tdClasses, "text-right")}>
                          {formatCurrency(discountedAmount, currentCurrency)}
                        </td>
                      </tr>
                    )})
                  ) : (
                    <tr className="bg-[var(--invoice-background)] print:bg-white">
                      <td colSpan={6} className={cn(tdClasses, "text-center text-[var(--invoice-muted-text)] print:text-gray-500")}>
                        No items listed.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="flex justify-end mb-8">
            <div className={totalsSectionClasses}>
              <div className={totalLineItemClasses}>
                <span className="text-sm text-[var(--invoice-muted-text)] print:text-gray-600">SUBTOTAL:</span>
                <span className="text-sm font-medium text-[var(--invoice-text)] print:text-black">{formatCurrency(subTotal, currentCurrency)}</span>
              </div>
              {globalDiscountAmount > 0 && (
                <div className={totalLineItemClasses}>
                  <span className="text-sm text-[var(--invoice-muted-text)] print:text-gray-600">
                    DISCOUNT
                    {globalDiscountType === 'percentage' && globalDiscountValue ? ` (${globalDiscountValue}%)` : ''}
                    :
                  </span>
                  <span className="text-sm font-medium text-[var(--invoice-text)] print:text-black">- {formatCurrency(globalDiscountAmount, currentCurrency)}</span>
                </div>
              )}
              <div className={totalLineClasses}>
                <span className="text-inherit">TOTAL:</span>
                <span className="text-inherit">{formatCurrency(totalFee, currentCurrency)}</span>
              </div>
            </div>
          </section>
          
          {/* Amount in Words Placeholder */}
          <section className={cn("mb-6 pt-3 text-sm", templateStyle !== 'minimalist' && "border-t border-[var(--invoice-border-color)]", templateStyle === 'minimalist' && "mt-10")}>
              <p className="text-xs text-[var(--invoice-muted-text)] italic print:text-gray-600">
                  <span className="font-semibold">Amount in Words:</span> {`[Amount for ${currentCurrency.symbol}${(totalFee || 0).toFixed(2)} in words - Auto-generation pending]`}
              </p>
          </section>


          {notesAndTermsLayout && <div className="mt-8">{notesAndTermsLayout}</div>}

          <footer className={cn("text-center text-xs text-[var(--invoice-muted-text)] pt-6 mt-8 border-t border-[var(--invoice-border-color)] print:text-gray-500", templateStyle === 'compact' && "pt-4 mt-6 text-[10px]", templateStyle === 'minimalist' && "pt-6 mt-10 text-[10px] border-t-0")}>
            <p>Thank you for your business!</p>
          </footer>
        </div>
      </div>
    </div>
  );
});
