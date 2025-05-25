
import type { StoredInvoiceData, AvailableCurrency } from './invoice-types';
import { format, parseISO, isValid } from 'date-fns';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from '@/hooks/use-toast';
import { getCompanyProfile } from '@/lib/settings-store'; 
import { availableCurrencies } from './invoice-types';

const formatCurrencyForDoc = (amount?: number, currency?: AvailableCurrency) => {
  const currentCurrency = currency || availableCurrencies[0];
  if (typeof amount !== 'number') return `${currentCurrency.symbol}0.00`;
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
    companyLogoDataUrl, watermarkDataUrl, watermarkOpacity, currency,
    themeColor = 'default', fontTheme = 'default', templateStyle = 'classic',
    customerAddress, customerEmail, customerPhone,
  } = data;

  const currentCurrency = currency || availableCurrencies[0];
  const displayWatermarkOpacity = typeof watermarkOpacity === 'number' ? watermarkOpacity : 0.05;
  const invoiceBgColorDoc = 'hsl(0 0% 100%)'; 
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
  const companyProfileSettings = getCompanyProfile(); 
  const showClientAddressOnInvoice = companyProfileSettings?.showClientAddressOnInvoice !== false;


  const companyLogoHtml = companyLogoDataUrl
    ? `<img src="${companyLogoDataUrl}" style="max-height: ${templateStyle === 'modern' || templateStyle === 'compact' || templateStyle === 'minimalist' ? '60px' : '70px'}; max-width: ${templateStyle === 'modern' || templateStyle === 'compact' || templateStyle === 'minimalist' ? '160px' : '180px'}; object-fit: contain;" alt="Company Logo"/>`
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
                  if (durationParts.length > 0) displayDurationStringDoc = `<div style="font-size: ${templateStyle === 'minimalist' ? '7.5pt' : '8pt'}; color: ${mutedTextColorDoc}; margin-top: 3px;">(Duration: ${durationParts.join(', ')})</div>`;
              }
          } catch (e) { /* ignore */ }
      } else if (item.itemStartDate && item.itemEndDate && isValid(parseISO(item.itemStartDate)) && isValid(parseISO(item.itemEndDate))) {
          displayDurationStringDoc = `<div style="font-size: ${templateStyle === 'minimalist' ? '7.5pt' : '8pt'}; color: ${mutedTextColorDoc}; margin-top: 3px;">(${format(parseISO(item.itemStartDate), "MMM d, yyyy")} - ${format(parseISO(item.itemEndDate), "MMM d, yyyy")})</div>`;
      }

      const itemQuantity = Number(item.quantity) || 0;
      const itemRate = Number(item.rate) || 0;
      const itemDiscount = Number(item.discount) || 0;
      const itemSubtotal = itemQuantity * itemRate;
      const discountedAmount = itemSubtotal * (1 - itemDiscount / 100);

      const itemTdStyle = `padding: ${templateStyle === 'minimalist' ? '8px 0' : '10px'}; border: ${templateStyle === 'minimalist' ? '0' : '1px solid ' + borderColorDoc}; ${templateStyle === 'minimalist' ? 'border-bottom: 1px dashed ' + borderColorDoc : (templateStyle === 'classic' ? 'border-bottom: 1px solid ' + borderColorDoc : '')}; vertical-align: top;`;

      itemsHtml += `
        <tr style="background-color: ${invoiceBgColorDoc};">
          <td style="${itemTdStyle} color: ${textColorDoc}; text-align:left;">${item.description}${displayDurationStringDoc}</td>
          <td style="${itemTdStyle} text-align: right; color: ${mutedTextColorDoc};">${itemQuantity}</td>
          <td style="${itemTdStyle} text-align: right; color: ${mutedTextColorDoc};">${item.unit || '-'}</td>
          <td style="${itemTdStyle} text-align: right; color: ${mutedTextColorDoc};">${fCurrency(itemRate)}</td>
          <td style="${itemTdStyle} text-align: right; color: ${mutedTextColorDoc};">${itemDiscount > 0 ? `${itemDiscount}%` : '-'}</td>
          <td style="${itemTdStyle} text-align: right; color: ${textColorDoc};">${fCurrency(discountedAmount)}</td>
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
    const discountTdStyle = `padding: ${templateStyle === 'minimalist' ? '4px 0' : '8px'}; text-align: right; font-weight: normal; color: ${mutedTextColorDoc}; ${templateStyle === 'minimalist' ? 'border-bottom: 1px dashed '+borderColorDoc : (templateStyle === 'classic' ? 'border-top: 1px solid '+borderColorDoc : '')};`;
    globalDiscountHtml = `
      <tr>
        <td colspan="5" style="${discountTdStyle}">
          ${discountLabel}:
        </td>
        <td style="${discountTdStyle}">
          - ${fCurrency(discountAmountDisplay)}
        </td>
      </tr>
    `;
  }

  const clientDetailsHtml = `
    <p style="margin: 0; color: ${textColorDoc}; font-weight: ${templateStyle === 'minimalist' ? '600' : 'bold'}; font-size: ${templateStyle === 'minimalist' ? '10pt' : (templateStyle === 'compact' ? '8pt' : '11pt')};">${customerName || 'Client Name'}</p>
    ${(showClientAddressOnInvoice && customerAddress) ? `<p style="margin: 2px 0; white-space: pre-line; color: ${mutedTextColorDoc}; font-size: ${templateStyle === 'minimalist' ? '8pt' : (templateStyle === 'compact' ? '7pt' : '9pt')};">${customerAddress.replace(/\n/g, '<br/>')}</p>` : ''}
    ${customerEmail ? `<p style="margin: 2px 0; color: ${mutedTextColorDoc}; font-size: ${templateStyle === 'minimalist' ? '8pt' : (templateStyle === 'compact' ? '7pt' : '9pt')};">Email: ${customerEmail}</p>` : ''}
    ${customerPhone ? `<p style="margin: 2px 0; color: ${mutedTextColorDoc}; font-size: ${templateStyle === 'minimalist' ? '8pt' : (templateStyle === 'compact' ? '7pt' : '9pt')};">Phone: ${customerPhone}</p>` : ''}
  `;

  // --- START TEMPLATE-SPECIFIC HEADERS ---
  let selectedHeaderHtml = '';

  if (templateStyle === 'classic') {
    selectedHeaderHtml = `
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
  } else if (templateStyle === 'modern') {
    selectedHeaderHtml = `
      <div style="padding-bottom:15px; margin-bottom: 25px; border-bottom: 2px solid ${primaryColorDoc};">
          <div style="display:table; width:100%; vertical-align:top;">
              <div style="display:table-cell; width:60%; vertical-align:top;">
                  ${companyLogoHtml ? `<div style="margin-bottom: 5px; padding:5px; background-color:${headerBgColorDoc}; border-radius:4px; display:inline-block;">${companyLogoHtml}</div>` : ''}
                  <div style="font-size: 18px; font-weight: bold; color: ${primaryColorDoc}; margin-top: 5px;">${companyName || 'Your Company'}</div>
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
  } else if (templateStyle === 'compact') {
     selectedHeaderHtml = `
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
  } else if (templateStyle === 'minimalist') {
    selectedHeaderHtml = `
      <div style="padding-bottom:20px; margin-bottom:20px;">
          <table style="width:100%; border-collapse:collapse;">
              <tr>
                  <td style="width:60%; vertical-align:top;">
                      ${companyLogoHtml ? `<div>${companyLogoHtml}</div>` : `<div style="font-size:22px; font-weight:600; color:${primaryColorDoc};">${companyName || 'Your Company'}</div>`}
                      ${companyLogoHtml && companyName ? `<div style="font-size:18px; font-weight:600; color:${primaryColorDoc}; margin-top:5px;">${companyName}</div>` : ''}
                  </td>
                  <td style="width:40%; text-align:right; vertical-align:top;">
                      <div style="font-size:16px; font-weight:normal; color:${mutedTextColorDoc}; text-transform:uppercase; letter-spacing:1px;">INVOICE</div>
                      <div style="font-size:9pt; color:${mutedTextColorDoc}; margin-top:2px;">${invoiceNumber}</div>
                  </td>
              </tr>
          </table>
          <table style="width:100%; border-collapse:collapse; margin-top:25px;">
              <tr>
                  <td style="width:60%; vertical-align:top; font-size:8pt;">
                      <h3 style="font-size:8pt; font-weight:500; color:${mutedTextColorDoc}; text-transform:uppercase; margin-bottom:4px; margin-top:0; letter-spacing:0.5px;">Billed To</h3>
                      ${clientDetailsHtml}
                  </td>
                  <td style="width:40%; text-align:right; vertical-align:top; font-size:9pt;">
                      <p style="margin:0; color:${textColorDoc};"><strong style="font-weight:500;">Date:</strong> ${format(parsedInvoiceDate, "MMMM d, yyyy")}</p>
                      ${parsedDueDate ? `<p style="margin:2px 0 0 0; color:${textColorDoc};"><strong style="font-weight:500;">Due Date:</strong> ${format(parsedDueDate, "MMMM d, yyyy")}</p>` : ''}
                  </td>
              </tr>
          </table>
      </div>
    `;
  }
  // --- END TEMPLATE-SPECIFIC HEADERS ---
  

  let notesAndTermsLayout;
  const notesAndTermsBaseStyle = `font-size: ${templateStyle === 'compact' ? '7pt' : (templateStyle === 'minimalist' ? '8pt' : '9pt')}; color: ${mutedTextColorDoc};`;
  const notesAndTermsHeadingStyle = `font-size: ${templateStyle === 'compact' ? '7pt' : (templateStyle === 'minimalist' ? '8pt' : '9pt')}; font-weight: bold; color: ${mutedTextColorDoc}; text-transform: uppercase; margin-bottom: 4px; margin-top:0;`;
  const termsTextParaStyle = `white-space: pre-line; margin-top:0; font-size: ${templateStyle === 'compact' ? '6pt' : (templateStyle === 'minimalist' ? '6.5pt' : '7pt')}; color: ${mutedTextColorDoc}CC;`;

  if (invoiceNotes && termsAndConditions) {
    if (templateStyle === 'modern' || templateStyle === 'minimalist') {
      notesAndTermsLayout = `<table style="width:100%; margin-top:20px; ${notesAndTermsBaseStyle}"><tr>
        <td style="vertical-align:top; width:48%; padding-right:2%;"><h4 style="${notesAndTermsHeadingStyle}">Notes</h4><p style="white-space: pre-line; margin-top:0;">${invoiceNotes.replace(/\n/g, '<br/>')}</p></td>
        <td style="vertical-align:top; width:48%; padding-left:2%; ${templateStyle === 'modern' ? 'border-left: 1px solid '+borderColorDoc+';' : ''}"><h4 style="${notesAndTermsHeadingStyle}">Terms &amp; Conditions</h4><p style="${termsTextParaStyle}">${termsAndConditions.replace(/\n/g, '<br/>')}</p></td>
       </tr></table>`;
    } else { // Classic & Compact
        notesAndTermsLayout = `<div style="${notesAndTermsBaseStyle} margin-top:20px;">
            <h4 style="${notesAndTermsHeadingStyle}">Notes</h4>
            <p style="white-space: pre-line; margin-top:0; margin-bottom:10px;">${invoiceNotes.replace(/\n/g, '<br/>')}</p>
            <h4 style="${notesAndTermsHeadingStyle} margin-top:15px; padding-top:10px; border-top:1px solid ${borderColorDoc};">Terms &amp; Conditions</h4>
            <p style="${termsTextParaStyle}">${termsAndConditions.replace(/\n/g, '<br/>')}</p>
        </div>`;
    }
  } else if (invoiceNotes) {
    notesAndTermsLayout = `<div style="${notesAndTermsBaseStyle} margin-top:20px;"><h4 style="${notesAndTermsHeadingStyle}">Notes</h4><p style="white-space: pre-line; margin-top:0;">${invoiceNotes.replace(/\n/g, '<br/>')}</p></div>`;
  } else if (termsAndConditions) {
     notesAndTermsLayout = `<div style="${notesAndTermsBaseStyle} margin-top:20px;"><h4 style="${notesAndTermsHeadingStyle}">Terms &amp; Conditions</h4><p style="${termsTextParaStyle}">${termsAndConditions.replace(/\n/g, '<br/>')}</p></div>`;
  } else {
    notesAndTermsLayout = '';
  }


  const amountInWordsHtml = `
    <div style="margin-top:${templateStyle === 'minimalist' ? '20px' : '15px'}; padding-top:${templateStyle === 'minimalist' ? '0' : '10px'}; ${templateStyle !== 'minimalist' ? 'border-top: 1px solid '+borderColorDoc : ''}; font-size:${templateStyle === 'compact' ? '7pt' : (templateStyle === 'minimalist' ? '7.5pt' : '8pt')}; color:${mutedTextColorDoc}; font-style: italic;">
        <strong>Amount in Words:</strong> [Amount for ${currentCurrency.symbol}${(totalFee || 0).toFixed(2)} in words - Auto-generation pending]
    </div>
  `;

  const tableStyles = `
    width: 100%;
    text-align: left;
    border-collapse: ${templateStyle === 'classic' ? 'collapse' : 'separate'};
    border-spacing: 0;
    margin-bottom: 20px; 
    font-size: ${templateStyle === 'compact' ? '8pt' : (templateStyle === 'minimalist' ? '9pt' : '9.5pt')};
    ${(templateStyle === 'classic' || templateStyle === 'modern') ? 'border: 1px solid '+borderColorDoc+'; border-radius: 6px;' : ''}
    overflow: hidden;
  `;
  const thStyles = `
    padding: ${templateStyle === 'compact' ? '6px' : (templateStyle === 'minimalist' ? '8px 0' : '10px')};
    border-bottom: 1px solid ${borderColorDoc};
    ${templateStyle === 'minimalist' ? 'border-bottom-width: 2px; border-bottom-color:'+primaryColorDoc+';' : ''}
    background-color: ${templateStyle === 'minimalist' ? 'transparent' : headerBgColorDoc};
    font-weight: ${templateStyle === 'minimalist' ? '500' : 'bold'};
    color: ${mutedTextColorDoc};
    text-transform: ${templateStyle === 'minimalist' ? 'none' : 'uppercase'};
    font-size: ${templateStyle === 'compact' ? '7pt' : (templateStyle === 'minimalist' ? '8pt' : '9pt')};
    ${(templateStyle === 'modern' || templateStyle === 'compact') && templateStyle !== 'minimalist' ? `border-bottom-width:2px; border-bottom-color:${primaryColorDoc};` : ''}
    text-align: right; /* Default to right for most TH */
  `;
  const totalsTableStyles = `
    width: ${templateStyle === 'modern' || templateStyle === 'compact' ? '50%' : (templateStyle === 'minimalist' ? '60%' : '45%')};
    margin-left: auto;
    margin-bottom: 25px;
    font-size: ${templateStyle === 'compact' ? '9pt' : (templateStyle === 'minimalist' ? '10pt' : '10pt')};
  `;

  const totalsTdStyle = `padding: ${templateStyle === 'minimalist' ? '4px 0' : '8px'};`;
  const grandTotalStyle = `font-weight: bold; font-size: ${templateStyle === 'compact' ? '11pt' : (templateStyle === 'minimalist' ? '13pt' : '13pt')}; color: ${templateStyle === 'minimalist' ? primaryColorDoc : textColorDoc}; ${templateStyle === 'minimalist' ? 'border-top: 2px solid '+primaryColorDoc+'; padding-top: 8px;' : (templateStyle === 'classic' || templateStyle === 'modern' ? 'background-color: '+primaryColorDoc+'1A; color: '+primaryColorDoc+'; padding: '+(templateStyle === 'compact' ? '6px 8px' : '8px 10px')+'; border-radius: 4px;' : '')} `;


  return `
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Invoice ${invoiceNumber}</title>
        <style>
          body { font-family: ${fontFamilyDoc}; margin: 0; color: ${textColorDoc}; font-size: ${templateStyle === 'compact' ? '9pt' : (templateStyle === 'minimalist' ? '10pt' : '10pt')}; background-color: #FFFFFF; }
          .invoice-container-doc { max-width: 800px; margin: 20px auto; padding: ${templateStyle === 'compact' ? '20px' : (templateStyle === 'minimalist' ? '40px' : '30px')}; ${templateStyle !== 'minimalist' ? 'border: 1px solid '+borderColorDoc+';' : ''} background-color: ${invoiceBgColorDoc}; position: relative; }
          .watermark-wrapper-doc { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; }
          .watermark-img-doc { max-width: 70%; max-height: 60%; object-fit: contain; opacity: ${displayWatermarkOpacity}; ${templateStyle === 'modern' || templateStyle === 'compact' || templateStyle === 'minimalist' ? 'filter: grayscale(50%);' : ''} }
          .content-wrapper-doc { position:relative; z-index:1; }
          .items-table-doc { ${tableStyles} }
          .items-table-doc th { ${thStyles} }
          .totals-summary-table { ${totalsTableStyles} }
          .totals-summary-table td { ${totalsTdStyle} }
          .grand-total-line td { ${grandTotalStyle} }
          .footer-section-doc { text-align: center; font-size: ${templateStyle === 'compact' ? '7pt' : (templateStyle === 'minimalist' ? '8pt' : '8pt')}; color: #9ca3af; margin-top: 30px; padding-top: 15px; border-top: ${templateStyle === 'minimalist' ? 'none' : '1px solid ' + borderColorDoc}; }
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
                  <th style="text-align: left; width: ${templateStyle === 'minimalist' ? '45%' : '40%'}; ${thStyles}">Description</th>
                  <th style="${thStyles}">Qty/Dur.</th>
                  <th style="${thStyles}">Unit</th>
                  <th style="${thStyles}">Rate (${currentCurrency.symbol})</th>
                  <th style="${thStyles}">Disc (%)</th>
                  <th style="${thStyles}">Amount (${currentCurrency.symbol})</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>
            <table class="totals-summary-table">
                <tbody>
                    <tr>
                        <td colspan="5" style="text-align: right; font-weight: ${templateStyle === 'minimalist' ? '500' : 'normal'}; color: ${mutedTextColorDoc}; ${templateStyle !== 'minimalist' ? 'border-top: 1px solid '+borderColorDoc : ''}; ${totalsTdStyle}">SUBTOTAL:</td>
                        <td style="text-align: right; font-weight: ${templateStyle === 'minimalist' ? '500' : 'normal'}; color: ${textColorDoc}; ${templateStyle !== 'minimalist' ? 'border-top: 1px solid '+borderColorDoc : ''}; ${totalsTdStyle}">${fCurrency(subTotal)}</td>
                    </tr>
                    ${globalDiscountHtml}
                    <tr class="grand-total-line">
                         <td colspan="5" style="text-align: right;">TOTAL:</td>
                        <td style="text-align: right;">${fCurrency(totalFee)}</td>
                    </tr>
                </tbody>
            </table>
            ${amountInWordsHtml}
            ${notesAndTermsLayout}
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
      backgroundColor: elementToCapture.style.backgroundColor,
      display: elementToCapture.style.display,
  };
  
  elementToCapture.style.display = 'block';
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
      scale: 2, 
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
    elementToCapture.style.display = originalStyle.display;
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
      display: elementToCapture.style.display,
  };
  elementToCapture.style.display = 'block';
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
    elementToCapture.style.display = originalStyle.display;

    if (wasDark) {
      docElement.classList.add('dark');
    }
  }
};
