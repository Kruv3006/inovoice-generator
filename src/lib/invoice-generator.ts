
import type { StoredInvoiceData } from './invoice-types';
import { format, parseISO, isValid, differenceInCalendarDays } from 'date-fns';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils'; // cn might be useful for conditional classes if needed

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

  const parsedInvoiceDate = invoiceDate && isValid(parseISO(invoiceDate)) ? parseISO(invoiceDate) : new Date();
  const parsedDueDate = dueDate && isValid(parseISO(dueDate)) ? parseISO(dueDate) : null;
  const displayWatermarkOpacity = typeof watermarkOpacity === 'number' ? watermarkOpacity : 0.05;

  const fCurrency = (val?: number) => val != null ? `₹${val.toFixed(2)}` : '₹0.00';

  const companyLogoHtml = companyLogoDataUrl
    ? `<img src="${companyLogoDataUrl}" style="max-height: ${templateStyle === 'modern' ? '50px' : '70px'}; max-width: ${templateStyle === 'modern' ? '150px' : '180px'}; margin-bottom: 10px; object-fit: contain;" alt="Company Logo"/>`
    : '';

  let primaryColorDoc = '#1D4ED8'; // Default blue
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

  const classicHeaderHtml = `
    <div class="header-section" style="display: table; width: 100%; margin-bottom: 25px; padding-bottom:15px; border-bottom: 1px solid ${borderColorDoc};">
      <div class="header-left" style="display: table-cell; vertical-align: middle;">
        ${companyLogoHtml ? `<div class="company-logo-doc" style="margin-bottom: 5px;">${companyLogoHtml}</div>` : ''}
        <div class="company-name-doc" style="font-size: 20px; font-weight: bold; color: ${primaryColorDoc}; margin-bottom: 2px;">${companyName || 'Your Company'}</div>
      </div>
      <div class="header-right invoice-details-doc" style="display: table-cell; vertical-align: middle; text-align: right; font-size: 9.5pt; color: ${mutedTextColorDoc};">
        <div class="invoice-title-doc" style="font-size: 24px; font-weight: bold; margin-bottom: 0px; color: ${mutedTextColorDoc}; text-transform: uppercase;">INVOICE</div>
        <div style="margin-bottom: 2px;"><strong style="color: ${textColorDoc};">Invoice No:</strong> ${invoiceNumber}</div>
        <div style="margin-bottom: 2px;"><strong style="color: ${textColorDoc};">Date:</strong> ${format(parsedInvoiceDate, "MMMM d, yyyy")}</div>
        ${parsedDueDate ? `<div style="margin-bottom: 2px;"><strong style="color: ${textColorDoc};">Due Date:</strong> ${format(parsedDueDate, "MMMM d, yyyy")}</div>` : ''}
      </div>
    </div>
    <div class="client-info-section" style="display: table; width: 100%; margin-bottom: 25px;">
      <div class="client-info-left" style="display: table-cell; vertical-align: top; width: 50%; font-size: 9.5pt;">
        <h3 style="font-size: 9pt; font-weight: bold; color: ${mutedTextColorDoc}; text-transform: uppercase; margin-bottom: 4px; margin-top:0;">Bill To</h3>
        <p style="margin: 0 0 3px 0; color: ${textColorDoc};">${customerName}</p>
      </div>
    </div>
  `;

  const modernHeaderHtml = `
    <div class="header-section modern-header" style="padding-bottom:15px; margin-bottom: 25px; border-bottom: 1px solid ${borderColorDoc};">
        <div style="display:table; width:100%; vertical-align:top;">
            <div style="display:table-cell; width:60%;">
                ${companyLogoHtml ? `<div class="company-logo-doc" style="margin-bottom: 5px;">${companyLogoHtml}</div>` : ''}
                <div class="company-name-doc" style="font-size: 18px; font-weight: bold; color: ${primaryColorDoc}; margin-bottom: 2px;">${companyName || 'Your Company'}</div>
            </div>
            <div style="display:table-cell; width:40%; text-align:right; vertical-align:top;">
                <div class="invoice-title-doc" style="font-size: 22px; font-weight: bold; margin-bottom: 5px; color: ${mutedTextColorDoc}; text-transform: uppercase;">INVOICE</div>
                <div style="font-size: 9pt; color: ${mutedTextColorDoc};"><strong style="color: ${textColorDoc};">No:</strong> ${invoiceNumber}</div>
                <div style="font-size: 9pt; color: ${mutedTextColorDoc};"><strong style="color: ${textColorDoc};">Date:</strong> ${format(parsedInvoiceDate, "MMMM d, yyyy")}</div>
                ${parsedDueDate ? `<div style="font-size: 9pt; color: ${mutedTextColorDoc};"><strong style="color: ${textColorDoc};">Due:</strong> ${format(parsedDueDate, "MMMM d, yyyy")}</div>` : ''}
            </div>
        </div>
        <div style="margin-top: 15px; padding-top:10px; border-top: 1px solid ${borderColorDoc};">
            <h3 style="font-size: 9pt; font-weight: bold; color: ${mutedTextColorDoc}; text-transform: uppercase; margin-bottom: 4px; margin-top:0;">BILL TO:</h3>
            <p style="margin: 0 0 3px 0; color: ${textColorDoc}; font-size: 9.5pt;">${customerName}</p>
        </div>
    </div>
  `;

  const selectedHeaderHtml = templateStyle === 'modern' ? modernHeaderHtml : classicHeaderHtml;

  const notesAndTermsHtml = `
    <table style="width:100%; margin-top: 25px; padding-top:15px; border-top: 1px solid ${borderColorDoc}; font-size: 9pt; color: ${mutedTextColorDoc};">
      <tr>
        ${invoiceNotes ? `<td style="vertical-align:top; ${termsAndConditions && templateStyle === 'modern' ? 'width:50%; padding-right:10px;' : 'width:100%;'}">
                          <h4 style="font-size: 9pt; font-weight: bold; color: ${mutedTextColorDoc}; text-transform: uppercase; margin-bottom: 4px; margin-top:0;">Notes</h4>
                          <p style="white-space: pre-line; margin-top:0;">${invoiceNotes.replace(/\n/g, '<br/>')}</p>
                        </td>` : (termsAndConditions && templateStyle === 'modern' ? '<td></td>' : '')}
        ${termsAndConditions ? `<td style="vertical-align:top; ${invoiceNotes && templateStyle === 'modern' ? 'width:50%; padding-left:10px; border-left: 1px solid ' + borderColorDoc + ';' : 'width:100%; margin-top:10px; padding-top:10px; border-top:'+ (invoiceNotes ? 'none' : '1px solid '+borderColorDoc)+';'}">
                                <h4 style="font-size: ${templateStyle === 'modern' ? '9pt' : '8pt'}; font-weight: bold; color: ${mutedTextColorDoc}; text-transform: uppercase; margin-bottom: ${templateStyle === 'modern' ? '4px' : '3px'}; margin-top:0;">Terms &amp; Conditions</h4>
                                <p style="white-space: pre-line; margin-top:0; font-size: ${templateStyle === 'modern' ? '8pt' : '7pt'}; color: ${mutedTextColorDoc}CC;">${termsAndConditions.replace(/\n/g, '<br/>')}</p>
                              </td>` : (invoiceNotes && templateStyle === 'modern' ? '<td></td>' : '')}
      </tr>
    </table>
  `;


  return `
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Invoice ${invoiceNumber}</title>
        <style>
          body { font-family: ${fontFamilyDoc}; margin: 0; color: ${textColorDoc}; font-size: 10pt; background-color: #f9fafb; }
          .invoice-container { max-width: 800px; margin: 20px auto; padding: 30px; border: 1px solid ${borderColorDoc}; background-color: ${invoiceBgColor}; position: relative; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); }
          .watermark-container-doc { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 0; }
          .watermark-container-doc img { max-width: 70%; max-height: 60%; object-fit: contain; opacity: ${displayWatermarkOpacity}; ${templateStyle === 'modern' ? 'filter: grayscale(50%);' : ''} }
          .content-wrapper { position:relative; z-index:1; }

          .items-table-doc { width: 100%; text-align: left; border-collapse: collapse; margin-bottom: 5px; font-size: 9.5pt; border: 1px solid ${borderColorDoc}; border-radius: 6px; overflow: hidden; }
          .items-table-doc th { padding: 10px; border-bottom: 1px solid ${borderColorDoc}; background-color: ${headerBgColorDoc}; font-weight: bold; color: ${mutedTextColorDoc}; text-transform: uppercase; font-size: 9pt; ${templateStyle === 'modern' ? 'border-bottom-width:2px; border-bottom-color:'+primaryColorDoc+';' : ''}}
          .items-table-doc .description-col { width: 40%; }
          .items-table-doc .qty-col { width: 10%; text-align: right;}
          .items-table-doc .unit-col { width: 10%; text-align: right;}
          .items-table-doc .rate-col { width: 15%; text-align: right; }
          .items-table-doc .discount-col { width: 10%; text-align: right; }
          .items-table-doc .amount-col { width: 15%; text-align: right; }


          .totals-summary-table { width: ${templateStyle === 'modern' ? '50%' : '45%'}; margin-left: auto; margin-bottom: 25px; font-size: 10pt; }
          .totals-summary-table td { padding: 8px; }
          .grand-total-line { font-weight: bold; font-size: 14pt; color: ${primaryColorDoc}; background-color: ${primaryColorDoc}1A; padding: 10px 12px; border-radius: 4px; }
          .grand-total-line td:first-child { color: ${primaryColorDoc}; }
          .grand-total-line td:last-child { color: ${primaryColorDoc}; }

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
            ${selectedHeaderHtml}

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

            ${(invoiceNotes || termsAndConditions) ? notesAndTermsHtml : ''}

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
      toast({ variant: "destructive", title: "PDF Error", description: "Capture element has no dimensions." });
      console.error("PDF Capture element has no dimensions:", elementToCapture.offsetWidth, "x", elementToCapture.offsetHeight);
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
  elementToCapture.style.left = '0px'; // Ensure it's fully in view if offscreen rendering causes issues
  elementToCapture.style.top = '0px';
  elementToCapture.style.zIndex = '10000'; // High z-index to ensure it's on top for capture

  const isDarkTheme = document.documentElement.classList.contains('dark');
  let themeColorClass = `theme-${data.themeColor || 'default'}`;
  let fontThemeClass = `font-theme-${data.fontTheme || 'default'}`;
  // templateStyle is handled by conditional rendering in InvoiceTemplate component directly

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


  await new Promise(resolve => setTimeout(resolve, 300)); // Brief delay for rendering

  try {
    const canvas = await html2canvas(elementToCapture, {
      scale: 2, // Higher scale for better quality
      useCORS: true,
      logging: true,
      backgroundColor: null, // Use element's background
      scrollX: -window.scrollX, // Capture from top-left of element
      scrollY: -window.scrollY,
      windowWidth: elementToCapture.scrollWidth, // Ensure full width of element is considered
      windowHeight: elementToCapture.scrollHeight, // Ensure full height
      removeContainer: true, // Clean up temporary container
    });

    // Restore original styles
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

    // Ensure styles are restored even on error
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
      toast({ variant: "destructive", title: "JPEG Error", description: "Capture element has no dimensions." });
      console.error("JPEG Capture element has no dimensions:", elementToCapture.offsetWidth, "x", elementToCapture.offsetHeight);
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
    const canvas = await html2canvas(elementToCapture, {
        scale: 1.5, // Good balance for JPEGs
        useCORS: true,
        logging: true,
        backgroundColor: docInvoiceBg, // Ensure background is applied
        scrollX: -window.scrollX,
        scrollY: -window.scrollY,
        windowWidth: elementToCapture.scrollWidth,
        windowHeight: elementToCapture.scrollHeight,
        removeContainer: true,
    });

    // Restore original styles
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

    const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.9); // Quality 0.9
    simulateDownload(`invoice_${data.invoiceNumber}.jpeg`, jpegDataUrl, 'image/jpeg', true);
  } catch (error) {
    console.error("Error generating JPEG with html2canvas:", error);
    toast({ variant: "destructive", title: "JPEG Generation Error", description: "Could not generate JPEG. Check console." });

    // Ensure styles are restored even on error
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
