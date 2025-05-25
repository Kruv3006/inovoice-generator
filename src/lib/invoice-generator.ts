
import type { StoredInvoiceData } from './invoice-types';
import { format, parseISO, isValid, differenceInCalendarDays } from 'date-fns';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from '@/hooks/use-toast';

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
    companyLogoDataUrl, watermarkDataUrl, watermarkOpacity, themeColor = 'default', fontTheme = 'default'
  } = data;

  const parsedInvoiceDate = invoiceDate && isValid(parseISO(invoiceDate)) ? parseISO(invoiceDate) : new Date();
  const parsedDueDate = dueDate && isValid(parseISO(dueDate)) ? parseISO(dueDate) : null;
  const displayWatermarkOpacity = typeof watermarkOpacity === 'number' ? watermarkOpacity : 0.05;

  const fCurrency = (val?: number) => val != null ? `₹${val.toFixed(2)}` : '₹0.00';

  const companyLogoHtml = companyLogoDataUrl
    ? `<img src="${companyLogoDataUrl}" style="max-height: 70px; max-width: 180px; margin-bottom: 10px; object-fit: contain;" alt="Company Logo"/>`
    : '';

  let primaryColorDoc = '#1D4ED8'; 
  let headerBgColorDoc = '#F3F4F6';
  let borderColorDoc = '#E5E7EB';
  let textColorDoc = '#1F2937';
  let mutedTextColorDoc = '#6B7280';

  if (themeColor === 'classic-blue') {
    primaryColorDoc = '#2563EB'; 
    headerBgColorDoc = 'hsl(210, 50%, 96%)';
    borderColorDoc = 'hsl(210, 30%, 80%)';
  } else if (themeColor === 'emerald-green') {
    primaryColorDoc = '#059669';
    headerBgColorDoc = 'hsl(145, 40%, 95%)';
    borderColorDoc = 'hsl(145, 30%, 80%)';
  } else if (themeColor === 'crimson-red') {
    primaryColorDoc = '#DC2626';
    headerBgColorDoc = 'hsl(340, 50%, 96%)';
    borderColorDoc = 'hsl(340, 40%, 85%)';
  }
  const invoiceBgColor = '#FFFFFF';

  let fontFamilyDoc = 'Arial, sans-serif';
  if (fontTheme === 'serif') {
    fontFamilyDoc = 'Georgia, Times New Roman, Times, serif';
  } else if (fontTheme === 'mono') {
    fontFamilyDoc = 'Courier New, Courier, monospace';
  }


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

                  if (durationParts.length > 0) {
                    displayDurationStringDoc = `<div style="font-size: 8pt; color: ${mutedTextColorDoc}; margin-top: 3px;">(Duration: ${durationParts.join(', ')})</div>`;
                  }
              }
          } catch (e) { /* ignore parsing error for doc generation */ }
      } else if (item.itemStartDate && item.itemEndDate && isValid(parseISO(item.itemStartDate)) && isValid(parseISO(item.itemEndDate))) {
          displayDurationStringDoc = `<div style="font-size: 8pt; color: ${mutedTextColorDoc}; margin-top: 3px;">(${format(parseISO(item.itemStartDate), "MMM d, yyyy")} - ${format(parseISO(item.itemEndDate), "MMM d, yyyy")})</div>`;
      }

      const itemQuantity = Number(item.quantity) || 0;
      const itemRate = Number(item.rate) || 0;
      const itemDiscount = Number(item.discount) || 0;
      const itemSubtotal = itemQuantity * itemRate;
      const discountedAmount = itemSubtotal * (1 - itemDiscount / 100);

      itemsHtml += `
        <tr style="background-color: ${invoiceBgColor};">
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

  return `
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Invoice ${invoiceNumber}</title>
        <style>
          body { font-family: ${fontFamilyDoc}; margin: 0; color: ${textColorDoc}; font-size: 10pt; background-color: #f9fafb; }
          .invoice-container { max-width: 800px; margin: 20px auto; padding: 30px; border: 1px solid ${borderColorDoc}; background-color: ${invoiceBgColor}; position: relative; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); }
          .watermark-container-doc { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 0; }
          .watermark-container-doc img { max-width: 80%; max-height: 70%; object-fit: contain; opacity: ${displayWatermarkOpacity}; }
          .content-wrapper { position:relative; z-index:1; }

          .header-section { display: table; width: 100%; margin-bottom: 25px; padding-bottom:15px; border-bottom: 1px solid ${borderColorDoc}; }
          .header-left { display: table-cell; vertical-align: middle; }
          .header-right { display: table-cell; vertical-align: middle; text-align: right; }
          .company-logo-doc { margin-bottom: 5px; }
          .company-name-doc { font-size: 20px; font-weight: bold; color: ${primaryColorDoc}; margin-bottom: 2px; }
          .invoice-title-doc { font-size: 24px; font-weight: bold; margin-bottom: 0px; color: ${mutedTextColorDoc}; text-transform: uppercase; }
          .invoice-details-doc div { margin-bottom: 2px; font-size: 9.5pt; color: ${mutedTextColorDoc}; }
          .invoice-details-doc strong { color: ${textColorDoc}; }

          .client-info-section { display: table; width: 100%; margin-bottom: 25px; }
          .client-info-left { display: table-cell; vertical-align: top; width: 50%; font-size: 9.5pt; }
          .client-info-section h3 { font-size: 9pt; font-weight: bold; color: ${mutedTextColorDoc}; text-transform: uppercase; margin-bottom: 4px; margin-top:0; }
          .client-info-section p { margin: 0 0 3px 0; color: ${textColorDoc}; }

          .items-table-doc { width: 100%; text-align: left; border-collapse: collapse; margin-bottom: 5px; font-size: 9.5pt; border: 1px solid ${borderColorDoc}; border-radius: 6px; overflow: hidden; }
          .items-table-doc th { padding: 10px; border-bottom: 1px solid ${borderColorDoc}; background-color: ${headerBgColorDoc}; font-weight: bold; color: ${mutedTextColorDoc}; text-transform: uppercase; font-size: 9pt;}
          .items-table-doc .description-col { width: 40%; }
          .items-table-doc .qty-col { width: 10%; text-align: right;}
          .items-table-doc .unit-col { width: 10%; text-align: right;}
          .items-table-doc .rate-col { width: 15%; text-align: right; }
          .items-table-doc .discount-col { width: 10%; text-align: right; }
          .items-table-doc .amount-col { width: 15%; text-align: right; }


          .totals-summary-table { width: 45%; margin-left: auto; margin-bottom: 25px; font-size: 10pt; } 
          .totals-summary-table td { padding: 8px; }
          .grand-total-line { font-weight: bold; font-size: 14pt; color: ${primaryColorDoc}; background-color: ${primaryColorDoc}1A; padding: 10px 12px; border-radius: 4px; }
          .grand-total-line td:first-child { color: ${primaryColorDoc}; }
          .grand-total-line td:last-child { color: ${primaryColorDoc}; }


          .notes-section { margin-top: 25px; padding-top:15px; border-top: 1px solid ${borderColorDoc}; font-size: 9pt; color: ${mutedTextColorDoc}; }
          .notes-section h4 { font-size: 9pt; font-weight: bold; color: ${mutedTextColorDoc}; text-transform: uppercase; margin-bottom: 4px; margin-top:0; }
          
          .terms-section { margin-top: 20px; padding-top:10px; border-top: 1px solid ${borderColorDoc}; font-size: 7pt; color: ${mutedTextColorDoc}; }
          .terms-section h4 { font-size: 8pt; font-weight: bold; color: ${mutedTextColorDoc}; text-transform: uppercase; margin-bottom: 3px; margin-top:0; }


          .footer-section { text-align: center; font-size: 8pt; color: #9ca3af; margin-top: 30px; padding-top: 15px; border-top: 1px solid ${borderColorDoc}; }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          ${watermarkDataUrl ? `
          <div class="watermark-container-doc">
            <img src="${watermarkDataUrl}" alt="Watermark"/>
          </div>
          ` : ''}

          <div class="content-wrapper">
            <header class="header-section">
              <div class="header-left">
                ${companyLogoHtml ? `<div class="company-logo-doc">${companyLogoHtml}</div>` : ''}
                <div class="company-name-doc">${companyName || 'Your Company'}</div>
              </div>
              <div class="header-right invoice-details-doc">
                <div class="invoice-title-doc">INVOICE</div>
                <div><strong>Invoice No:</strong> ${invoiceNumber}</div>
                <div><strong>Date:</strong> ${format(parsedInvoiceDate, "MMMM d, yyyy")}</div>
                ${parsedDueDate ? `<div><strong>Due Date:</strong> ${format(parsedDueDate, "MMMM d, yyyy")}</div>` : ''}
              </div>
            </header>

            <div class="client-info-section">
              <div class="client-info-left">
                <h3>Bill To</h3>
                <p>${customerName}</p>
              </div>
            </div>

            <table class="items-table-doc">
              <thead>
                <tr>
                  <th class="description-col" style="padding: 10px; border-bottom: 1px solid ${borderColorDoc}; background-color: ${headerBgColorDoc}; font-weight: bold; color: ${mutedTextColorDoc}; text-transform: uppercase; font-size: 9pt; text-align: left;">Description</th>
                  <th class="qty-col" style="padding: 10px; border-bottom: 1px solid ${borderColorDoc}; background-color: ${headerBgColorDoc}; font-weight: bold; color: ${mutedTextColorDoc}; text-transform: uppercase; font-size: 9pt; text-align: right;">Qty</th>
                  <th class="unit-col" style="padding: 10px; border-bottom: 1px solid ${borderColorDoc}; background-color: ${headerBgColorDoc}; font-weight: bold; color: ${mutedTextColorDoc}; text-transform: uppercase; font-size: 9pt; text-align: right;">Unit</th>
                  <th class="rate-col" style="padding: 10px; border-bottom: 1px solid ${borderColorDoc}; background-color: ${headerBgColorDoc}; font-weight: bold; color: ${mutedTextColorDoc}; text-transform: uppercase; font-size: 9pt; text-align: right;">Rate (₹)</th>
                  <th class="discount-col" style="padding: 10px; border-bottom: 1px solid ${borderColorDoc}; background-color: ${headerBgColorDoc}; font-weight: bold; color: ${mutedTextColorDoc}; text-transform: uppercase; font-size: 9pt; text-align: right;">Disc (%)</th>
                  <th class="amount-col" style="padding: 10px; border-bottom: 1px solid ${borderColorDoc}; background-color: ${headerBgColorDoc}; font-weight: bold; color: ${mutedTextColorDoc}; text-transform: uppercase; font-size: 9pt; text-align: right;">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            
            <table class="totals-summary-table">
                <tbody>
                    <tr>
                        <td colspan="5" style="padding: 8px; text-align: right; font-weight: bold; color: ${mutedTextColorDoc}; border-top: 2px solid ${borderColorDoc};">
                            SUBTOTAL:
                        </td>
                        <td style="padding: 8px; text-align: right; font-weight: bold; color: ${textColorDoc}; border-top: 2px solid ${borderColorDoc};">
                            ${fCurrency(subTotal)}
                        </td>
                    </tr>
                    ${globalDiscountHtml}
                    <tr class="grand-total-line">
                         <td colspan="5" style="padding: 10px 12px; text-align: right; font-weight: bold; font-size: 14pt; color: ${primaryColorDoc};">
                            TOTAL:
                        </td>
                        <td style="padding: 10px 12px; text-align: right; font-weight: bold; font-size: 14pt; color: ${primaryColorDoc};">
                            ${fCurrency(totalFee)}
                        </td>
                    </tr>
                </tbody>
            </table>


            ${invoiceNotes ? `<div class="notes-section"><h4>Notes</h4><p style="white-space: pre-line;">${invoiceNotes.replace(/\n/g, '<br/>')}</p></div>` : ''}
            ${termsAndConditions ? `<div class="terms-section"><h4>Terms &amp; Conditions</h4><p style="white-space: pre-line;">${termsAndConditions.replace(/\n/g, '<br/>')}</p></div>` : ''}


            <div class="footer-section">
              <p>Thank you for your business!</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
};


export const generatePdf = async (data: StoredInvoiceData, _watermarkIgnored?: string, elementToCapture?: HTMLElement | null): Promise<void> => {
  if (!elementToCapture) {
    toast({ variant: "destructive", title: "PDF Error", description: "Template element not found for PDF generation."});
    throw new Error("Template element not provided for PDF generation.");
  }

  if (elementToCapture.offsetWidth === 0 || elementToCapture.offsetHeight === 0) {
      console.error("Element to capture (PDF) has zero dimensions. Is it visible and rendered?", elementToCapture);
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
  elementToCapture.style.position = 'fixed'; 
  elementToCapture.style.left = '0px'; 
  elementToCapture.style.top = '0px';
  elementToCapture.style.zIndex = '10000'; 
  
  const isDarkTheme = document.documentElement.classList.contains('dark');
  let themeColorClass = `theme-${data.themeColor || 'default'}`;
  let fontThemeClass = `font-theme-${data.fontTheme || 'default'}`;
  
  const hadThemeColorClass = elementToCapture.classList.contains(themeColorClass.split(" .")[1] || themeColorClass);
  const hadFontThemeClass = elementToCapture.classList.contains(fontThemeClass);

  if (!hadThemeColorClass) elementToCapture.classList.add(themeColorClass.split(" .")[1] || themeColorClass);
  if (!hadFontThemeClass) elementToCapture.classList.add(fontThemeClass);


  const computedStyle = getComputedStyle(elementToCapture);
  let docInvoiceBg = computedStyle.getPropertyValue('--invoice-background').trim();
  
  if (!docInvoiceBg || docInvoiceBg === "transparent" || docInvoiceBg === "rgba(0, 0, 0, 0)") { 
    docInvoiceBg = isDarkTheme ? 'hsl(220, 15%, 15%)' : 'hsl(0, 0%, 100%)';
  }
  elementToCapture.style.backgroundColor = docInvoiceBg;


  await new Promise(resolve => setTimeout(resolve, 300)); 

  try {
    console.log(`Capturing element for PDF: ${elementToCapture.offsetWidth}x${elementToCapture.offsetHeight}`);
    const canvas = await html2canvas(elementToCapture, {
      scale: 2, 
      useCORS: true,
      logging: true,
      backgroundColor: null, 
      scrollX: -window.scrollX,
      scrollY: -window.scrollY,
      windowWidth: elementToCapture.scrollWidth,
      windowHeight: elementToCapture.scrollHeight,
      removeContainer: true, 
    });

    elementToCapture.style.opacity = originalStyle.opacity;
    elementToCapture.style.position = originalStyle.position;
    elementToCapture.style.left = originalStyle.left;
    elementToCapture.style.top = originalStyle.top;
    elementToCapture.style.zIndex = originalStyle.zIndex;
    elementToCapture.style.backgroundColor = originalStyle.backgroundColor;
    if (!hadThemeColorClass && (themeColorClass.split(" .")[1] || themeColorClass)) elementToCapture.classList.remove(themeColorClass.split(" .")[1] || themeColorClass);
    if (!hadFontThemeClass) elementToCapture.classList.remove(fontThemeClass);


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
  } catch (error) {
    console.error("Error generating PDF with html2canvas:", error);
    toast({ variant: "destructive", title: "PDF Generation Error", description: "Could not generate PDF. Check console." });

    elementToCapture.style.opacity = originalStyle.opacity;
    elementToCapture.style.position = originalStyle.position;
    elementToCapture.style.left = originalStyle.left;
    elementToCapture.style.top = originalStyle.top;
    elementToCapture.style.zIndex = originalStyle.zIndex;
    elementToCapture.style.backgroundColor = originalStyle.backgroundColor;
    if (!hadThemeColorClass && (themeColorClass.split(" .")[1] || themeColorClass)) elementToCapture.classList.remove(themeColorClass.split(" .")[1] || themeColorClass);
    if (!hadFontThemeClass) elementToCapture.classList.remove(fontThemeClass);
    throw error; 
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
};

export const generateJpeg = async (data: StoredInvoiceData, _watermarkIgnored?: string, elementToCapture?: HTMLElement | null): Promise<void> => {
  if (!elementToCapture) {
    toast({ variant: "destructive", title: "JPEG Error", description: "Template element not found for JPEG generation."});
    throw new Error("Template element not provided for JPEG generation.");
  }

   if (elementToCapture.offsetWidth === 0 || elementToCapture.offsetHeight === 0) {
      console.error("Element to capture (JPEG) has zero dimensions. Is it visible and rendered?", elementToCapture);
      toast({ variant: "destructive", title: "JPEG Error", description: "Capture element has no dimensions." });
      throw new Error("Capture element (JPEG) has no dimensions.");
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
  elementToCapture.style.position = 'fixed';
  elementToCapture.style.left = '0px';
  elementToCapture.style.top = '0px';
  elementToCapture.style.zIndex = '10000';
  
  const isDarkTheme = document.documentElement.classList.contains('dark');
  let themeColorClass = `theme-${data.themeColor || 'default'}`;
  let fontThemeClass = `font-theme-${data.fontTheme || 'default'}`;

  const hadThemeColorClass = elementToCapture.classList.contains(themeColorClass.split(" .")[1] || themeColorClass);
  const hadFontThemeClass = elementToCapture.classList.contains(fontThemeClass);

  if (!hadThemeColorClass) elementToCapture.classList.add(themeColorClass.split(" .")[1] || themeColorClass);
  if (!hadFontThemeClass) elementToCapture.classList.add(fontThemeClass);
  
  const computedStyle = getComputedStyle(elementToCapture);
  let docInvoiceBg = computedStyle.getPropertyValue('--invoice-background').trim();

  if (!docInvoiceBg || docInvoiceBg === "transparent" || docInvoiceBg === "rgba(0, 0, 0, 0)") {
    docInvoiceBg = isDarkTheme ? 'hsl(220, 15%, 15%)' : 'hsl(0, 0%, 100%)';
  }
  elementToCapture.style.backgroundColor = docInvoiceBg;


  await new Promise(resolve => setTimeout(resolve, 300));

  try {
    console.log(`Capturing element for JPEG: ${elementToCapture.offsetWidth}x${elementToCapture.offsetHeight}`);
    const canvas = await html2canvas(elementToCapture, {
        scale: 1.5, 
        useCORS: true,
        logging: true,
        backgroundColor: docInvoiceBg, 
        scrollX: -window.scrollX,
        scrollY: -window.scrollY,
        windowWidth: elementToCapture.scrollWidth,
        windowHeight: elementToCapture.scrollHeight,
        removeContainer: true,
    });

    elementToCapture.style.opacity = originalStyle.opacity;
    elementToCapture.style.position = originalStyle.position;
    elementToCapture.style.left = originalStyle.left;
    elementToCapture.style.top = originalStyle.top;
    elementToCapture.style.zIndex = originalStyle.zIndex;
    elementToCapture.style.backgroundColor = originalStyle.backgroundColor;
    if (!hadThemeColorClass && (themeColorClass.split(" .")[1] || themeColorClass)) elementToCapture.classList.remove(themeColorClass.split(" .")[1] || themeColorClass);
    if (!hadFontThemeClass) elementToCapture.classList.remove(fontThemeClass);


    if (canvas.width === 0 || canvas.height === 0) {
        toast({ variant: "destructive", title: "JPEG Error", description: "Canvas capture failed (empty canvas)." });
        throw new Error("Canvas capture failed for JPEG (empty canvas)");
    }

    const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.9); 
    simulateDownload(`invoice_${data.invoiceNumber}.jpeg`, jpegDataUrl, 'image/jpeg', true);
  } catch (error) {
    console.error("Error generating JPEG with html2canvas:", error);
    toast({ variant: "destructive", title: "JPEG Generation Error", description: "Could not generate JPEG. Check console." });
    
    elementToCapture.style.opacity = originalStyle.opacity;
    elementToCapture.style.position = originalStyle.position;
    elementToCapture.style.left = originalStyle.left;
    elementToCapture.style.top = originalStyle.top;
    elementToCapture.style.zIndex = originalStyle.zIndex;
    elementToCapture.style.backgroundColor = originalStyle.backgroundColor;
    if (!hadThemeColorClass && (themeColorClass.split(" .")[1] || themeColorClass)) elementToCapture.classList.remove(themeColorClass.split(" .")[1] || themeColorClass);
    if (!hadFontThemeClass) elementToCapture.classList.remove(fontThemeClass);
    throw error;
  }
};
    