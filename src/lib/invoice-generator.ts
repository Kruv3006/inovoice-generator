
import type { StoredInvoiceData } from './invoice-types';
import { format, parseISO } from 'date-fns';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from '@/hooks/use-toast'; 

// Helper function to simulate file download
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

// Function to get HTML content of the invoice for DOC generation
const getInvoiceHtmlForDoc = (data: StoredInvoiceData, watermarkDataUrl?: string): string => {
  const {
    companyName, customerName, invoiceNumber, invoiceDate,
    startDate, startTime, endDate, endTime, duration, totalFee, invoiceNotes,
    companyLogoDataUrl,
  } = data;

  const parsedInvoiceDate = invoiceDate ? (parseISO(invoiceDate) instanceof Date && !isNaN(parseISO(invoiceDate).valueOf()) ? parseISO(invoiceDate) : new Date()) : new Date();
  const parsedServiceStartDate = startDate instanceof Date ? startDate : (startDate ? parseISO(startDate as unknown as string) : new Date());
  const parsedServiceEndDate = endDate instanceof Date ? endDate : (endDate ? parseISO(endDate as unknown as string) : new Date());

  const fCurrency = (val?: number) => val != null ? `₹${val.toFixed(2)}` : '₹0.00';

  const companyLogoHtml = companyLogoDataUrl
    ? `<img src="${companyLogoDataUrl}" style="max-height: 70px; max-width: 180px; margin-bottom: 10px; object-fit: contain;" alt="Company Logo"/>`
    : '';
  
  const watermarkHtml = watermarkDataUrl 
    ? `<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.03; pointer-events: none; z-index: -1; display:flex; align-items:center; justify-content:center; width:100%; height:100%;">
         <img src="${watermarkDataUrl}" style="max-width: 70%; max-height: 70%; object-fit: contain;" alt="Watermark"/>
       </div>`
    : '';

  // Define some basic styles for DOC output to mimic the theme
  const primaryColor = '#2563eb'; // blue-600
  const textColor = '#1f2937'; // gray-800
  const mutedTextColor = '#6b7280'; // gray-500
  const borderColor = '#e5e7eb'; // gray-200
  const headerBgColor = '#f3f4f6'; // gray-100
  const invoiceBgColor = '#ffffff';


  return `
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Invoice ${invoiceNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; color: ${textColor}; font-size: 10pt; background-color: #f9fafb; }
          .invoice-container { max-width: 800px; margin: 20px auto; padding: 30px; border: 1px solid ${borderColor}; background-color: ${invoiceBgColor}; position: relative; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); }
          .watermark-bg { position: absolute; top:0; left:0; width:100%; height:100%; overflow:hidden; z-index:0; }
          .content-wrapper { position:relative; z-index:1; }
          
          .header-section { display: table; width: 100%; margin-bottom: 25px; padding-bottom:15px; border-bottom: 1px solid ${borderColor}; }
          .header-left { display: table-cell; vertical-align: middle; }
          .header-right { display: table-cell; vertical-align: middle; text-align: right; }
          .company-logo-doc { margin-bottom: 5px; }
          .company-name-doc { font-size: 20px; font-weight: bold; color: ${primaryColor}; margin-bottom: 2px; }
          .invoice-title-doc { font-size: 24px; font-weight: bold; margin-bottom: 0px; color: ${mutedTextColor}; text-transform: uppercase; }
          .invoice-details-doc div { margin-bottom: 2px; font-size: 9.5pt; color: ${mutedTextColor}; }
          .invoice-details-doc strong { color: ${textColor}; }

          .client-info-section { display: table; width: 100%; margin-bottom: 25px; }
          .client-info-left, .client-info-right { display: table-cell; vertical-align: top; width: 50%; font-size: 9.5pt; }
          .client-info-right { text-align: right; }
          .client-info-section h3 { font-size: 9pt; font-weight: bold; color: ${mutedTextColor}; text-transform: uppercase; margin-bottom: 4px; margin-top:0; }
          .client-info-section p { margin: 0 0 3px 0; color: ${textColor}; }
          .client-info-section p strong { font-weight: 600; }
          
          .items-table-doc { width: 100%; text-align: left; border-collapse: collapse; margin-bottom: 25px; font-size: 9.5pt; }
          .items-table-doc th, .items-table-doc td { padding: 10px; border: 1px solid ${borderColor}; }
          .items-table-doc th { background-color: ${headerBgColor}; font-weight: bold; color: ${mutedTextColor}; text-transform: uppercase; font-size: 9pt;}
          .items-table-doc .description-col { width: 60%; }
          .items-table-doc .duration-col, .items-table-doc .amount-col { text-align: right; }
          .items-table-doc .item-description-detail { font-size: 8pt; color: ${mutedTextColor}; }
          
          .totals-section { text-align: right; margin-top: 20px; margin-bottom: 25px; font-size: 10pt; }
          .totals-section div { margin-bottom: 6px; }
          .totals-section strong {color: ${textColor};}
          .totals-section .subtotal-line { padding-bottom: 5px; border-bottom: 1px dashed ${borderColor}; }
          .totals-section .grand-total-line { font-weight: bold; font-size: 14pt; color: ${primaryColor}; background-color: rgba(37, 99, 235, 0.05); padding: 8px; margin-top:8px; border-radius: 4px;}
          
          .notes-section { margin-top: 25px; padding-top:15px; border-top: 1px solid ${borderColor}; font-size: 9pt; color: ${mutedTextColor}; }
          .notes-section h4 { font-size: 9pt; font-weight: bold; color: ${mutedTextColor}; text-transform: uppercase; margin-bottom: 4px; margin-top:0; }
          
          .footer-section { text-align: center; font-size: 8pt; color: #9ca3af; margin-top: 30px; padding-top: 15px; border-top: 1px solid ${borderColor}; }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          ${watermarkHtml ? `<div class="watermark-bg">${watermarkHtml}</div>` : ''}
          <div class="content-wrapper">
            <div class="header-section">
              <div class="header-left">
                ${companyLogoHtml ? `<div class="company-logo-doc">${companyLogoHtml}</div>` : ''}
                <div class="company-name-doc">${companyName || 'Your Company'}</div>
              </div>
              <div class="header-right invoice-details-doc">
                <div class="invoice-title-doc">INVOICE</div>
                <div><strong>Invoice No:</strong> ${invoiceNumber}</div>
                <div><strong>Date:</strong> ${format(parsedInvoiceDate, "MMMM d, yyyy")}</div>
              </div>
            </div>

            <div class="client-info-section">
              <div class="client-info-left">
                <h3>Bill To</h3>
                <p>${customerName}</p>
              </div>
              <div class="client-info-right">
                <h3>Service Details</h3>
                <p><strong>Start:</strong> ${format(parsedServiceStartDate, "MMM d, yyyy")} ${startTime}</p>
                <p><strong>End:</strong> ${format(parsedServiceEndDate, "MMM d, yyyy")} ${endTime}</p>
              </div>
            </div>

            <table class="items-table-doc">
              <thead>
                <tr>
                  <th class="description-col">Description</th>
                  <th class="duration-col">Duration</th>
                  <th class="amount-col">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="description-col">
                    Service Rendered<br/>
                    <span class="item-description-detail">Consultation / Project Work as per agreement.</span>
                  </td>
                  <td class="duration-col">${duration ? `${duration.days}d ${duration.hours}h` : "N/A"}</td>
                  <td class="amount-col">${fCurrency(totalFee)}</td>
                </tr>
              </tbody>
            </table>

            <div class="totals-section">
              <div class="subtotal-line"><strong>Subtotal:</strong> ${fCurrency(totalFee)}</div>
              <div class="grand-total-line">TOTAL: ${fCurrency(totalFee)}</div>
            </div>

            ${invoiceNotes ? `<div class="notes-section"><h4>Notes & Terms</h4><p>${invoiceNotes.replace(/\n/g, '<br/>')}</p></div>` : ''}
            
            <div class="footer-section">
              <p>Thank you for your business!</p>
              <p>If you have any questions concerning this invoice, please contact ${companyName || "us"}.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
};


export const generatePdf = async (data: StoredInvoiceData, _watermarkDataUrl?: string, elementToCapture?: HTMLElement | null): Promise<void> => {
  console.log("Generating PDF for:", data.invoiceNumber, "with watermark:", _watermarkDataUrl ? "Yes" : "No");
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
  
  // Ensure styles are applied, especially for off-screen elements
  elementToCapture.style.opacity = '1';
  elementToCapture.style.position = 'fixed'; // Or 'absolute'
  elementToCapture.style.left = '0px'; // Or '-9999px' if that was working
  elementToCapture.style.top = '0px';
  elementToCapture.style.zIndex = '10000'; // Ensure it's on top if needed for capture
  elementToCapture.style.backgroundColor = 'var(--invoice-background, white)'; // Explicit background


  await new Promise(resolve => setTimeout(resolve, 300)); // Increased delay slightly

  try {
    const canvas = await html2canvas(elementToCapture, {
      scale: 2, 
      useCORS: true,
      logging: true,
      backgroundColor: null, // Let the element's background shine through
      scrollX: -window.scrollX, 
      scrollY: -window.scrollY,
      windowWidth: elementToCapture.scrollWidth,
      windowHeight: elementToCapture.scrollHeight,
      removeContainer: true, // Clean up the cloned container
    });

    // Revert styles after capture
    elementToCapture.style.opacity = '1'; // As it was for download page logic
    elementToCapture.style.position = 'fixed';
    elementToCapture.style.left = '-9999px';
    // elementToCapture.style.zIndex = '1'; // Reset z-index

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
    throw error;
  }
};

export const generateDoc = async (data: StoredInvoiceData, watermarkDataUrl?: string): Promise<void> => {
  console.log("Generating DOC for:", data.invoiceNumber);
  const htmlContent = getInvoiceHtmlForDoc(data, watermarkDataUrl); 
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

export const generateJpeg = async (data: StoredInvoiceData, _watermarkDataUrl?: string, elementToCapture?: HTMLElement | null): Promise<void> => {
  console.log("Generating JPEG for:", data.invoiceNumber, "with watermark:", _watermarkDataUrl ? "Yes" : "No");
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
  
  // Ensure styles are applied
  elementToCapture.style.opacity = '1';
  elementToCapture.style.position = 'fixed';
  elementToCapture.style.left = '0px';
  elementToCapture.style.top = '0px';
  elementToCapture.style.zIndex = '10000';
  elementToCapture.style.backgroundColor = 'var(--invoice-background, white)';


  await new Promise(resolve => setTimeout(resolve, 300)); // Increased delay

  try {
    const canvas = await html2canvas(elementToCapture, {
        scale: 1.5, 
        useCORS: true,
        logging: true,
        backgroundColor: '#ffffff', // Explicit white background for JPEG
        scrollX: -window.scrollX,
        scrollY: -window.scrollY,
        windowWidth: elementToCapture.scrollWidth,
        windowHeight: elementToCapture.scrollHeight,
        removeContainer: true,
    });

    // Revert styles after capture
    elementToCapture.style.opacity = '1';
    elementToCapture.style.position = 'fixed';
    elementToCapture.style.left = '-9999px';
    // elementToCapture.style.zIndex = '1';


    if (canvas.width === 0 || canvas.height === 0) {
        console.error("html2canvas returned an empty canvas for JPEG.");
        toast({ variant: "destructive", title: "JPEG Error", description: "Canvas capture failed (empty canvas)." });
        throw new Error("Canvas capture failed for JPEG (empty canvas)");
    }

    const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.9); 
    simulateDownload(`invoice_${data.invoiceNumber}.jpeg`, jpegDataUrl, 'image/jpeg', true);
  } catch (error) {
    console.error("Error generating JPEG with html2canvas:", error);
    toast({ variant: "destructive", title: "JPEG Generation Error", description: "Could not generate JPEG. Check console." });
    throw error;
  }
};
