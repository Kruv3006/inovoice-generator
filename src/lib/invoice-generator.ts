
import type { StoredInvoiceData, AvailableCurrency } from './invoice-types';
import { format, parseISO, isValid } from 'date-fns';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from '@/hooks/use-toast';
import { getCompanyProfile } from '@/lib/settings-store'; // Used for showClientAddress

const formatCurrencyForDoc = (amount?: number, currency?: AvailableCurrency) => {
  if (typeof amount !== 'number') return `${currency?.symbol || '₹'}0.00`;
  const currentCurrency = currency || { symbol: '₹', code: 'INR', name: 'Indian Rupee' };
  return `${currentCurrency.symbol}${amount.toFixed(2)}`;
};

const simulateDownload = (filename: string, dataUrlOrContent: string, mimeType: string, isDataUrl: boolean = false) => {
  const link = document.createElement('a');
  if (isDataUrl) {
    link.href = dataUrlOrContent;
  } else {
    const blob = new Blob([dataUrlOrContent], { type: mimeType });
    link.href = URL.createObjectURL(blob);
  }
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  if (!isDataUrl) {
    URL.revokeObjectURL(link.href);
  }
};

const getInvoiceHtmlForDoc = (data: StoredInvoiceData): string => {
  const {
    companyName, customerName, invoiceNumber, invoiceDate, dueDate,
    items, subTotal, globalDiscountType, globalDiscountValue, totalFee, invoiceNotes, termsAndConditions,
    companyLogoDataUrl, watermarkDataUrl, watermarkOpacity, currency, amountInWords,
    themeColor = 'default', fontTheme = 'default', templateStyle = 'classic',
    customerAddress, customerEmail, customerPhone,
  } = data;

  const currentCurrency = currency || { symbol: '₹', code: 'INR', name: 'Indian Rupee' };
  const displayWatermarkOpacity = typeof watermarkOpacity === 'number' ? watermarkOpacity : 0.05;
  const invoiceBgColorDoc = 'hsl(0 0% 100%)'; // Always white for DOC
  const textColorDoc = 'hsl(0 0% 10%)'; 
  const mutedTextColorDoc = 'hsl(0 0% 40%)';
  let primaryColorDoc = 'hsl(217 91% 55%)'; 
  let headerBgColorDoc = 'hsl(220 20% 95%)';
  let borderColorDoc = 'hsl(220 15% 85%)';

  // Apply Theme Colors (Light Mode Version for DOC)
  if (themeColor === 'classic-blue') { primaryColorDoc = 'hsl(210 80% 50%)'; headerBgColorDoc = 'hsl(210 50% 96%)'; borderColorDoc = 'hsl(210 30% 80%)'; } 
  else if (themeColor === 'emerald-green') { primaryColorDoc = 'hsl(145 63% 40%)'; headerBgColorDoc = 'hsl(145 40% 95%)'; borderColorDoc = 'hsl(145 30% 80%)'; }
  else if (themeColor === 'crimson-red') { primaryColorDoc = 'hsl(340 70% 45%)'; headerBgColorDoc = 'hsl(340 50% 96%)'; borderColorDoc = 'hsl(340 40% 85%)'; }
  else if (themeColor === 'slate-gray') { primaryColorDoc = 'hsl(220 10% 40%)'; headerBgColorDoc = 'hsl(220 10% 95%)'; borderColorDoc = 'hsl(220 10% 80%)'; }
  else if (themeColor === 'deep-purple') { primaryColorDoc = 'hsl(260 50% 55%)'; headerBgColorDoc = 'hsl(260 30% 95%)'; borderColorDoc = 'hsl(260 25% 80%)'; }
  else if (themeColor === 'monochrome') { primaryColorDoc = 'hsl(0 0% 20%)'; headerBgColorDoc = 'hsl(0 0% 95%)'; borderColorDoc = 'hsl(0 0% 80%)'; }


  let fontFamilyDoc = 'Arial, sans-serif';
  if (fontTheme === 'serif') fontFamilyDoc = 'Georgia, Times New Roman, Times, serif';
  else if (fontTheme === 'mono') fontFamilyDoc = 'Courier New, Courier, monospace';


  const parsedInvoiceDate = invoiceDate && isValid(parseISO(invoiceDate)) ? parseISO(invoiceDate) : new Date();
  const parsedDueDate = dueDate && isValid(parseISO(dueDate)) ? parseISO(dueDate) : null;
  
  const fCurrency = (val?: number) => formatCurrencyForDoc(val, currentCurrency);
  const companyProfileSettings = getCompanyProfile(); // For client address visibility
  const showClientAddressOnInvoice = companyProfileSettings?.showClientAddressOnInvoice !== false;


  const companyLogoHtml = companyLogoDataUrl
    ? `<img src="${companyLogoDataUrl}" style="max-height: ${templateStyle === 'modern' || templateStyle === 'compact' ? '50px' : '70px'}; max-width: ${templateStyle === 'modern' || templateStyle === 'compact' ? '150px' : '180px'}; object-fit: contain;" alt="Company Logo"/>`
    : '';

  let itemsHtml = '';
  if (items && items.length > 0) {
    items.forEach(item => {
      let displayDurationStringDoc = "";
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
                  if (durationParts.length > 0) displayDurationStringDoc = `<div style="font-size: 8pt; color: ${mutedTextColorDoc}; margin-top: 3px;">(Duration: ${durationParts.join(', ')})</div>`;
              }
          } catch (e) { /* ignore */ }
      } else if (item.itemStartDate && item.itemEndDate && isValid(parseISO(item.itemStartDate)) && isValid(parseISO(item.itemEndDate))) {
          displayDurationStringDoc = `<div style="font-size: 8pt; color: ${mutedTextColorDoc}; margin-top: 3px;">(${format(parseISO(item.itemStartDate), "MMM d, yyyy")} - ${format(parseISO(item.itemEndDate), "MMM d, yyyy")})</div>`;
      }

      const itemQuantity = Number(item.quantity) || 0;
      const itemRate = Number(item.rate) || 0;
      const itemDiscount = Number(item.discount) || 0;
      const itemSubtotal = itemQuantity * itemRate;
      const discountedAmount = itemSubtotal * (1 - itemDiscount / 100);

      itemsHtml += `
        <tr style="background-color: ${invoiceBgColorDoc};">
          <td style="padding: 10px; border: 1px solid ${borderColorDoc}; vertical-align: top; color: ${textColorDoc};">${item.description}${displayDurationStringDoc}</td>
          <td style="padding: 10px; border: 1px solid ${borderColorDoc}; vertical-align: top; text-align: right; color: ${mutedTextColorDoc};">${itemQuantity}</td>
          <td style="padding: 10px; border: 1px solid ${borderColorDoc}; vertical-align: top; text-align: right; color: ${mutedTextColorDoc};">${item.unit || '-'}</td>
          <td style="padding: 10px; border: 1px solid ${borderColorDoc}; vertical-align: top; text-align: right; color: ${mutedTextColorDoc};">${fCurrency(itemRate)}</td>
          <td style="padding: 10px; border: 1px solid ${borderColorDoc}; vertical-align: top; text-align: right; color: ${mutedTextColorDoc};">${itemDiscount > 0 ? `${itemDiscount}%` : '-'}</td>
          <td style="padding: 10px; border: 1px solid ${borderColorDoc}; vertical-align: top; text-align: right; color: ${textColorDoc};">${fCurrency(discountedAmount)}</td>
        </tr>
      `;
    });
  } else {
    itemsHtml = `<tr><td colspan="6" style="text-align:center; padding: 20px; border: 1px solid ${borderColorDoc}; color: ${mutedTextColorDoc};">No items listed.</td></tr>`;
  }

  let globalDiscountHtml = '';
  if (globalDiscountValue && globalDiscountValue > 0 && subTotal) {
    let discountAmountDisplay = 0;
    let discountLabel = 'DISCOUNT';
    if (globalDiscountType === 'percentage') {
      discountAmountDisplay = subTotal * (globalDiscountValue / 100);
      discountLabel += ` (${globalDiscountValue}%)`;
    } else {
      discountAmountDisplay = globalDiscountValue;
    }
    globalDiscountHtml = `
      <tr>
        <td colspan="5" style="padding: 8px; text-align: right; font-weight: normal; color: ${mutedTextColorDoc}; border-top: 1px solid ${borderColorDoc};">
          ${discountLabel}:
        </td>
        <td style="padding: 8px; text-align: right; font-weight: normal; color: ${mutedTextColorDoc}; border-top: 1px solid ${borderColorDoc};">
          - ${fCurrency(discountAmountDisplay)}
        </td>
      </tr>
    `;
  }

  const clientDetailsHtml = `
    <p style="margin: 0; color: ${textColorDoc}; font-weight: bold;">${customerName || 'Client Name'}</p>
    ${(showClientAddressOnInvoice && customerAddress) ? `<p style="margin: 2px 0; white-space: pre-line; color: ${mutedTextColorDoc};">${customerAddress}</p>` : ''}
    ${customerEmail ? `<p style="margin: 2px 0; color: ${mutedTextColorDoc};">Email: ${customerEmail}</p>` : ''}
    ${customerPhone ? `<p style="margin: 2px 0; color: ${mutedTextColorDoc};">Phone: ${customerPhone}</p>` : ''}
  `;

  const classicHeaderHtml = `
    <div style="display: table; width: 100%; margin-bottom: 25px; padding-bottom:15px; border-bottom: 1px solid ${borderColorDoc};">
      <div style="display: table-cell; vertical-align: middle; width: 60%;">
        ${companyLogoHtml ? `<div style="margin-bottom: 5px;">${companyLogoHtml}</div>` : ''}
        <div style="font-size: 20px; font-weight: bold; color: ${primaryColorDoc};">${companyName || 'Your Company'}</div>
      </div>
      <div style="display: table-cell; vertical-align: middle; text-align: right; font-size: 9.5pt; color: ${mutedTextColorDoc};">
        <div style="font-size: 24px; font-weight: bold; color: ${mutedTextColorDoc}; text-transform: uppercase;">INVOICE</div>
        <div style="margin-top: 2px;"><strong style="color: ${textColorDoc};">Invoice No:</strong> ${invoiceNumber}</div>
        <div><strong style="color: ${textColorDoc};">Date:</strong> ${format(parsedInvoiceDate, "MMMM d, yyyy")}</div>
        ${parsedDueDate ? `<div><strong style="color: ${textColorDoc};">Due Date:</strong> ${format(parsedDueDate, "MMMM d, yyyy")}</div>` : ''}
      </div>
    </div>
    <div style="margin-bottom: 25px; font-size: 9.5pt;">
      <h3 style="font-size: 9pt; font-weight: bold; color: ${mutedTextColorDoc}; text-transform: uppercase; margin-bottom: 4px; margin-top:0;">Bill To</h3>
      ${clientDetailsHtml}
    </div>
  `;

  const modernHeaderHtml = `
    <div style="padding-bottom:15px; margin-bottom: 25px; border-bottom: 1px solid ${borderColorDoc};">
        <div style="display:table; width:100%; vertical-align:top;">
            <div style="display:table-cell; width:60%;">
                ${companyLogoHtml ? `<div style="margin-bottom: 5px;">${companyLogoHtml}</div>` : ''}
                <div style="font-size: 18px; font-weight: bold; color: ${primaryColorDoc};">${companyName || 'Your Company'}</div>
            </div>
            <div style="display:table-cell; width:40%; text-align:right; vertical-align:top;">
                <div style="font-size: 22px; font-weight: bold; margin-bottom: 5px; color: ${mutedTextColorDoc}; text-transform: uppercase;">INVOICE</div>
                <div style="font-size: 9pt; color: ${mutedTextColorDoc};"><strong style="color: ${textColorDoc};">No:</strong> ${invoiceNumber}</div>
                <div style="font-size: 9pt; color: ${mutedTextColorDoc};"><strong style="color: ${textColorDoc};">Date:</strong> ${format(parsedInvoiceDate, "MMMM d, yyyy")}</div>
                ${parsedDueDate ? `<div style="font-size: 9pt; color: ${mutedTextColorDoc};"><strong style="color: ${textColorDoc};">Due:</strong> ${format(parsedDueDate, "MMMM d, yyyy")}</div>` : ''}
            </div>
        </div>
        <div style="margin-top: 15px; padding-top:10px; border-top: 1px solid ${borderColorDoc}; font-size: 9.5pt;">
            <h3 style="font-size: 9pt; font-weight: bold; color: ${mutedTextColorDoc}; text-transform: uppercase; margin-bottom: 4px; margin-top:0;">BILL TO:</h3>
            ${clientDetailsHtml}
        </div>
    </div>
  `;

  const compactHeaderHtml = `
    <div style="padding-bottom:10px; margin-bottom:15px; border-bottom: 2px solid ${primaryColorDoc};">
        <table style="width:100%; border-collapse:collapse;">
            <tr>
                <td style="width:20%; vertical-align:top;">
                    ${companyLogoHtml ? `<div>${companyLogoHtml}</div>` : ''}
                </td>
                <td style="width:80%; text-align:right; vertical-align:top;">
                    <div style="font-size:18px; font-weight:bold; color:${primaryColorDoc}; text-transform:uppercase; margin-bottom:5px;">INVOICE</div>
                </td>
            </tr>
            <tr>
                <td style="padding-top:5px; font-size:8pt;">
                    <div style="font-weight:bold; color:${textColorDoc};">${companyName || 'Your Company'}</div>
                </td>
                <td style="padding-top:5px; text-align:right; font-size:8pt; color:${mutedTextColorDoc};">
                    <div><strong style="color:${textColorDoc};">Invoice #:</strong> ${invoiceNumber}</div>
                    <div><strong style="color:${textColorDoc};">Date:</strong> ${format(parsedInvoiceDate, "dd/MM/yyyy")}</div>
                    ${parsedDueDate ? `<div><strong style="color:${textColorDoc};">Due:</strong> ${format(parsedDueDate, "dd/MM/yyyy")}</div>` : ''}
                </td>
            </tr>
        </table>
    </div>
    <div style="margin-bottom:15px; font-size:8pt;">
        <h3 style="font-size:8pt; font-weight:bold; color:${mutedTextColorDoc}; text-transform:uppercase; margin-bottom:2px; margin-top:0;">BILLED TO:</h3>
        ${clientDetailsHtml}
    </div>
  `;
  
  let selectedHeaderHtml;
  switch(templateStyle) {
    case 'modern': selectedHeaderHtml = modernHeaderHtml; break;
    case 'compact': selectedHeaderHtml = compactHeaderHtml; break;
    case 'classic':
    default: selectedHeaderHtml = classicHeaderHtml;
  }

  const notesAndTermsLayout = (templateStyle === 'modern' && invoiceNotes && termsAndConditions) 
    ? `<tr>
        <td style="vertical-align:top; width:50%; padding-right:10px;">${invoiceNotes ? `<h4 style="font-size: 9pt; font-weight: bold; color: ${mutedTextColorDoc}; text-transform: uppercase; margin-bottom: 4px; margin-top:0;">Notes</h4><p style="white-space: pre-line; margin-top:0;">${invoiceNotes.replace(/\n/g, '<br/>')}</p>` : ''}</td>
        <td style="vertical-align:top; width:50%; padding-left:10px; border-left: 1px solid ${borderColorDoc};">${termsAndConditions ? `<h4 style="font-size: 8pt; font-weight: bold; color: ${mutedTextColorDoc}; text-transform: uppercase; margin-bottom: 3px; margin-top:0;">Terms &amp; Conditions</h4><p style="white-space: pre-line; margin-top:0; font-size: 7pt; color: ${mutedTextColorDoc}CC;">${termsAndConditions.replace(/\n/g, '<br/>')}</p>` : ''}</td>
       </tr>`
    : `<tr><td colspan="2">${invoiceNotes ? `<h4 style="font-size: ${templateStyle === 'compact' ? '7pt' : '9pt'}; font-weight: bold; color: ${mutedTextColorDoc}; text-transform: uppercase; margin-bottom: 4px; margin-top:0;">Notes</h4><p style="white-space: pre-line; margin-top:0; margin-bottom:10px;">${invoiceNotes.replace(/\n/g, '<br/>')}</p>` : ''}${termsAndConditions ? `<h4 style="font-size: ${templateStyle === 'compact' ? '6pt' : '8pt'}; font-weight: bold; color: ${mutedTextColorDoc}; text-transform: uppercase; margin-bottom: 3px; margin-top:${invoiceNotes ? '10px' : '0'}; border-top:${invoiceNotes ? '1px solid '+borderColorDoc : 'none'}; padding-top:${invoiceNotes ? '10px' : '0'};">Terms &amp; Conditions</h4><p style="white-space: pre-line; margin-top:0; font-size: ${templateStyle === 'compact' ? '6pt' : '7pt'}; color: ${mutedTextColorDoc}CC;">${termsAndConditions.replace(/\n/g, '<br/>')}</p>` : ''}</td></tr>`;

  const notesAndTermsHtml = (invoiceNotes || termsAndConditions) ? `
    <table style="width:100%; margin-top: 25px; padding-top:15px; border-top: 1px solid ${borderColorDoc}; font-size: ${templateStyle === 'compact' ? '7pt' : '9pt'}; color: ${mutedTextColorDoc};">
      ${notesAndTermsLayout}
    </table>
  ` : '';

  const amountInWordsHtml = amountInWords ? `
    <div style="margin-top:15px; padding-top:10px; border-top: 1px solid ${borderColorDoc}; font-size:${templateStyle === 'compact' ? '7pt' : '8pt'}; color:${mutedTextColorDoc}; font-style: italic;">
        <strong>Amount in Words:</strong> ${amountInWords}
    </div>
  ` : '';

  const tableStyles = `
    width: 100%;
    text-align: left;
    border-collapse: collapse;
    margin-bottom: 20px; /* Increased bottom margin for items table */
    font-size: ${templateStyle === 'compact' ? '8pt' : '9.5pt'};
    border: 1px solid ${borderColorDoc};
    border-radius: 6px; /* Not always supported in Word but good practice */
    overflow: hidden; /* For border-radius effect */
  `;
  const thStyles = `
    padding: ${templateStyle === 'compact' ? '6px' : '10px'};
    border-bottom: 1px solid ${borderColorDoc};
    background-color: ${headerBgColorDoc};
    font-weight: bold;
    color: ${mutedTextColorDoc};
    text-transform: uppercase;
    font-size: ${templateStyle === 'compact' ? '7pt' : '9pt'};
    ${(templateStyle === 'modern' || templateStyle === 'compact') ? `border-bottom-width:2px; border-bottom-color:${primaryColorDoc};` : ''}
  `;
  const totalsTableStyles = `
    width: ${templateStyle === 'modern' || templateStyle === 'compact' ? '50%' : '45%'};
    margin-left: auto;
    margin-bottom: 25px;
    font-size: ${templateStyle === 'compact' ? '9pt' : '10pt'};
  `;

  return `
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Invoice ${invoiceNumber}</title>
        <style>
          body { font-family: ${fontFamilyDoc}; margin: 0; color: ${textColorDoc}; font-size: ${templateStyle === 'compact' ? '9pt' : '10pt'}; background-color: #FFFFFF; }
          .invoice-container-doc { max-width: 800px; margin: 20px auto; padding: ${templateStyle === 'compact' ? '20px' : '30px'}; border: 1px solid ${borderColorDoc}; background-color: ${invoiceBgColorDoc}; position: relative; }
          .watermark-wrapper-doc { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; }
          .watermark-img-doc { max-width: 70%; max-height: 60%; object-fit: contain; opacity: ${displayWatermarkOpacity}; ${templateStyle === 'modern' || templateStyle === 'compact' ? 'filter: grayscale(50%);' : ''} }
          .content-wrapper-doc { position:relative; z-index:1; }
          .items-table-doc { ${tableStyles} }
          .items-table-doc th { ${thStyles} }
          .items-table-doc td { padding: ${templateStyle === 'compact' ? '6px' : '10px'}; border: 1px solid ${borderColorDoc}; vertical-align:top;}
          .totals-summary-table { ${totalsTableStyles} }
          .totals-summary-table td { padding: ${templateStyle === 'compact' ? '6px' : '8px'}; }
          .grand-total-line { font-weight: bold; font-size: ${templateStyle === 'compact' ? '12pt' : '14pt'}; color: ${primaryColorDoc}; background-color: ${primaryColorDoc}1A; padding: ${templateStyle === 'compact' ? '8px 10px' : '10px 12px'}; border-radius: 4px; }
          .footer-section-doc { text-align: center; font-size: ${templateStyle === 'compact' ? '7pt' : '8pt'}; color: #9ca3af; margin-top: 30px; padding-top: 15px; border-top: 1px solid ${borderColorDoc}; }
        </style>
      </head>
      <body>
        <div class="invoice-container-doc">
          ${watermarkDataUrl ? `<div class="watermark-wrapper-doc"><img class="watermark-img-doc" src="${watermarkDataUrl}" alt="Watermark"/></div>` : ''}
          <div class="content-wrapper-doc">
            ${selectedHeaderHtml}
            <table class="items-table-doc">
              <thead>
                <tr>
                  <th style="text-align: left; width: 40%;">Description</th>
                  <th style="text-align: right;">Qty/Dur.</th>
                  <th style="text-align: right;">Unit</th>
                  <th style="text-align: right;">Rate (${currentCurrency.symbol})</th>
                  <th style="text-align: right;">Disc (%)</th>
                  <th style="text-align: right;">Amount (${currentCurrency.symbol})</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>
            <table class="totals-summary-table">
                <tbody>
                    <tr>
                        <td colspan="5" style="text-align: right; font-weight: bold; color: ${mutedTextColorDoc}; border-top: 2px solid ${borderColorDoc};">SUBTOTAL:</td>
                        <td style="text-align: right; font-weight: bold; color: ${textColorDoc}; border-top: 2px solid ${borderColorDoc};">${fCurrency(subTotal)}</td>
                    </tr>
                    ${globalDiscountHtml}
                    <tr class="grand-total-line">
                         <td colspan="5" style="text-align: right;">TOTAL:</td>
                        <td style="text-align: right;">${fCurrency(totalFee)}</td>
                    </tr>
                </tbody>
            </table>
            ${amountInWordsHtml}
            ${notesAndTermsHtml}
            <div class="footer-section-doc"><p>Thank you for your business!</p></div>
          </div>
        </div>
      </body>
    </html>`;
};


