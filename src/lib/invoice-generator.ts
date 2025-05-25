
import type { StoredInvoiceData } from './invoice-types';
import { format, parseISO, isValid } from 'date-fns';
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
    companyLogoDataUrl, watermarkDataUrl, watermarkOpacity, themeColor = 'default', fontTheme = 'default', templateStyle = 'classic'
  } = data;

  // For DOC, always use light theme values
  const displayWatermarkOpacity = typeof watermarkOpacity === 'number' ? watermarkOpacity : 0.05;
  const invoiceBgColorDoc = 'hsl(0 0% 100%)';
  const textColorDoc = 'hsl(220 15% 20%)';
  const mutedTextColorDoc = 'hsl(220 10% 40%)';
  let primaryColorDoc = 'hsl(217 91% 55%)'; // Default light primary
  let headerBgColorDoc = 'hsl(220 20% 95%)';
  let borderColorDoc = 'hsl(220 15% 85%)';


  if (themeColor === 'classic-blue') {
    primaryColorDoc = 'hsl(210 80% 50%)';
    headerBgColorDoc = 'hsl(210 50% 96%)';
    borderColorDoc = 'hsl(210 30% 80%)';
  } else if (themeColor === 'emerald-green') {
    primaryColorDoc = 'hsl(145 63% 40%)';
    headerBgColorDoc = 'hsl(145 40% 95%)';
    borderColorDoc = 'hsl(145 30% 80%)';
  } else if (themeColor === 'crimson-red') {
    primaryColorDoc = 'hsl(340 70% 45%)';
    headerBgColorDoc = 'hsl(340 50% 96%)';
    borderColorDoc = 'hsl(340 40% 85%)';
  }

  let fontFamilyDoc = 'Arial, sans-serif';
  if (fontTheme === 'serif') fontFamilyDoc = 'Georgia, Times New Roman, Times, serif';
  else if (fontTheme === 'mono') fontFamilyDoc = 'Courier New, Courier, monospace';


  const parsedInvoiceDate = invoiceDate && isValid(parseISO(invoiceDate)) ? parseISO(invoiceDate) : new Date();
  const parsedDueDate = dueDate && isValid(parseISO(dueDate)) ? parseISO(dueDate) : null;
  
  const fCurrency = (val?: number) => val != null ? `₹${val.toFixed(2)}` : '₹0.00';

  const companyLogoHtml = companyLogoDataUrl
    ? `<img src="${companyLogoDataUrl}" style="max-height: ${templateStyle === 'modern' ? '50px' : '70px'}; max-width: ${templateStyle === 'modern' ? '150px' : '180px'}; object-fit: contain;" alt="Company Logo"/>`
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
      <p style="margin: 0; color: ${textColorDoc};">${customerName}</p>
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
            <p style="margin: 0; color: ${textColorDoc};">${customerName}</p>
        </div>
    </div>
  `;
  
  const selectedHeaderHtml = templateStyle === 'modern' ? modernHeaderHtml : classicHeaderHtml;

  const notesAndTermsLayout = (templateStyle === 'modern' && invoiceNotes && termsAndConditions) 
    ? `<tr>
        <td style="vertical-align:top; width:50%; padding-right:10px;">${invoiceNotes ? `<h4 style="font-size: 9pt; font-weight: bold; color: ${mutedTextColorDoc}; text-transform: uppercase; margin-bottom: 4px; margin-top:0;">Notes</h4><p style="white-space: pre-line; margin-top:0;">${invoiceNotes.replace(/\n/g, '<br/>')}</p>` : ''}</td>
        <td style="vertical-align:top; width:50%; padding-left:10px; border-left: 1px solid ${borderColorDoc};">${termsAndConditions ? `<h4 style="font-size: 8pt; font-weight: bold; color: ${mutedTextColorDoc}; text-transform: uppercase; margin-bottom: 3px; margin-top:0;">Terms &amp; Conditions</h4><p style="white-space: pre-line; margin-top:0; font-size: 7pt; color: ${mutedTextColorDoc}CC;">${termsAndConditions.replace(/\n/g, '<br/>')}</p>` : ''}</td>
       </tr>`
    : `<tr><td colspan="2">${invoiceNotes ? `<h4 style="font-size: 9pt; font-weight: bold; color: ${mutedTextColorDoc}; text-transform: uppercase; margin-bottom: 4px; margin-top:0;">Notes</h4><p style="white-space: pre-line; margin-top:0; margin-bottom:10px;">${invoiceNotes.replace(/\n/g, '<br/>')}</p>` : ''}${termsAndConditions ? `<h4 style="font-size: 8pt; font-weight: bold; color: ${mutedTextColorDoc}; text-transform: uppercase; margin-bottom: 3px; margin-top:${invoiceNotes ? '10px' : '0'}; border-top:${invoiceNotes ? '1px solid '+borderColorDoc : 'none'}; padding-top:${invoiceNotes ? '10px' : '0'};">Terms &amp; Conditions</h4><p style="white-space: pre-line; margin-top:0; font-size: 7pt; color: ${mutedTextColorDoc}CC;">${termsAndConditions.replace(/\n/g, '<br/>')}</p>` : ''}</td></tr>`;


  const notesAndTermsHtml = (invoiceNotes || termsAndConditions) ? `
    <table style="width:100%; margin-top: 25px; padding-top:15px; border-top: 1px solid ${borderColorDoc}; font-size: 9pt; color: ${mutedTextColorDoc};">
      ${notesAndTermsLayout}
    </table>
  ` : '';

  return `
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Invoice ${invoiceNumber}</title>
        <style>
          body { font-family: ${fontFamilyDoc}; margin: 0; color: ${textColorDoc}; font-size: 10pt; background-color: #FFFFFF; } /* Ensure body bg is white for DOC */
          .invoice-container-doc { max-width: 800px; margin: 20px auto; padding: 30px; border: 1px solid ${borderColorDoc}; background-color: ${invoiceBgColorDoc}; position: relative; }
          .watermark-wrapper-doc { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; overflow: hidden; }
          .watermark-img-doc { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); max-width: 70%; max-height: 60%; object-fit: contain; opacity: ${displayWatermarkOpacity}; ${templateStyle === 'modern' ? 'filter: grayscale(50%);' : ''} }
          .content-wrapper-doc { position:relative; z-index:1; }
          .items-table-doc { width: 100%; text-align: left; border-collapse: collapse; margin-bottom: 5px; font-size: 9.5pt; border: 1px solid ${borderColorDoc}; border-radius: 6px; overflow: hidden; }
          .items-table-doc th { padding: 10px; border-bottom: 1px solid ${borderColorDoc}; background-color: ${headerBgColorDoc}; font-weight: bold; color: ${mutedTextColorDoc}; text-transform: uppercase; font-size: 9pt; ${templateStyle === 'modern' ? 'border-bottom-width:2px; border-bottom-color:'+primaryColorDoc+';' : ''}}
          .totals-summary-table { width: ${templateStyle === 'modern' ? '50%' : '45%'}; margin-left: auto; margin-bottom: 25px; font-size: 10pt; }
          .totals-summary-table td { padding: 8px; }
          .grand-total-line { font-weight: bold; font-size: 14pt; color: ${primaryColorDoc}; background-color: ${primaryColorDoc}1A; padding: 10px 12px; border-radius: 4px; }
          .footer-section-doc { text-align: center; font-size: 8pt; color: #9ca3af; margin-top: 30px; padding-top: 15px; border-top: 1px solid ${borderColorDoc}; }
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
                  <th style="padding: 10px; border-bottom: 1px solid ${borderColorDoc}; background-color: ${headerBgColorDoc}; font-weight: bold; color: ${mutedTextColorDoc}; text-transform: uppercase; font-size: 9pt; text-align: left; width: 40%;">Description</th>
                  <th style="padding: 10px; border-bottom: 1px solid ${borderColorDoc}; background-color: ${headerBgColorDoc}; font-weight: bold; color: ${mutedTextColorDoc}; text-transform: uppercase; font-size: 9pt; text-align: right;">Qty/Dur.</th>
                  <th style="padding: 10px; border-bottom: 1px solid ${borderColorDoc}; background-color: ${headerBgColorDoc}; font-weight: bold; color: ${mutedTextColorDoc}; text-transform: uppercase; font-size: 9pt; text-align: right;">Unit</th>
                  <th style="padding: 10px; border-bottom: 1px solid ${borderColorDoc}; background-color: ${headerBgColorDoc}; font-weight: bold; color: ${mutedTextColorDoc}; text-transform: uppercase; font-size: 9pt; text-align: right;">Rate (₹)</th>
                  <th style="padding: 10px; border-bottom: 1px solid ${borderColorDoc}; background-color: ${headerBgColorDoc}; font-weight: bold; color: ${mutedTextColorDoc}; text-transform: uppercase; font-size: 9pt; text-align: right;">Disc (%)</th>
                  <th style="padding: 10px; border-bottom: 1px solid ${borderColorDoc}; background-color: ${headerBgColorDoc}; font-weight: bold; color: ${mutedTextColorDoc}; text-transform: uppercase; font-size: 9pt; text-align: right;">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>
            <table class="totals-summary-table">
                <tbody>
                    <tr>
                        <td colspan="5" style="padding: 8px; text-align: right; font-weight: bold; color: ${mutedTextColorDoc}; border-top: 2px solid ${borderColorDoc};">SUBTOTAL:</td>
                        <td style="padding: 8px; text-align: right; font-weight: bold; color: ${textColorDoc}; border-top: 2px solid ${borderColorDoc};">${fCurrency(subTotal)}</td>
                    </tr>
                    ${globalDiscountHtml}
                    <tr class="grand-total-line">
                         <td colspan="5" style="padding: 10px 12px; text-align: right; font-weight: bold; font-size: 14pt; color: ${primaryColorDoc};">TOTAL:</td>
                        <td style="padding: 10px 12px; text-align: right; font-weight: bold; font-size: 14pt; color: ${primaryColorDoc};">${fCurrency(totalFee)}</td>
                    </tr>
                </tbody>
            </table>
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
  
  elementToCapture.style.opacity = '1'; // Make fully visible for capture
  elementToCapture.style.backgroundColor = 'hsl(0 0% 100%)'; // Force white background for capture

  const docElement = document.documentElement;
  const wasDark = docElement.classList.contains('dark');
  if (wasDark) {
    docElement.classList.remove('dark');
  }
  // Allow a very brief moment for styles to re-evaluate based on removed .dark class
  await new Promise(resolve => setTimeout(resolve, 50));


  try {
    const canvas = await html2canvas(elementToCapture, {
      scale: 2, 
      useCORS: true,
      logging: false, // Keep false unless debugging
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
  } catch (error) {
    console.error("Error generating PDF with html2canvas:", error);
    toast({ variant: "destructive", title: "PDF Generation Error", description: "Could not generate PDF. Check console." });
    throw error; // Re-throw to be caught by handleGenerate
  } finally {
    // Restore original styles and dark mode
    elementToCapture.style.opacity = originalStyle.opacity;
    elementToCapture.style.backgroundColor = originalStyle.backgroundColor;
    // Note: other styles like position, left, top, zIndex are not restored here as they are part of the off-screen div's fixed setup
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
};

export const generateJpeg = async (data: StoredInvoiceData, _watermarkIgnored?: string, elementToCapture?: HTMLElement | null): Promise<void> => {
  if (!elementToCapture) {
    toast({ variant: "destructive", title: "JPEG Error", description: "Template element not found for JPEG generation."});
    throw new Error("Template element not provided for JPEG generation.");
  }

   if (elementToCapture.offsetWidth === 0 || elementToCapture.offsetHeight === 0) {
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
  await new Promise(resolve => setTimeout(resolve, 50));

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
  } catch (error) {
    console.error("Error generating JPEG with html2canvas:", error);
    toast({ variant: "destructive", title: "JPEG Generation Error", description: "Could not generate JPEG. Check console." });
    throw error; // Re-throw
  } finally {
    elementToCapture.style.opacity = originalStyle.opacity;
    elementToCapture.style.backgroundColor = originalStyle.backgroundColor;
    if (wasDark) {
      docElement.classList.add('dark');
    }
  }
};
