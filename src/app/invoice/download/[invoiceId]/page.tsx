
"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Edit, Loader2, AlertTriangle, Home, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { StoredInvoiceData } from '@/lib/invoice-types';
import { getInvoiceData } from '@/lib/invoice-store';
import { InvoiceTemplate } from '@/components/invoice-template';
import { generatePdf, generateDoc, generateJpeg } from '@/lib/invoice-generator';
import { format, parseISO } from 'date-fns'; // Added missing imports

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
    generator: (data: StoredInvoiceData, watermark?: string, element?: HTMLElement | null) => Promise<void>,
    formatName: string
  ) => {
    if (!invoiceData) {
      toast({ title: "Error", description: "Invoice data not available for generation.", variant: "destructive" });
      return;
    }
    // For PDF and JPEG, elementToCapture is crucial. For DOC, it's not directly used in the same way.
    if ((formatName === 'PDF' || formatName === 'JPEG') && !invoiceTemplateRef.current) {
        toast({ title: "Error", description: "Invoice template element not ready for generation.", variant: "destructive" });
        return;
    }

    setIsGenerating(true);
    toast({ title: `Generating ${formatName}...`, description: "Please wait." });
    try {
      // Pass companyLogoDataUrl to generator if available, along with watermark.
      // The generator functions themselves decide how to use these based on their internal logic.
      // For PDF/JPEG, the templateRef already has these rendered if they exist.
      // For DOC, the generator function's HTML builder needs them.
      if (formatName === 'PDF' || formatName === 'JPEG') {
        await generator(invoiceData, invoiceData.watermarkDataUrl || undefined, invoiceTemplateRef.current);
      } else { 
        // DOC generator takes watermark directly, and its HTML builder will use companyLogoDataUrl from invoiceData
        await generator(invoiceData, invoiceData.watermarkDataUrl || undefined);
      }
      toast({ title: `${formatName} Generated!`, description: "Your download should start shortly.", variant: "default" });
    } catch (e) {
      console.error(`Error generating ${formatName}:`, e);
      toast({ variant: "destructive", title: "Generation Error", description: `Could not generate the ${formatName}. Please try again or check console.` });
    } finally {
      setIsGenerating(false);
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

  return (
    <div className="py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold text-primary">Download Your Invoice</h1>
          <div className="flex gap-2 flex-wrap justify-center">
             <Button onClick={() => router.push(`/invoice/preview/${invoiceId}`)} variant="outline">
              <Eye className="mr-2 h-4 w-4" /> Back to Preview
            </Button>
            <Button onClick={() => router.push(`/invoice/details?id=${invoiceId}`)} variant="outline">
              <Edit className="mr-2 h-4 w-4" /> Edit Invoice
            </Button>
             <Button onClick={() => router.push('/')} variant="outline">
              <Home className="mr-2 h-4 w-4" /> Go Home
            </Button>
          </div>
        </div>
        
        {/* Hidden invoice template for html2canvas capture. Ensure it's fully rendered and styled. */}
        <div 
          className="fixed top-0 left-[-9999px] opacity-100 z-[1] bg-transparent print:hidden"
        > 
            <div ref={invoiceTemplateRef} className="bg-card print:bg-white" style={{ width: '800px' }}>
              {/* Pass companyLogoDataUrl here as well */}
              {invoiceData && <InvoiceTemplate data={invoiceData} watermarkDataUrl={invoiceData.watermarkDataUrl} />}
            </div>
        </div>


        <Card className="shadow-lg rounded-lg">
          <CardHeader>
            <CardTitle className="text-xl">Choose Download Format</CardTitle>
            <CardDescription>Select your preferred format to download invoice <span className="font-semibold">{invoiceData.invoiceNumber}</span>.</CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col sm:flex-row gap-3 pt-2">
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
            <p><strong>Invoice Date:</strong> {invoiceData.invoiceDate ? format(parseISO(invoiceData.invoiceDate), "MMMM d, yyyy") : 'N/A'}</p>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
