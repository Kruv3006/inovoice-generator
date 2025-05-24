
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
    companyName, customerName, invoiceNumber, invoiceDate, dueDate,
    startDate, startTime, endDate, endTime, duration, totalFee, invoiceNotes,
    companyLogoDataUrl, // Added companyLogoDataUrl
  } = data;

  const parsedInvoiceDate = invoiceDate ? (parseISO(invoiceDate) instanceof Date && !isNaN(parseISO(invoiceDate).valueOf()) ? parseISO(invoiceDate) : new Date()) : new Date();
  const parsedDueDate = dueDate ? (parseISO(dueDate) instanceof Date && !isNaN(parseISO(dueDate).valueOf()) ? parseISO(dueDate) : new Date()) : new Date();
  const parsedServiceStartDate = startDate instanceof Date ? startDate : (startDate ? parseISO(startDate as unknown as string) : new Date());
  const parsedServiceEndDate = endDate instanceof Date ? endDate : (endDate ? parseISO(endDate as unknown as string) : new Date());

  const fCurrency = (val?: number) => val != null ? `₹${val.toFixed(2)}` : '₹0.00'; // Changed to INR

  const companyLogoHtml = companyLogoDataUrl
    ? `<img src="${companyLogoDataUrl}" style="max-height: 60px; max-width: 150px; margin-bottom: 10px; object-fit: contain;" alt="Company Logo"/>`
    : '';
  
  const watermarkHtml = watermarkDataUrl 
    ? `<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.05; pointer-events: none; z-index: 0; display:flex; align-items:center; justify-content:center; width:100%; height:100%;">
         <img src="${watermarkDataUrl}" style="max-width: 60%; max-height: 60%; object-fit: contain;" alt="Watermark"/>
       </div>`
    : '';

  return `
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Invoice ${invoiceNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; color: #333; font-size: 10pt; background-color: #fff; }
          .invoice-box { max-width: 800px; margin: 20px auto; padding: 30px; border: 1px solid #ddd; box-shadow: 0 0 10px rgba(0, 0, 0, .1); position: relative; background-color: #fff; }
          .watermark-container { position: absolute; top:0; left:0; width:100%; height:100%; overflow:hidden; z-index:0;}
          .content-wrapper { position:relative; z-index:1; }
          .header { display: table; width: 100%; margin-bottom: 20px; padding-bottom:10px; border-bottom: 1px solid #eee; }
          .header-left { display: table-cell; vertical-align: top; }
          .header-right { display: table-cell; vertical-align: top; text-align: right; }
          .company-logo { margin-bottom: 5px; }
          .company-name { font-size: 22px; font-weight: bold; color: #2563eb; margin-bottom: 2px; }
          .invoice-title { font-size: 26px; font-weight: bold; margin-bottom: 0px; color: #4b5563; }
          .info { display: table; width: 100%; margin-bottom: 25px; }
          .info-left, .info-right { display: table-cell; vertical-align: top; width: 50%; }
          .info-right { text-align: right; }
          .info div { margin-bottom: 3px; font-size:9.5pt; }
          .info strong { font-weight: 600; color: #1f2937; }
          .items-table { width: 100%; line-height: inherit; text-align: left; border-collapse: collapse; margin-bottom: 25px; }
          .items-table th, .items-table td { padding: 10px; border: 1px solid #e5e7eb; }
          .items-table th { background-color: #f3f4f6; font-weight: bold; color: #374151; }
          .items-table .description { width: 60%; }
          .items-table .duration-col, .items-table .amount-col { text-align: right; }
          .totals { text-align: right; margin-top: 20px; margin-bottom: 25px; }
          .totals div { margin-bottom: 6px; font-size: 10pt; }
          .totals strong {color: #1f2937;}
          .totals .grand-total { font-weight: bold; font-size: 15pt; color: #1d4ed8; border-top: 2px solid #eee; padding-top: 8px; margin-top:8px;}
          .notes { margin-top: 25px; padding-top:15px; border-top: 1px solid #eee; font-size: 9pt; color: #4b5563; }
          .notes strong {color: #1f2937;}
          .footer { text-align: center; font-size: 8pt; color: #9ca3af; margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <div class="watermark-container">${watermarkHtml}</div>
          <div class="content-wrapper">
            <div class="header">
              <div class="header-left">
                ${companyLogoHtml ? `<div class="company-logo">${companyLogoHtml}</div>` : ''}
                <div class="company-name">${companyName || 'Your Company'}</div>
              </div>
              <div class="header-right">
                <div class="invoice-title">INVOICE</div>
                <div><strong>Invoice #:</strong> ${invoiceNumber}</div>
                <div><strong>Date:</strong> ${format(parsedInvoiceDate, "MMMM d, yyyy")}</div>
                <div><strong>Due Date:</strong> ${format(parsedDueDate, "MMMM d, yyyy")}</div>
              </div>
            </div>

            <div class="info">
              <div class="info-left">
                <strong>Bill To:</strong><br/>
                ${customerName}<br/>
              </div>
              <div class="info-right">
                <strong>Service Period:</strong><br/>
                Start: ${format(parsedServiceStartDate, "MMM d, yyyy")} ${startTime}<br/>
                End: ${format(parsedServiceEndDate, "MMM d, yyyy")} ${endTime}
              </div>
            </div>

            <table class="items-table">
              <thead>
                <tr>
                  <th class="description">Description</th>
                  <th class="duration-col">Duration</th>
                  <th class="amount-col">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="description">
                    Service Rendered<br/>
                    <small style="font-size:8pt; color:#6b7280;">
                      Service period details above.
                    </small>
                  </td>
                  <td class="duration-col">${duration ? `${duration.days}d ${duration.hours}h` : "N/A"}</td>
                  <td class="amount-col">${fCurrency(totalFee)}</td>
                </tr>
              </tbody>
            </table>

            <div class="totals">
              <div><strong>Subtotal:</strong> ${fCurrency(totalFee)}</div>
              <div class="grand-total">TOTAL: ${fCurrency(totalFee)}</div>
            </div>

            ${invoiceNotes ? `<div class="notes"><strong>Notes:</strong><br/>${invoiceNotes.replace(/\n/g, '<br/>')}</div>` : ''}
            
            <div class="footer">
              <p>If you have any questions concerning this invoice, please contact ${companyName || "us"}.</p>
              <p>&copy; ${new Date().getFullYear()} ${companyName || 'Your Company'}. All rights reserved.</p>
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
  
  await new Promise(resolve => setTimeout(resolve, 200));

  try {
    const canvas = await html2canvas(elementToCapture, {
      scale: 2, 
      useCORS: true,
      logging: true,
      backgroundColor: null, 
      scrollX: -window.scrollX, 
      scrollY: -window.scrollY,
      windowWidth: elementToCapture.scrollWidth,
      windowHeight: elementToCapture.scrollHeight,
    });

    if (canvas.width === 0 || canvas.height === 0) {
        console.error("html2canvas returned an empty canvas for PDF.");
        toast({ variant: "destructive", title: "PDF Error", description: "Canvas capture failed (empty canvas)." });
        throw new Error("Canvas capture failed for PDF (empty canvas)");
    }
    
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
    toast({ variant: "destructive", title: "PDF Generation Error", description: "Could not generate PDF. Check console." });
    throw error;
  }
};

export const generateDoc = async (data: StoredInvoiceData, watermarkDataUrl?: string): Promise<void> => {
  console.log("Generating DOC for:", data.invoiceNumber);
  // Pass companyLogoDataUrl to getInvoiceHtmlForDoc if it's part of StoredInvoiceData and available
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

  await new Promise(resolve => setTimeout(resolve, 200));

  try {
    const canvas = await html2canvas(elementToCapture, {
        scale: 1.5, 
        useCORS: true,
        logging: true,
        backgroundColor: '#ffffff', 
        scrollX: -window.scrollX,
        scrollY: -window.scrollY,
        windowWidth: elementToCapture.scrollWidth,
        windowHeight: elementToCapture.scrollHeight,
    });

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
