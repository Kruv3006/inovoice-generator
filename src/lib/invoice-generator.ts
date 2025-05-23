import type { StoredInvoiceData } from './invoice-types';
import { format, parseISO } from 'date-fns';
import html2canvas from 'html2canvas'; // Direct import
import jsPDF from 'jspdf'; // Direct import

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
    companyName, customerName, invoiceNumber, invoiceDate, dueDate,
    startDate, startTime, endDate, endTime, duration, totalFee, invoiceNotes,
    companyAddress, clientAddress
  } = data;

  // Ensure dates are Date objects before formatting
  const parsedInvoiceDate = invoiceDate ? (parseISO(invoiceDate) instanceof Date && !isNaN(parseISO(invoiceDate).valueOf()) ? parseISO(invoiceDate) : new Date()) : new Date();
  const parsedDueDate = dueDate ? (parseISO(dueDate) instanceof Date && !isNaN(parseISO(dueDate).valueOf()) ? parseISO(dueDate) : new Date()) : new Date();
  const parsedServiceStartDate = startDate instanceof Date ? startDate : (startDate ? parseISO(startDate as unknown as string) : new Date());
  const parsedServiceEndDate = endDate instanceof Date ? endDate : (endDate ? parseISO(endDate as unknown as string) : new Date());


  const formatAddressHtml = (address: string | undefined) => address?.split(',').map(part => part.trim()).join('<br/>') || 'N/A';
  const fCurrency = (val?: number) => val != null ? `$${val.toFixed(2)}` : '$0.00';

  // Basic watermark attempt for DOC - difficult to achieve true background watermark with HTML->DOC
  const watermarkHtml = watermarkDataUrl 
    ? `<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.1; pointer-events: none; z-index: -1;">
         <img src="${watermarkDataUrl}" style="max-width: 300px; max-height: 300px; object-fit: contain;" alt="Watermark"/>
       </div>`
    : '';

  return `
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Invoice ${invoiceNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; font-size: 10pt; }
          .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, .15); position: relative; }
          .header { display: table; width: 100%; margin-bottom: 20px; }
          .header-left { display: table-cell; vertical-align: top; }
          .header-right { display: table-cell; vertical-align: top; text-align: right; }
          .company-name { font-size: 24px; font-weight: bold; color: #337ab7; margin-bottom: 0; }
          .company-address { font-size: 9pt; color: #555; line-height: 1.4; }
          .invoice-title { font-size: 28px; font-weight: bold; margin-bottom: 0px; }
          .info { display: table; width: 100%; margin-bottom: 30px; }
          .info-left, .info-right { display: table-cell; vertical-align: top; width: 50%; }
          .info-right { text-align: right; }
          .info div { margin-bottom: 3px; }
          .items-table { width: 100%; line-height: inherit; text-align: left; border-collapse: collapse; margin-bottom: 30px; }
          .items-table th, .items-table td { padding: 8px; border: 1px solid #ddd; }
          .items-table th { background-color: #f9f9f9; font-weight: bold; }
          .items-table .description { width: 60%; }
          .items-table .quantity, .items-table .price { text-align: right; }
          .totals { text-align: right; margin-top: 20px; margin-bottom: 30px; }
          .totals div { margin-bottom: 5px; font-size: 11pt; }
          .totals .grand-total { font-weight: bold; font-size: 14pt; color: #337ab7; }
          .notes { margin-top: 30px; padding-top:15px; border-top: 1px solid #eee; font-size: 9pt; color: #777; }
          .footer { text-align: center; font-size: 8pt; color: #aaa; margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          ${watermarkHtml}
          <div class="header">
            <div class="header-left">
              <div class="company-name">${companyName || 'Your Company LLC'}</div>
              <div class="company-address">${formatAddressHtml(companyAddress)}</div>
            </div>
            <div class="header-right">
              <div class="invoice-title">INVOICE</div>
              <div>Invoice #: ${invoiceNumber}</div>
              <div>Date: ${format(parsedInvoiceDate, "MMMM d, yyyy")}</div>
              <div>Due Date: ${format(parsedDueDate, "MMMM d, yyyy")}</div>
            </div>
          </div>

          <div class="info">
            <div class="info-left">
              <strong>Bill To:</strong><br/>
              ${customerName}<br/>
              <div class="company-address">${formatAddressHtml(clientAddress)}</div>
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th class="description">Description</th>
                <th class="quantity">Duration</th>
                <th class="price">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="description">
                  Service Rendered<br/>
                  <small style="font-size:8pt; color:#777;">
                    From ${format(parsedServiceStartDate, "MMM d, yyyy")} ${startTime} 
                    to ${format(parsedServiceEndDate, "MMM d, yyyy")} ${endTime}
                  </small>
                </td>
                <td class="quantity">${duration ? `${duration.days}d ${duration.hours}h` : "N/A"}</td>
                <td class="price">${fCurrency(totalFee)}</td>
              </tr>
            </tbody>
          </table>

          <div class="totals">
            <div>Subtotal: ${fCurrency(totalFee)}</div>
            <div class="grand-total">TOTAL: ${fCurrency(totalFee)}</div>
          </div>

          ${invoiceNotes ? `<div class="notes"><strong>Notes:</strong><br/>${invoiceNotes.replace(/\n/g, '<br/>')}</div>` : ''}
          
          <div class="footer">
            <p>If you have any questions concerning this invoice, please contact ${companyName || "us"}.</p>
            <p>&copy; ${new Date().getFullYear()} ${companyName || 'Your Company'}. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
};


export const generatePdf = async (data: StoredInvoiceData, _watermarkDataUrl?: string, elementToCapture?: HTMLElement | null): Promise<void> => {
  console.log("Generating PDF for:", data.invoiceNumber);
  if (!elementToCapture) {
    alert("PDF generation failed: template element not found.");
    throw new Error("Template element not provided for PDF generation.");
  }
  
  try {
    const canvas = await html2canvas(elementToCapture, {
      scale: 2, 
      useCORS: true,
      logging: true, // Enable logging
      backgroundColor: null, 
      scrollX: 0, // Ensure capture starts from the top-left
      scrollY: 0,
      windowWidth: elementToCapture.scrollWidth,
      windowHeight: elementToCapture.scrollHeight,
    });
    const imgData = canvas.toDataURL('image/png');
    
    const pdfWidth = canvas.width;
    const pdfHeight = canvas.height;
    
    const pdf = new jsPDF({
      orientation: pdfWidth > pdfHeight ? 'l' : 'p',
      unit: 'px',
      format: [pdfWidth, pdfHeight]
    });
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`invoice_${data.invoiceNumber}.pdf`);
  } catch (error) {
    console.error("Error generating PDF with html2canvas:", error);
    alert("Failed to generate PDF. Check console for details.");
    throw error;
  }
};

export const generateDoc = async (data: StoredInvoiceData, watermarkDataUrl?: string): Promise<void> => {
  console.log("Generating DOC for:", data.invoiceNumber);
  const htmlContent = getInvoiceHtmlForDoc(data, watermarkDataUrl);
  // The Mime type for .doc files from HTML is often better as application/vnd.ms-word
  // or just application/msword. The outer XML structure is specific for older Word versions.
  const content = `
    <!DOCTYPE html>
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:w="urn:schemas-microsoft-com:office:word"
    xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"><title>Invoice ${data.invoiceNumber}</title>
    </head>
    <body>${htmlContent}</body></html>`;
  
  simulateDownload(`invoice_${data.invoiceNumber}.doc`, content, 'application/msword');
};

export const generateJpeg = async (data: StoredInvoiceData, _watermarkDataUrl?: string, elementToCapture?: HTMLElement | null): Promise<void> => {
  console.log("Generating JPEG for:", data.invoiceNumber);
  if (!elementToCapture) {
    alert("JPEG generation failed: template element not found.");
    throw new Error("Template element not provided for JPEG generation.");
  }

  try {
    const canvas = await html2canvas(elementToCapture, {
        scale: 1.5, 
        useCORS: true,
        logging: true, // Enable logging
        backgroundColor: '#ffffff', 
        scrollX: 0,
        scrollY: 0,
        windowWidth: elementToCapture.scrollWidth,
        windowHeight: elementToCapture.scrollHeight,
    });
    const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.9); 
    simulateDownload(`invoice_${data.invoiceNumber}.jpeg`, jpegDataUrl, 'image/jpeg', true);
  } catch (error) {
    console.error("Error generating JPEG with html2canvas:", error);
    alert("Failed to generate JPEG. Check console for details.");
    throw error;
  }
};
