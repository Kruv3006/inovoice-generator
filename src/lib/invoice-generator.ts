
import type { StoredInvoiceData } from './invoice-types';
import { format, parseISO } from 'date-fns';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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

  const parsedInvoiceDate = invoiceDate ? parseISO(invoiceDate) : new Date();
  const parsedDueDate = dueDate ? parseISO(dueDate) : new Date();
  // Ensure startDate and endDate are Date objects before formatting
  const parsedServiceStartDate = startDate instanceof Date ? startDate : (startDate ? parseISO(startDate as unknown as string) : new Date());
  const parsedServiceEndDate = endDate instanceof Date ? endDate : (endDate ? parseISO(endDate as unknown as string) : new Date());


  const formatAddressHtml = (address: string | undefined) => address?.split(',').map(part => part.trim()).join('<br/>') || 'N/A';
  const fCurrency = (val?: number) => val != null ? val.toFixed(2) : '0.00';

  // Watermark style for DOC (very basic, might not render perfectly in all Word versions)
  // A true background image watermark is hard with pure HTML to DOC.
  const watermarkStyle = watermarkDataUrl 
    ? `background-image: url(${watermarkDataUrl}); background-repeat: no-repeat; background-position: center; background-size: contain; opacity: 0.1;` 
    : '';

  return `
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Invoice ${invoiceNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #333333; font-size: 10pt; }
          .invoice-container { border: 1px solid #cccccc; padding: 20px; ${watermarkStyle} }
          .header-section { display: table; width: 100%; margin-bottom: 30px; }
          .company-details, .invoice-meta { display: table-cell; vertical-align: top; }
          .company-details { width: 60%; }
          .invoice-meta { width: 40%; text-align: right; }
          .company-name { font-size: 18pt; font-weight: bold; color: #0056b3; margin-bottom: 5px; }
          .address { font-size: 9pt; line-height: 1.4; color: #555555; }
          .invoice-title { font-size: 22pt; font-weight: bold; margin-bottom: 5px; color: #333333; }
          .meta-item { margin-bottom: 3px; font-size: 10pt; }
          .meta-item strong { color: #000000; }
          .billing-section { display: table; width: 100%; margin-bottom: 30px; }
          .bill-to { display: table-cell; width: 50%; }
          .bill-to strong { font-size: 11pt; color: #000000; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 10pt; }
          .items-table th, .items-table td { border: 1px solid #dddddd; padding: 10px; text-align: left; }
          .items-table th { background-color: #f0f0f0; font-weight: bold; color: #000000; }
          .items-table td.amount, .items-table th.amount { text-align: right; }
          .totals-section { text-align: right; margin-bottom: 30px; }
          .totals-section div { margin-bottom: 5px; font-size: 11pt; }
          .totals-section .grand-total { font-weight: bold; font-size: 14pt; color: #0056b3; }
          .notes-section { margin-bottom: 30px; border-top: 1px solid #cccccc; padding-top: 15px; font-size: 9pt; color: #555555; }
          .notes-section strong { color: #000000; }
          .footer-section { text-align: center; font-size: 8pt; color: #888888; border-top: 1px solid #cccccc; padding-top: 15px; margin-top:30px; }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header-section">
            <div class="company-details">
              <div class="company-name">${companyName || 'Your Company LLC'}</div>
              <div class="address">${formatAddressHtml(companyAddress)}</div>
            </div>
            <div class="invoice-meta">
              <div class="invoice-title">INVOICE</div>
              <div class="meta-item"><strong>Invoice #:</strong> ${invoiceNumber}</div>
              <div class="meta-item"><strong>Date:</strong> ${format(parsedInvoiceDate, "MMMM d, yyyy")}</div>
              <div class="meta-item"><strong>Due Date:</strong> ${format(parsedDueDate, "MMMM d, yyyy")}</div>
            </div>
          </div>

          <div class="billing-section">
            <div class="bill-to">
              <strong>Bill To:</strong><br/>
              ${customerName}<br/>
              <div class="address">${formatAddressHtml(clientAddress)}</div>
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>Description</th>
                <th class="amount">Duration</th>
                <th class="amount">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  Service Rendered<br/>
                  <small style="font-size:8pt; color:#777777;">
                    From ${format(parsedServiceStartDate, "MMM d, yyyy")} ${startTime} 
                    to ${format(parsedServiceEndDate, "MMM d, yyyy")} ${endTime}
                  </small>
                </td>
                <td class="amount">${duration ? `${duration.days}d ${duration.hours}h` : "N/A"}</td>
                <td class="amount">$${fCurrency(totalFee)}</td>
              </tr>
            </tbody>
          </table>

          <div class="totals-section">
            <div>Subtotal: $${fCurrency(totalFee)}</div>
            <div class="grand-total">Total Due: $${fCurrency(totalFee)}</div>
          </div>

          ${invoiceNotes ? `
            <div class="notes-section">
              <strong>Notes:</strong>
              <p>${invoiceNotes.replace(/\n/g, '<br/>')}</p>
            </div>
          ` : ''}

          <div class="footer-section">
            <p>If you have any questions concerning this invoice, please contact ${companyName || "us"}.</p>
            <p>&copy; ${new Date().getFullYear()} ${companyName || 'Your Company'}. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
};


export const generatePdf = async (data: StoredInvoiceData, watermarkDataUrl?: string, elementToCapture?: HTMLElement | null): Promise<void> => {
  console.log("Generating PDF for:", data.invoiceNumber);
  if (!elementToCapture) {
    alert("PDF generation failed: template element not found.");
    throw new Error("Template element not provided for PDF generation.");
  }
  
  try {
    const canvas = await html2canvas(elementToCapture, {
      scale: 2, 
      useCORS: true,
      logging: false,
      backgroundColor: null, // Allow transparent background if any part of template is transparent
      onclone: (document) => {
        // If there are specific styles that are only applied for screen, you might need to adjust them here.
        // For example, ensure the hidden div is temporarily made visible for capture if opacity was an issue.
      }
    });
    const imgData = canvas.toDataURL('image/png');
    
    // Calculate PDF dimensions to maintain aspect ratio
    const pdfWidth = canvas.width;
    const pdfHeight = canvas.height;
    
    const pdf = new jsPDF({
      orientation: pdfWidth > pdfHeight ? 'l' : 'p', // landscape or portrait
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
  const content = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:w="urn:schemas-microsoft-com:office:word"
    xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"><title>Invoice ${data.invoiceNumber}</title></head>
    <body>${htmlContent}</body></html>`;
  
  simulateDownload(`invoice_${data.invoiceNumber}.doc`, content, 'application/msword');
};

export const generateJpeg = async (data: StoredInvoiceData, watermarkDataUrl?: string, elementToCapture?: HTMLElement | null): Promise<void> => {
  console.log("Generating JPEG for:", data.invoiceNumber);
  if (!elementToCapture) {
    alert("JPEG generation failed: template element not found.");
    throw new Error("Template element not provided for JPEG generation.");
  }

  try {
    const canvas = await html2canvas(elementToCapture, {
        scale: 1.5, // Good quality for JPEG
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff', // JPEGs don't support transparency, set a white background
    });
    const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.9); // 0.9 quality
    simulateDownload(`invoice_${data.invoiceNumber}.jpeg`, jpegDataUrl, 'image/jpeg', true);
  } catch (error) {
    console.error("Error generating JPEG with html2canvas:", error);
    alert("Failed to generate JPEG. Check console for details.");
    throw error;
  }
};
