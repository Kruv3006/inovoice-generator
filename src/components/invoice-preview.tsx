
"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Edit, Loader2, AlertTriangle, Home } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { StoredInvoiceData } from '@/lib/invoice-types';
import { getInvoiceData } from '@/lib/invoice-store';
import { InvoiceTemplate } from './invoice-template';
import { generatePdf, generateDoc, generateJpeg } from '@/lib/invoice-generator'; // Ensure paths are correct

export default function InvoicePreview() {
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
      // Should not happen if route is set up correctly
      router.replace('/invoice/details');
      setIsLoading(false);
    }
  }, [invoiceId, router, toast]);

  const handleGenerate = async (
    generator: (data: StoredInvoiceData, watermark?: string, element?: HTMLElement) => Promise<void>,
    format: string
  ) => {
    if (!invoiceData || !invoiceTemplateRef.current) {
      toast({ title: "Error", description: "Invoice data or template not available.", variant: "destructive" });
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
        <p className="ml-4 text-lg">Loading Invoice Preview...</p>
      </div>
    );
  }

  if (!invoiceData) {
    // This case is mostly handled by useEffect redirect, but as a fallback:
    return (
      <Card className="m-auto mt-10 max-w-lg text-center">
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
          <h1 className="text-3xl font-bold text-primary">Invoice Preview</h1>
          <div className="flex gap-2 flex-wrap justify-center">
            <Button onClick={() => router.push('/invoice/details')} variant="outline">
              <Edit className="mr-2 h-4 w-4" /> Edit Invoice
            </Button>
             <Button onClick={() => router.push('/')} variant="outline">
              <Home className="mr-2 h-4 w-4" /> Go Home
            </Button>
          </div>
        </div>

        <Card className="shadow-xl mb-8 overflow-hidden">
          <CardContent className="p-0">
            {/* The InvoiceTemplate component itself will be used for display */}
            {/* For generation, we pass a ref to its parent div if needed by html2canvas */}
            <div ref={invoiceTemplateRef} className="bg-background"> {/* This div will be captured by html2canvas */}
              <InvoiceTemplate data={invoiceData} watermarkDataUrl={invoiceData.watermarkDataUrl} />
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Download Invoice</CardTitle>
            <CardDescription>Choose your preferred format to download the invoice.</CardDescription>
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
      </div>
    </div>
  );
}