export const generatePdf = async (data: StoredInvoiceData, _watermarkIgnored?: string, elementToCapture?: HTMLElement | null): Promise<void> => {
  if (!elementToCapture) {
    toast({ variant: "destructive", title: "PDF Error", description: "Template element not found for PDF generation."});
    throw new Error("Template element not provided for PDF generation.");
  }

  if (elementToCapture.offsetWidth === 0 || elementToCapture.offsetHeight === 0) {
      console.warn("PDF Capture element has no dimensions (0x0). Capture might fail or be empty.", elementToCapture);
      toast({ variant: "destructive", title: "PDF Error", description: "Capture element has no dimensions." });
      throw new Error("Capture element (PDF) has no dimensions.");
  }
  
  const originalStyle = {
      opacity: elementToCapture.style.opacity,
      position: elementToCapture.style.position, 
      left: elementToCapture.style.left,       
      top: elementToCapture.style.top,         
      zIndex: elementToCapture.style.zIndex,     
      backgroundColor: elementToCapture.style.backgroundColor,
  };
  
  elementToCapture.style.opacity = '1'; 
  elementToCapture.style.backgroundColor = 'hsl(0 0% 100%)'; // Force white background on capture element

  const docElement = document.documentElement;
  const wasDark = docElement.classList.contains('dark');
  if (wasDark) {
    docElement.classList.remove('dark'); // Force light mode for CSS variable resolution
  }
  
  await new Promise(resolve => setTimeout(resolve, 100)); // Delay for style changes

  try {
    const canvas = await html2canvas(elementToCapture, {
      scale: 2, 
      useCORS: true,
      logging: false, 
      backgroundColor: '#FFFFFF', // Explicit white background for canvas
      scrollX: -window.scrollX,
      scrollY: -window.scrollY,
      windowWidth: elementToCapture.scrollWidth,
      windowHeight: elementToCapture.scrollHeight,
      removeContainer: true, 
    });

    if (canvas.width === 0 || canvas.height === 0) {
        toast({ variant: "destructive", title: "PDF Error", description: "Canvas capture failed (empty canvas)." });
        throw new Error("Canvas capture failed for PDF (empty canvas)");
    }

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'l' : 'p',
      unit: 'px',
      format: [canvas.width, canvas.height],
      compress: true,
    });

    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(`invoice_${data.invoiceNumber}.pdf`);
    toast({ title: "PDF Generated!", description: "Your download should start shortly." });
  } catch (error) {
    console.error("Error generating PDF with html2canvas:", error);
    toast({ variant: "destructive", title: "PDF Generation Error", description: "Could not generate PDF. Check console." });
    throw error; 
  } finally {
    elementToCapture.style.opacity = originalStyle.opacity;
    elementToCapture.style.backgroundColor = originalStyle.backgroundColor;
    if (wasDark) {
      docElement.classList.add('dark');
    }
  }
};

