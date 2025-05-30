
"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Edit, Loader2, AlertTriangle, Home } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { StoredInvoiceData } from '@/lib/invoice-types';
import { getInvoiceData } from '@/lib/invoice-store';
import { InvoiceTemplate } from './invoice-template';

export default function InvoicePreview() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [invoiceData, setInvoiceData] = useState<StoredInvoiceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const invoiceId = typeof params.invoiceId === 'string' ? params.invoiceId : null;

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
          description: "No invoice ID provided for preview. Redirecting.",
          variant: "destructive",
      });
      router.replace('/invoice/details');
      setIsLoading(false);
    }
  }, [invoiceId, router, toast]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading Invoice Preview...</p>
      </div>
    );
  }

  if (!invoiceData) {
    return (
      <div className="container mx-auto px-4 py-8">
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
      </div>
    );
  }

  return (
    <div className="py-8 bg-muted/30 dark:bg-muted/10"> 
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-primary">Invoice Preview</h1>
          <div className="flex gap-2 flex-wrap justify-center">
            <Button onClick={() => router.push(`/invoice/details?id=${invoiceId}`)} variant="outline" className="bg-card hover:bg-accent/80">
              <Edit className="mr-2 h-4 w-4" /> Edit Invoice
            </Button>
             <Button onClick={() => router.push('/')} variant="outline" className="bg-card hover:bg-accent/80">
              <Home className="mr-2 h-4 w-4" /> Go Home
            </Button>
          </div>
        </div>

        <div className="bg-white p-2 sm:p-4 md:p-6 shadow-2xl rounded-lg mx-auto max-w-4xl print-target-area overflow-hidden"> 
          <div className="mx-auto" style={{ transform: 'scale(0.95)', transformOrigin: 'top', width: '105.26%' }}> 
             {invoiceData && <InvoiceTemplate data={invoiceData} forceLightMode={true} />}
          </div>
        </div>
        
        <div className="flex justify-center md:justify-end mt-8">
            <Button 
                onClick={() => router.push(`/invoice/download/${invoiceId}`)} 
                size="lg"
                className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-md"
            >
                Proceed to Download, Share & Print <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
        </div>
      </div>
    </div>
  );
}
