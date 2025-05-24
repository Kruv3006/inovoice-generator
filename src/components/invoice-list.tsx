
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, parseISO, isValid } from 'date-fns';
import { Eye, Edit, Download, Trash2, AlertTriangle, Loader2, ListChecks, FilePlus2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { StoredInvoiceData } from '@/lib/invoice-types';
import { getAllInvoices, removeInvoiceData } from '@/lib/invoice-store';

export default function InvoiceList() {
  const [invoices, setInvoices] = useState<StoredInvoiceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    const loadedInvoices = getAllInvoices();
    setInvoices(loadedInvoices);
    setIsLoading(false);
  }, []);

  const handleDelete = (invoiceId: string) => {
    removeInvoiceData(invoiceId);
    setInvoices(prevInvoices => prevInvoices.filter(inv => inv.id !== invoiceId));
    toast({ title: "Invoice Deleted", description: "The invoice has been removed successfully.", variant: "default" });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading invoices...</p>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <Card className="text-center shadow-md py-12">
        <CardHeader className="items-center">
          <div className="p-3 bg-primary/10 rounded-full mb-4 w-fit">
            <ListChecks className="mx-auto h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-semibold">No Invoices Yet!</CardTitle>
          <CardDescription className="text-muted-foreground max-w-sm mx-auto">
            It looks like you haven't created any invoices.
            Get started by creating your first one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/invoice/details" passHref>
            <Button size="lg">
              <FilePlus2 className="mr-2 h-5 w-5" /> Create New Invoice
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount?: number) => {
    if (typeof amount !== 'number') return '₹0.00';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };
  
  const formatDate = (dateString: string) => {
    if (!dateString || !isValid(parseISO(dateString))) return 'N/A';
    return format(parseISO(dateString), "MMM d, yyyy");
  }

  return (
    <Card className="shadow-xl">
        <CardHeader className="sr-only"> 
            <CardTitle>Invoice List</CardTitle>
            <CardDescription>A list of your recent invoices.</CardDescription>
        </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Invoice #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="w-[120px]">Date</TableHead>
                <TableHead className="w-[150px] text-right">Amount</TableHead>
                <TableHead className="w-[220px] text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                  <TableCell>{invoice.customerName}</TableCell>
                  <TableCell>{formatDate(invoice.invoiceDate)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(invoice.totalFee)}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center items-center gap-1 sm:gap-2">
                      <Button variant="ghost" size="icon" asChild title="Preview Invoice">
                        <Link href={`/invoice/preview/${invoice.id}`}><Eye className="h-4 w-4" /></Link>
                      </Button>
                      <Button variant="ghost" size="icon" asChild title="Edit Invoice">
                        <Link href={`/invoice/details?id=${invoice.id}`}><Edit className="h-4 w-4" /></Link>
                      </Button>
                      <Button variant="ghost" size="icon" asChild title="Download Invoice">
                         <Link href={`/invoice/download/${invoice.id}`}><Download className="h-4 w-4" /></Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" title="Delete Invoice" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the invoice
                              <span className="font-semibold"> {invoice.invoiceNumber}</span>.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(invoice.id)} className="bg-destructive hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