export const generateDoc = async (data: StoredInvoiceData): Promise<void> => {
  const htmlContent = getInvoiceHtmlForDoc(data);
  const content = `
    <!DOCTYPE html>
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:w="urn:schemas-microsoft-com:office:word"
    xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"><title>Invoice ${data.invoiceNumber}</title>
    ${htmlContent.substring(htmlContent.indexOf("<style>"), htmlContent.indexOf("</style>") + 8)}
    </head>
    <body>${htmlContent.substring(htmlContent.indexOf("<body>") + 6, htmlContent.lastIndexOf("</body>"))}</body></html>`;

  simulateDownload(`invoice_${data.invoiceNumber}.doc`, content, 'application/vnd.ms-word');
  toast({ title: "DOC Generated!", description: "Your download should start shortly." });
};

export const generateJpeg = async (data: StoredInvoiceData, _watermarkIgnored?: string, elementToCapture?: HTMLElement | null): Promise<void> => {
  if (!elementToCapture) {
    toast({ variant: "destructive", title: "JPEG Error", description: "Template element not found for JPEG generation."});
    throw new Error("Template element not provided for JPEG generation.");
  }

   if (elementToCapture.offsetWidth === 0 || elementToCapture.offsetHeight === 0) {
      console.warn("JPEG Capture element has no dimensions (0x0). Capture might fail or be empty.", elementToCapture);
      toast({ variant: "destructive", title: "JPEG Error", description: "Capture element has no dimensions." });
      throw new Error("Capture element (JPEG) has no dimensions.");
  }

  const originalStyle = {
      opacity: elementToCapture.style.opacity,
      backgroundColor: elementToCapture.style.backgroundColor,
  };
  elementToCapture.style.opacity = '1';
  elementToCapture.style.backgroundColor = 'hsl(0 0% 100%)'; 

  const docElement = document.documentElement;
  const wasDark = docElement.classList.contains('dark');
  if (wasDark) {
    docElement.classList.remove('dark');
  }
  await new Promise(resolve => setTimeout(resolve, 100));

  try {
    const canvas = await html2canvas(elementToCapture, {
        scale: 1.5, 
        useCORS: true,
        logging: false, 
        backgroundColor: '#FFFFFF',
        scrollX: -window.scrollX,
        scrollY: -window.scrollY,
        windowWidth: elementToCapture.scrollWidth,
        windowHeight: elementToCapture.scrollHeight,
        removeContainer: true,
    });

    if (canvas.width === 0 || canvas.height === 0) {
        toast({ variant: "destructive", title: "JPEG Error", description: "Canvas capture failed (empty canvas)." });
        throw new Error("Canvas capture failed for JPEG (empty canvas)");
    }

    const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.9); 
    simulateDownload(`invoice_${data.invoiceNumber}.jpeg`, jpegDataUrl, 'image/jpeg', true);
    toast({ title: "JPEG Generated!", description: "Your download should start shortly." });
  } catch (error) {
    console.error("Error generating JPEG with html2canvas:", error);
    toast({ variant: "destructive", title: "JPEG Generation Error", description: "Could not generate JPEG. Check console." });
    throw error; 
  } finally {
    elementToCapture.style.opacity = originalStyle.opacity;
    elementToCapture.style.backgroundColor = originalStyle.backgroundColor;
    if (wasDark) {
      docElement.classList.add('dark');
    }
  }
};
