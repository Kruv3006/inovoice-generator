
import type { StoredInvoiceData } from './invoice-types';
import { format, parseISO } from 'date-fns';

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
const getInvoiceHtmlForDoc = (data: StoredInvoiceData): string => {
  const {
    companyName, customerName, invoiceNumber, invoiceDate, dueDate,
    startDate, startTime, endDate, endTime, duration, totalFee, invoiceNotes,
    companyAddress, clientAddress
  } = data;

  const parsedInvoiceDate = invoiceDate ? parseISO(invoiceDate) : new Date();
  const parsedDueDate = dueDate ? parseISO(dueDate) : new Date();
  const parsedServiceStartDate = startDate ? new Date(startDate) : new Date();
  const parsedServiceEndDate = endDate ? new Date(endDate) : new Date();

  const formatAddress = (address: string | undefined) => address?.replace(/,/g, '<br/>') || 'N/A';
  const fCurrency = (val?: number) => val?.toFixed(2) || '0.00';

  return `
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Invoice ${invoiceNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          .header, .footer { text-align: center; margin-bottom: 20px; }
          .details { margin-bottom: 30px; }
          .details table { width: 100%; border-collapse: collapse; }
          .details th, .details td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .company-info, .client-info { width: 48%; display: inline-block; vertical-align: top; margin-bottom: 20px; }
          .items th { background-color: #f2f2f2; }
          .total { text-align: right; margin-top: 20px; }
          .total-amount { font-size: 1.2em; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header"><h1>Invoice</h1></div>
        
        <div class="company-info">
          <strong>From:</strong><br/>
          ${companyName || 'Your Company LLC'}<br/>
          ${formatAddress(companyAddress)}
        </div>
        <div class="client-info" style="text-align: right;">
          <strong>Invoice #: ${invoiceNumber}</strong><br/>
          Date: ${format(parsedInvoiceDate, "MMMM d, yyyy")}<br/>
          Due Date: ${format(parsedDueDate, "MMMM d, yyyy")}
        </div>
        <br style="clear:both;"/>
        <div class="client-info">
          <strong>To:</strong><br/>
          ${customerName}<br/>
          ${formatAddress(clientAddress)}
        </div>
        <br style="clear:both;"/>

        <div class="details items">
          <table>
            <thead>
              <tr><th>Description</th><th>Duration</th><th>Amount</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>Service Rendered<br/><small>From ${format(parsedServiceStartDate, "MMM d, yyyy")} ${startTime} to ${format(parsedServiceEndDate, "MMM d, yyyy")} ${endTime}</small></td>
                <td>${duration ? `${duration.days}d ${duration.hours}h` : "N/A"}</td>
                <td>${fCurrency(totalFee)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="total">
          <p>Subtotal: ${fCurrency(totalFee)}</p>
          <p class="total-amount">Total Due: ${fCurrency(totalFee)}</p>
        </div>
        ${invoiceNotes ? `<div class="notes"><p><strong>Notes:</strong></p><p>${invoiceNotes.replace(/\n/g, '<br/>')}</p></div>` : ''}
        <div class="footer"><p>&copy; ${new Date().getFullYear()} ${companyName || 'Your Company'}</p></div>
      </body>
    </html>
  `;
};


// Assumed: html2canvas is available globally or via import if using bundler
declare const html2canvas: any; 
// Assumed: jsPDF is available globally or via import
declare const jspdf: any;


export const generatePdf = async (data: StoredInvoiceData, watermarkDataUrl?: string, elementToCapture?: HTMLElement): Promise<void> => {
  console.log("Generating PDF for:", data.invoiceNumber);
  if (!elementToCapture) {
    alert("PDF generation requires a visible template element.");
    return;
  }

  if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
    alert("PDF generation libraries (html2canvas, jsPDF) not found. Simulating text download.");
    const content = `Simulated PDF for Invoice ${data.invoiceNumber}\nCustomer: ${data.customerName}\nTotal: ${data.totalFee}`;
    simulateDownload(`invoice_${data.invoiceNumber}.pdf`, content, 'application/pdf');
    return;
  }
  
  const { jsPDF } = jspdf; // if using module import: import { jsPDF } from "jspdf";

  try {
    const canvas = await html2canvas(elementToCapture, {
      scale: 2, // Higher scale for better quality
      useCORS: true, // If images are from other domains
      logging: false,
    });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'px',
      format: [canvas.width, canvas.height] // Use canvas dimensions for PDF page size
    });
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(`invoice_${data.invoiceNumber}.pdf`);
  } catch (error) {
    console.error("Error generating PDF with html2canvas:", error);
    alert("Failed to generate PDF. Check console for details.");
    // Fallback to text
    const content = `Error generating PDF. Invoice ${data.invoiceNumber}\nCustomer: ${data.customerName}\nTotal: ${data.totalFee}`;
    simulateDownload(`invoice_${data.invoiceNumber}_error.pdf`, content, 'application/pdf');
  }
};

export const generateDoc = async (data: StoredInvoiceData, watermarkDataUrl?: string): Promise<void> => {
  console.log("Generating DOC for:", data.invoiceNumber);
  const htmlContent = getInvoiceHtmlForDoc(data);
  // For DOC, we can create an HTML string and use a data URI trick or a blob
  const content = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:w="urn:schemas-microsoft-com:office:word"
    xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"><title>Invoice ${data.invoiceNumber}</title></head>
    <body>${htmlContent}</body></html>`;
  
  simulateDownload(`invoice_${data.invoiceNumber}.doc`, content, 'application/msword');
};

export const generateJpeg = async (data: StoredInvoiceData, watermarkDataUrl?: string, elementToCapture?: HTMLElement): Promise<void> => {
  console.log("Generating JPEG for:", data.invoiceNumber);
  if (!elementToCapture) {
    alert("JPEG generation requires a visible template element.");
    return;
  }

  if (typeof html2canvas === 'undefined') {
    alert("html2canvas library not found. Simulating text download.");
    const content = `Simulated JPEG for Invoice ${data.invoiceNumber}\nCustomer: ${data.customerName}\nTotal: ${data.totalFee}`;
    simulateDownload(`invoice_${data.invoiceNumber}.txt`, content, 'text/plain'); // Fallback to .txt
    return;
  }

  try {
    const canvas = await html2canvas(elementToCapture, {
        scale: 1.5,
        useCORS: true,
        logging: false,
    });
    const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.9); // 0.9 quality
    simulateDownload(`invoice_${data.invoiceNumber}.jpeg`, jpegDataUrl, 'image/jpeg', true);
  } catch (error) {
    console.error("Error generating JPEG with html2canvas:", error);
    alert("Failed to generate JPEG. Check console for details.");
  }
};

// Note: For full html2canvas and jsPDF functionality, you would typically install them:
// npm install html2canvas jspdf
// And then import them:
// import html2canvas from 'html2canvas';
// import jsPDF from 'jspdf';
// The current setup assumes they might be loaded via CDN or are globally available for prototype purposes.
// If not, the simulated text downloads will occur.
