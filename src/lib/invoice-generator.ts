
import type { InvoiceFormSchemaType } from '@/components/invoice-form'; // Will create this type

const simulateDownload = (filename: string, content: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

export const generatePdf = async (data: InvoiceFormSchemaType, watermarkDataUrl?: string): Promise<void> => {
  console.log("Generating PDF with data:", data);
  if (watermarkDataUrl) {
    console.log("Applying watermark from data URL (first 50 chars):", watermarkDataUrl.substring(0,50));
  }
  // Actual PDF generation logic would go here (e.g., using jsPDF, html2canvas)
  // For now, simulate download
  const content = `Dummy PDF for ${data.customerName}\nStart: ${data.startDate.toLocaleDateString()} ${data.startTime}\nEnd: ${data.endDate.toLocaleDateString()} ${data.endTime}\nFee: ${data.totalFee}`;
  simulateDownload(`invoice_${data.customerName.replace(/\s+/g, '_')}.pdf`, content, 'application/pdf');
  alert("PDF generation initiated (simulated).");
};

export const generateDoc = async (data: InvoiceFormSchemaType, watermarkDataUrl?: string): Promise<void> => {
  console.log("Generating DOC with data:", data);
  if (watermarkDataUrl) {
    console.log("Applying watermark from data URL (first 50 chars):", watermarkDataUrl.substring(0,50));
  }
  // Actual DOC generation logic would go here
  const content = `Invoice for: ${data.customerName}\nDetails: Start Date - ${data.startDate.toLocaleDateString()} ${data.startTime}, End Date - ${data.endDate.toLocaleDateString()} ${data.endTime}, Total Fee - ${data.totalFee}`;
  simulateDownload(`invoice_${data.customerName.replace(/\s+/g, '_')}.doc`, content, 'application/msword');
  alert("DOC generation initiated (simulated).");
};

export const generateJpeg = async (data: InvoiceFormSchemaType, watermarkDataUrl?: string): Promise<void> => {
  console.log("Generating JPEG with data:", data);
   if (watermarkDataUrl) {
    console.log("Applying watermark from data URL (first 50 chars):", watermarkDataUrl.substring(0,50));
  }
  // Actual JPEG generation logic would go here (e.g., using html2canvas)
  // Create a dummy canvas content for simulation
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 100;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'black';
    ctx.font = '12px Arial';
    ctx.fillText(`Invoice: ${data.customerName}`, 10, 20);
    ctx.fillText(`Fee: ${data.totalFee}`, 10, 40);
    // If watermarkDataUrl, draw it (simplified)
    if (watermarkDataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.globalAlpha = 0.35;
        // Simplified centering and scaling
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.8;
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (canvas.width - w) / 2;
        const y = (canvas.height - h) / 2;
        ctx.drawImage(img, x, y, w, h);
        ctx.globalAlpha = 1.0; 
        simulateDownload(`invoice_${data.customerName.replace(/\s+/g, '_')}.jpeg`, canvas.toDataURL('image/jpeg'), 'image/jpeg');
      };
      img.onerror = () => {
         simulateDownload(`invoice_${data.customerName.replace(/\s+/g, '_')}.jpeg`, canvas.toDataURL('image/jpeg'), 'image/jpeg'); // download without watermark on error
      }
      img.src = watermarkDataUrl;
       alert("JPEG generation initiated (simulated). This may take a moment for watermark processing.");
      return; // Return to let async image loading complete
    }
  }
  simulateDownload(`invoice_${data.customerName.replace(/\s+/g, '_')}.jpeg`, canvas.toDataURL('image/jpeg'), 'image/jpeg');
  alert("JPEG generation initiated (simulated).");
};
