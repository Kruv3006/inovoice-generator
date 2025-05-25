
"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic'; // Import dynamic
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Edit, Loader2, AlertTriangle, Home, Eye, Mail, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { StoredInvoiceData } from '@/lib/invoice-types';
import { getInvoiceData } from '@/lib/invoice-store';
// import { InvoiceTemplate } from '@/components/invoice-template'; // Will be dynamically imported
import { generatePdf, generateDoc, generateJpeg } from '@/lib/invoice-generator';
import { format, parseISO, isValid } from 'date-fns';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Dynamically import InvoiceTemplate
const InvoiceTemplate = dynamic(() => import('@/components/invoice-template').then(mod => mod.InvoiceTemplate), {
  ssr: false, // No need for SSR for a component used for client-side capture
  loading: () => <p>Loading template...</p>, // Optional loading state
});


export default function InvoiceDownloadPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [invoiceData, setInvoiceData] = useState<StoredInvoiceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const invoiceId = typeof params.invoiceId === 'string' ? params.invoiceId : null;
  const invoiceTemplateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (invoiceId) {
      const data = getInvoiceData(invoiceId);
      if (data) {
        setInvoiceData(data);
      } else {
        toast({
          title: "Invoice Not Found",
          description: "Could not find the invoice data. Redirecting to create page.",
          variant: "destructive",
        });
        router.replace('/invoice/details');
      }
      setIsLoading(false);
    } else {
      toast({
        title: "Invalid Access",
        description: "No invoice ID provided. Redirecting.",
        variant: "destructive",
      });
      router.replace('/invoice/details');
      setIsLoading(false);
    }
  }, [invoiceId, router, toast]);

  const handleGenerate = async (
    generator: (data: StoredInvoiceData, watermarkDataUrlOrOpacity?: string | number, element?: HTMLElement | null) => Promise<void>,
    formatName: string
  ) => {
    if (!invoiceData) {
      toast({ title: "Error", description: "Invoice data not available for generation.", variant: "destructive" });
      return;
    }

    if ((formatName === 'PDF' || formatName === 'JPEG')) {
        if (!invoiceTemplateRef.current) {
             toast({ title: "Error", description: "Invoice template element not ready for generation.", variant: "destructive" });
             return;
        }
    }

    setIsGenerating(true);
    toast({ title: `Generating ${formatName}...`, description: "Please wait." });
    try {
      if (formatName === 'PDF' || formatName === 'JPEG') {
        await generator(invoiceData, undefined, invoiceTemplateRef.current);
      } else {
        await generator(invoiceData);
      }
      toast({ title: `${formatName} Generated!`, description: "Your download should start shortly.", variant: "default" });
    } catch (e) {
      console.error(`Error generating ${formatName}:`, e);
      // The generator functions are expected to show their own detailed toasts on error.
      // This is a fallback if they don't.
      // toast({ variant: "destructive", title: "Generation Error", description: `Could not generate the ${formatName}. Please try again or check console.` });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEmailInvoice = async () => {
    if (!invoiceData || !invoiceTemplateRef.current) {
      toast({
        title: "Data Missing",
        description: "Invoice data or template not ready. Cannot prepare email.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    let pdfGeneratedSuccessfully = false;

    try {
      toast({ title: "Preparing PDF...", description: "The invoice PDF is being generated for your email." });
      // generatePdf will handle its own success/error toasts for the generation part
      await generatePdf(invoiceData, undefined, invoiceTemplateRef.current);
      pdfGeneratedSuccessfully = true;
      toast({ title: "PDF Ready for Email", description: "The PDF has been downloaded. Proceeding to open your email client.", variant: "default"});

    } catch (e) {
      console.error("Error generating PDF for email:", e);
      // If generatePdf throws and doesn't toast, or for a general fallback:
      if (!pdfGeneratedSuccessfully) {
          toast({ variant: "destructive", title: "PDF Generation Failed", description: "Could not prepare the PDF for your email. Please try downloading manually." });
      }
    } finally {
      if (!pdfGeneratedSuccessfully) {
        setIsGenerating(false);
        return; // Don't proceed to mailto if PDF generation failed
      }
    }

    const subject = encodeURIComponent(`Invoice ${invoiceData.invoiceNumber} from ${invoiceData.companyName || 'Your Company'}`);
    const body = encodeURIComponent(
      `Hello ${invoiceData.customerName || 'Client'},\n\nPlease find attached invoice ${invoiceData.invoiceNumber}.pdf, which should have just downloaded to your computer.\n\nIf you don't see it, please ensure pop-ups are allowed and check your downloads folder.\n\nThank you for your business!\n\nBest regards,\n${invoiceData.companyName || 'Your Company'}`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;

    toast({
      title: "Email Client Opened",
      description: "Please find the downloaded PDF and attach it to your email.",
    });

    setIsGenerating(false); // Reset loading state after all actions
  };

  const handleShareInvoice = async () => {
    if (!invoiceData || !invoiceTemplateRef.current) {
        toast({ title: "Error", description: "Invoice data or template not ready for sharing.", variant: "destructive" });
        return;
    }

    if (navigator.share) {
        setIsGenerating(true);
        toast({ title: "Preparing PDF for sharing..." });
        try {
            const canvas = await html2canvas(invoiceTemplateRef.current, { scale: 2, useCORS: true, backgroundColor: null });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: canvas.width > canvas.height ? 'l' : 'p', unit: 'px', format: [canvas.width, canvas.height], compress: true });
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            const pdfBlob = pdf.output('blob');
            const pdfFile = new File([pdfBlob], `invoice_${invoiceData.invoiceNumber}.pdf`, { type: 'application/pdf' });

            if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
                await navigator.share({
                    title: `Invoice ${invoiceData.invoiceNumber}`,
                    text: `Here is invoice ${invoiceData.invoiceNumber} from ${invoiceData.companyName || 'Your Company'}.`,
                    files: [pdfFile],
                });
                toast({ title: "Shared successfully!" });
            } else {
                await navigator.share({
                    title: `Invoice ${invoiceData.invoiceNumber}`,
                    text: `View invoice ${invoiceData.invoiceNumber} from ${invoiceData.companyName || 'Your Company'}. Please download separately.`,
                    url: window.location.href,
                });
                toast({ title: "Shared link/text successfully!" });
            }
        } catch (error) {
            console.error('Error sharing invoice:', error);
            toast({ variant: "destructive", title: "Share Error", description: "Could not share the invoice. Try downloading manually." });
        } finally {
            setIsGenerating(false);
        }
    } else {
        toast({ variant: "default", title: "Share Not Supported", description: "Please download the invoice and share it manually." });
    }
  };


  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading Download Options...</p>
      </div>
    );
  }

  if (!invoiceData) {
    return (
      <Card className="m-auto mt-10 max-w-lg text-center shadow-xl">
        <CardHeader>
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <CardTitle>Invoice Data Not Found</CardTitle>
          <CardDescription>
            We couldn't retrieve the details for this invoice. It might have been cleared or the link is invalid.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.push('/invoice/details')}>
            <Edit className="mr-2 h-4 w-4" /> Create a New Invoice
          </Button>
        </CardContent>
      </Card>
    );
  }

  const mainInvoiceDateForDisplay = invoiceData.invoiceDate && isValid(parseISO(invoiceData.invoiceDate))
    ? parseISO(invoiceData.invoiceDate)
    : new Date();


  return (
    <div className="py-8 bg-muted/40 dark:bg-muted/20 min-h-[calc(100vh-4rem)]">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold text-primary">Download & Share Invoice</h1>
          <div className="flex gap-2 flex-wrap justify-center">
             <Button onClick={() => router.push(`/invoice/preview/${invoiceId}`)} variant="outline" className="bg-card hover:bg-accent/80">
              <Eye className="mr-2 h-4 w-4" /> Back to Preview
            </Button>
            <Button onClick={() => router.push(`/invoice/details?id=${invoiceId}`)} variant="outline" className="bg-card hover:bg-accent/80">
              <Edit className="mr-2 h-4 w-4" /> Edit Invoice
            </Button>
             <Button onClick={() => router.push('/')} variant="outline" className="bg-card hover:bg-accent/80">
              <Home className="mr-2 h-4 w-4" /> Go Home
            </Button>
          </div>
        </div>

        <div
          className="fixed top-0 left-[-9999px] opacity-0 z-[-100] print:hidden" /* Kept off-screen but renderable by html2canvas */
          aria-hidden="true"
        >
            <div ref={invoiceTemplateRef} className="bg-transparent print:bg-white" style={{ width: '800px', padding: '0', margin: '0' }}>
              {invoiceData && <InvoiceTemplate data={invoiceData} />}
            </div>
        </div>


        <Card className="shadow-xl rounded-lg">
          <CardHeader>
            <CardTitle className="text-xl">Choose Format & Action</CardTitle>
            <CardDescription>Select your preferred format to download invoice <span className="font-semibold">{invoiceData.invoiceNumber}</span>, or choose a share option.</CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col sm:flex-row flex-wrap gap-3 pt-2">
            <Button
              onClick={() => handleGenerate(generatePdf, 'PDF')}
              disabled={isGenerating}
              className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground shadow-md"
            >
              {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Download PDF
            </Button>
            <Button
              onClick={() => handleGenerate(generateDoc, 'DOC')}
              disabled={isGenerating}
              className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground shadow-md"
            >
              {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Download DOC
            </Button>
            <Button
              onClick={() => handleGenerate(generateJpeg, 'JPEG')}
              disabled={isGenerating}
              className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground shadow-md"
            >
              {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Download JPEG
            </Button>
            <Button
              onClick={handleEmailInvoice}
              disabled={isGenerating}
              variant="outline"
              className="w-full sm:w-auto shadow-md"
            >
             {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
              Email Invoice
            </Button>
             <Button
              onClick={handleShareInvoice}
              disabled={isGenerating}
              variant="outline"
              className="w-full sm:w-auto shadow-md"
            >
              {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
              Share Invoice
            </Button>
          </CardFooter>
        </Card>

        <Card className="mt-8 shadow-md rounded-lg">
          <CardHeader>
            <CardTitle className="text-lg">Invoice Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Invoice Number:</strong> {invoiceData.invoiceNumber}</p>
            <p><strong>Company:</strong> {invoiceData.companyName}</p>
            <p><strong>Customer:</strong> {invoiceData.customerName}</p>
            <p><strong>Total Amount:</strong> {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(invoiceData.totalFee || 0)}</p>
            <p><strong>Invoice Date:</strong> {format(mainInvoiceDateForDisplay, "MMMM d, yyyy")}</p>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
