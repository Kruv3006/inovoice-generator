
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
    companyName, customerName, invoiceNumber, invoiceDate,
    items, subTotal, globalDiscountType, globalDiscountValue, totalFee, invoiceNotes,
    companyLogoDataUrl, watermarkDataUrl, watermarkOpacity, themeColor = 'default'
  } = data;

  const parsedInvoiceDate = invoiceDate && isValid(parseISO(invoiceDate)) ? parseISO(invoiceDate) : new Date();
  const displayWatermarkOpacity = typeof watermarkOpacity === 'number' ? watermarkOpacity : 0.05;

  const fCurrency = (val?: number) => val != null ? `₹${val.toFixed(2)}` : '₹0.00';

  const companyLogoHtml = companyLogoDataUrl
    ? `<img src="${companyLogoDataUrl}" style="max-height: 70px; max-width: 180px; margin-bottom: 10px; object-fit: contain;" alt="Company Logo"/>`
    : '';

  // Define theme colors directly here for DOC simplicity
  // These are approximations and might not exactly match the dynamic CSS variables.
  let primaryColorDoc = '#1D4ED8'; // Default blue
  let headerBgColorDoc = '#F3F4F6';
  let borderColorDoc = '#E5E7EB';
  let textColorDoc = '#1F2937';
  let mutedTextColorDoc = '#6B7280';

  if (themeColor === 'classic-blue') {
    primaryColorDoc = '#2563EB'; 
    headerBgColorDoc = '#EFF6FF';
    borderColorDoc = '#D1D5DB';
  } else if (themeColor === 'emerald-green') {
    primaryColorDoc = '#059669';
    headerBgColorDoc = '#ECFDF5';
    borderColorDoc = '#A7F3D0';
  } else if (themeColor === 'crimson-red') {
    primaryColorDoc = '#DC2626';
    headerBgColorDoc = '#FEF2F2';
    borderColorDoc = '#FECACA';
  }

  const invoiceBgColor = '#FFFFFF';


  let itemsHtml = '';
  if (items && items.length > 0) {
    items.forEach(item => {
      const itemStartDate = item.itemStartDate && isValid(parseISO(item.itemStartDate)) ? parseISO(item.itemStartDate) : null;
      const itemEndDate = item.itemEndDate && isValid(parseISO(item.itemEndDate)) ? parseISO(item.itemEndDate) : null;
      let displayQuantity = Number(item.quantity) || 0;
      let dateRangeHtml = '';

      if (itemStartDate && itemEndDate && itemEndDate >= itemStartDate) {
          displayQuantity = differenceInCalendarDays(itemEndDate, itemStartDate) + 1;
          dateRangeHtml = `<div style="font-size: 8pt; color: ${mutedTextColorDoc}; margin-top: 3px;">(${format(itemStartDate, "MMM d, yyyy")} - ${format(itemEndDate, "MMM d, yyyy")})</div>`;
      }
      const itemRate = Number(item.rate) || 0;
      const itemDiscount = Number(item.discount) || 0;
      const itemSubtotal = displayQuantity * itemRate;
      const discountedAmount = itemSubtotal * (1 - itemDiscount / 100);

      itemsHtml += `
        <tr style="background-color: ${invoiceBgColor};">
          <td style="padding: 10px; border: 1px solid ${borderColorDoc}; vertical-align: top; color: ${textColorDoc};">${item.description}${dateRangeHtml}</td>
          <td style="padding: 10px; border: 1px solid ${borderColorDoc}; vertical-align: top; text-align: right; color: ${mutedTextColorDoc};">${displayQuantity}</td>
          <td style="padding: 10px; border: 1px solid ${borderColorDoc}; vertical-align: top; text-align: right; color: ${mutedTextColorDoc};">${fCurrency(itemRate)}</td>
          <td style="padding: 10px; border: 1px solid ${borderColorDoc}; vertical-align: top; text-align: right; color: ${mutedTextColorDoc};">${itemDiscount > 0 ? `${itemDiscount}%` : '-'}</td>
          <td style="padding: 10px; border: 1px solid ${borderColorDoc}; vertical-align: top; text-align: right; color: ${textColorDoc};">${fCurrency(discountedAmount)}</td>
        </tr>
      `;
    });
  } else {
    itemsHtml = `<tr><td colspan="5" style="text-align:center; padding: 20px; border: 1px solid ${borderColorDoc}; color: ${mutedTextColorDoc};">No items listed.</td></tr>`;
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
        <td colspan="4" style="padding: 8px; text-align: right; font-weight: normal; color: ${mutedTextColorDoc}; border-top: 1px solid ${borderColorDoc};">
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
          body { font-family: Arial, sans-serif; margin: 0; color: ${textColorDoc}; font-size: 10pt; background-color: #f9fafb; }
          .invoice-container { max-width: 800px; margin: 20px auto; padding: 30px; border: 1px solid ${borderColorDoc}; background-color: ${invoiceBgColor}; position: relative; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); }
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
          .items-table-doc .rate-col { width: 15%; text-align: right; }
          .items-table-doc .discount-col { width: 10%; text-align: right; }
          .items-table-doc .amount-col { width: 25%; text-align: right; }

          .totals-summary-table { width: 40%; margin-left: auto; margin-bottom: 25px; font-size: 10pt; }
          .totals-summary-table td { padding: 8px; }
          .grand-total-line { font-weight: bold; font-size: 14pt; color: ${primaryColorDoc}; background-color: hsla(var(--invoice-primary-color-hsl, 217, 91%, 60%), 0.1); padding: 10px 12px; border-radius: 4px; } /* HSL might not work well in Word, using primaryColorDoc */
          .grand-total-line td:first-child { color: ${primaryColorDoc}; }
          .grand-total-line td:last-child { color: ${primaryColorDoc}; }


          .notes-section { margin-top: 25px; padding-top:15px; border-top: 1px solid ${borderColorDoc}; font-size: 9pt; color: ${mutedTextColorDoc}; }
          .notes-section h4 { font-size: 9pt; font-weight: bold; color: ${mutedTextColorDoc}; text-transform: uppercase; margin-bottom: 4px; margin-top:0; }

          .footer-section { text-align: center; font-size: 8pt; color: #9ca3af; margin-top: 30px; padding-top: 15px; border-top: 1px solid ${borderColorDoc}; }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <!-- Watermark Layer -->
          ${watermarkDataUrl ? `
          <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 0;">
            <img src="${watermarkDataUrl}" style="max-width: 80%; max-height: 70%; object-fit: contain; opacity: ${displayWatermarkOpacity};" alt="Watermark"/>
          </div>
          ` : ''}

          <!-- Content Layer -->
          <div class="content-wrapper" style="position: relative; z-index: 1;">
            <header class="header-section">
              <div class="header-left">
                ${companyLogoHtml ? `<div class="company-logo-doc">${companyLogoHtml}</div>` : ''}
                <div class="company-name-doc">${companyName || 'Your Company'}</div>
              </div>
              <div class="header-right invoice-details-doc">
                <div class="invoice-title-doc">INVOICE</div>
                <div><strong>Invoice No:</strong> ${invoiceNumber}</div>
                <div><strong>Date:</strong> ${format(parsedInvoiceDate, "MMMM d, yyyy")}</div>
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
                  <th class="qty-col" style="padding: 10px; border-bottom: 1px solid ${borderColorDoc}; background-color: ${headerBgColorDoc}; font-weight: bold; color: ${mutedTextColorDoc}; text-transform: uppercase; font-size: 9pt; text-align: right;">Qty / Days</th>
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
                        <td colspan="4" style="padding: 8px; text-align: right; font-weight: bold; color: ${mutedTextColorDoc}; border-top: 2px solid ${borderColorDoc};">
                            SUBTOTAL:
                        </td>
                        <td style="padding: 8px; text-align: right; font-weight: bold; color: ${textColorDoc}; border-top: 2px solid ${borderColorDoc};">
                            ${fCurrency(subTotal)}
                        </td>
                    </tr>
                    ${globalDiscountHtml}
                    <tr class="grand-total-line" style="background-color: ${primaryColorDoc}1A; /* 1A is approx 10% opacity hex */">
                         <td colspan="4" style="padding: 10px 12px; text-align: right; font-weight: bold; font-size: 14pt; color: ${primaryColorDoc};">
                            TOTAL:
                        </td>
                        <td style="padding: 10px 12px; text-align: right; font-weight: bold; font-size: 14pt; color: ${primaryColorDoc};">
                            ${fCurrency(totalFee)}
                        </td>
                    </tr>
                </tbody>
            </table>


            ${invoiceNotes ? `<div class="notes-section"><h4>Notes & Terms</h4><p style="white-space: pre-line;">${invoiceNotes.replace(/\n/g, '<br/>')}</p></div>` : ''}

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
  console.log("Generating PDF for:", data.invoiceNumber, "with watermark opacity:", data.watermarkOpacity);
  if (!elementToCapture) {
    toast({ variant: "destructive", title: "PDF Error", description: "Template element not found for PDF generation."});
    throw new Error("Template element not provided for PDF generation.");
  }

  console.log('Element to capture (PDF) dimensions:', elementToCapture.offsetWidth, 'x', elementToCapture.offsetHeight, 'Scroll:', elementToCapture.scrollWidth, 'x', elementToCapture.scrollHeight);
  if (elementToCapture.offsetWidth === 0 || elementToCapture.offsetHeight === 0) {
      console.error("Element to capture (PDF) has zero dimensions. Is it visible and rendered?");
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
  elementToCapture.style.zIndex = '10000'; // High z-index to ensure it's on top for capture
  
  // Determine background color based on current theme (light/dark) and invoice theme
  const isDarkTheme = document.documentElement.classList.contains('dark');
  let themeClass = `theme-${data.themeColor || 'default'}`;
  let invoiceBgVarName = '--invoice-background';
  if(isDarkTheme) {
     themeClass = `.dark .${themeClass}`; // More specific selector
  }
  // Temporarily add class to element for style computation if not already there
  const hadThemeClass = elementToCapture.classList.contains(`theme-${data.themeColor || 'default'}`);
  if (!hadThemeClass) elementToCapture.classList.add(`theme-${data.themeColor || 'default'}`);

  // Get computed style for background
  const computedStyle = getComputedStyle(elementToCapture);
  let docInvoiceBg = computedStyle.getPropertyValue(invoiceBgVarName).trim();
  
  if (!docInvoiceBg) { // Fallback if CSS var not resolved
    docInvoiceBg = isDarkTheme ? 'hsl(220, 15%, 15%)' : 'hsl(0, 0%, 100%)';
  }
  elementToCapture.style.backgroundColor = docInvoiceBg;
  if (!hadThemeClass) elementToCapture.classList.remove(`theme-${data.themeColor || 'default'}`);


  await new Promise(resolve => setTimeout(resolve, 300)); // Ensure styles are applied

  try {
    const canvas = await html2canvas(elementToCapture, {
      scale: 2, // Increased scale for better quality
      useCORS: true,
      logging: true,
      backgroundColor: null, // Let the element's background be captured
      scrollX: -window.scrollX,
      scrollY: -window.scrollY,
      windowWidth: elementToCapture.scrollWidth,
      windowHeight: elementToCapture.scrollHeight,
      removeContainer: true, // Clean up the cloned container
    });

    // Restore original styles
    elementToCapture.style.opacity = originalStyle.opacity;
    elementToCapture.style.position = originalStyle.position;
    elementToCapture.style.left = originalStyle.left;
    elementToCapture.style.top = originalStyle.top;
    elementToCapture.style.zIndex = originalStyle.zIndex;
    elementToCapture.style.backgroundColor = originalStyle.backgroundColor;


    if (canvas.width === 0 || canvas.height === 0) {
        console.error("html2canvas returned an empty canvas for PDF.");
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
    throw error; // Re-throw to be caught by handleGenerate
  }
};

export const generateDoc = async (data: StoredInvoiceData): Promise<void> => {
  console.log("Generating DOC for:", data.invoiceNumber);
  const htmlContent = getInvoiceHtmlForDoc(data);
  const content = `
    <!DOCTYPE html>
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:w="urn:schemas-microsoft-com:office:word"
    xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"><title>Invoice ${data.invoiceNumber}</title>
    </head>
    <body>${htmlContent}</body></html>`;

  simulateDownload(`invoice_${data.invoiceNumber}.doc`, content, 'application/vnd.ms-word');
};

export const generateJpeg = async (data: StoredInvoiceData, _watermarkIgnored?: string, elementToCapture?: HTMLElement | null): Promise<void> => {
  console.log("Generating JPEG for:", data.invoiceNumber, "with watermark opacity:", data.watermarkOpacity);
  if (!elementToCapture) {
    toast({ variant: "destructive", title: "JPEG Error", description: "Template element not found for JPEG generation."});
    throw new Error("Template element not provided for JPEG generation.");
  }

  console.log('Element to capture (JPEG) dimensions:', elementToCapture.offsetWidth, 'x', elementToCapture.offsetHeight, 'Scroll:', elementToCapture.scrollWidth, 'x', elementToCapture.scrollHeight);
   if (elementToCapture.offsetWidth === 0 || elementToCapture.offsetHeight === 0) {
      console.error("Element to capture (JPEG) has zero dimensions. Is it visible and rendered?");
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
  
  // Determine background color based on current theme (light/dark) and invoice theme
  const isDarkTheme = document.documentElement.classList.contains('dark');
  let themeClass = `theme-${data.themeColor || 'default'}`;
  let invoiceBgVarName = '--invoice-background';
   if(isDarkTheme) {
     themeClass = `.dark .${themeClass}`;
  }
  const hadThemeClass = elementToCapture.classList.contains(`theme-${data.themeColor || 'default'}`);
  if (!hadThemeClass) elementToCapture.classList.add(`theme-${data.themeColor || 'default'}`);
  
  const computedStyle = getComputedStyle(elementToCapture);
  let docInvoiceBg = computedStyle.getPropertyValue(invoiceBgVarName).trim();

  if (!docInvoiceBg) {
    docInvoiceBg = isDarkTheme ? 'hsl(220, 15%, 15%)' : 'hsl(0, 0%, 100%)';
  }
  elementToCapture.style.backgroundColor = docInvoiceBg;
  if (!hadThemeClass) elementToCapture.classList.remove(`theme-${data.themeColor || 'default'}`);


  await new Promise(resolve => setTimeout(resolve, 300));

  try {
    const canvas = await html2canvas(elementToCapture, {
        scale: 1.5, // Good quality for JPEG
        useCORS: true,
        logging: true,
        backgroundColor: docInvoiceBg, // Explicitly set background for JPEG
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


    if (canvas.width === 0 || canvas.height === 0) {
        console.error("html2canvas returned an empty canvas for JPEG.");
        toast({ variant: "destructive", title: "JPEG Error", description: "Canvas capture failed (empty canvas)." });
        throw new Error("Canvas capture failed for JPEG (empty canvas)");
    }

    const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.9); // Quality 0.9
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
    throw error; // Re-throw to be caught by handleGenerate
  }
};
