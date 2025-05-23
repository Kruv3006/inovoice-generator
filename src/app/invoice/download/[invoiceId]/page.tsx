
"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Edit, Loader2, AlertTriangle, Home, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { StoredInvoiceData } from '@/lib/invoice-types';
import { getInvoiceData } from '@/lib/invoice-store';
import { InvoiceTemplate } from '@/components/invoice-template'; // Re-added import
import { generatePdf, generateDoc, generateJpeg } from '@/lib/invoice-generator';

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
      router.replace('/invoice/details');
      setIsLoading(false);
    }
  }, [invoiceId, router, toast]);

  const handleGenerate = async (
    generator: (data: StoredInvoiceData, watermark?: string, element?: HTMLElement) => Promise<void>,
    format: string
  ) => {
    if (!invoiceData || !invoiceTemplateRef.current) {
      toast({ title: "Error", description: "Invoice data or template not available for generation.", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    toast({ title: `Generating ${format}...`, description: "Please wait." });
    try {
      await generator(invoiceData, invoiceData.watermarkDataUrl || undefined, invoiceTemplateRef.current);
      toast({ title: `${format} Generated!`, description: "Your download should start shortly.", variant: "default" });
    } catch (e) {
      console.error(`Error generating ${format}:`, e);
      toast({ variant: "destructive", title: "Generation Error", description: `Could not generate the ${format}.` });
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
      <Card className="m-auto mt-10 max-w-lg text-center">
        <CardHeader>
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <CardTitle>Invoice Data Not Found</CardTitle>
          <CardDescription>
            We couldn't retrieve the details for this invoice.
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
          <h1 className="text-3xl font-bold text-primary">Download Invoice</h1>
          <div className="flex gap-2 flex-wrap justify-center">
             <Button onClick={() => router.push(`/invoice/preview/${invoiceId}`)} variant="outline">
              <Eye className="mr-2 h-4 w-4" /> Back to Preview
            </Button>
            <Button onClick={() => router.push('/invoice/details')} variant="outline">
              <Edit className="mr-2 h-4 w-4" /> Edit Invoice
            </Button>
             <Button onClick={() => router.push('/')} variant="outline">
              <Home className="mr-2 h-4 w-4" /> Go Home
            </Button>
          </div>
        </div>
        
        {/* Hidden or minimized invoice template for html2canvas capture */}
        <div className="opacity-0 absolute -z-10 overflow-hidden max-h-0"> {/* Making it effectively hidden but available for capture */}
            <div ref={invoiceTemplateRef} className="bg-background">
              {invoiceData && <InvoiceTemplate data={invoiceData} watermarkDataUrl={invoiceData.watermarkDataUrl} />}
            </div>
        </div>


        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Choose Download Format</CardTitle>
            <CardDescription>Select your preferred format to download invoice <span className="font-semibold">{invoiceData.invoiceNumber}</span>.</CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button 
              onClick={() => handleGenerate(generatePdf, 'PDF')} 
              disabled={isGenerating} 
              className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Download PDF
            </Button>
            <Button 
              onClick={() => handleGenerate(generateDoc, 'DOC')} 
              disabled={isGenerating} 
              className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Download DOC
            </Button>
            <Button 
              onClick={() => handleGenerate(generateJpeg, 'JPEG')} 
              disabled={isGenerating} 
              className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Download JPEG
            </Button>
          </CardFooter>
        </Card>
        
        <Card className="mt-8 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Invoice Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Invoice Number:</strong> {invoiceData.invoiceNumber}</p>
            <p><strong>Customer:</strong> {invoiceData.customerName}</p>
            <p><strong>Total Amount:</strong> {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(invoiceData.totalFee || 0)}</p>
            <p><strong>Invoice Date:</strong> {format(parseISO(invoiceData.invoiceDate), "MMMM d, yyyy")}</p>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

