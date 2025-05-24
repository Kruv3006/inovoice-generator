
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, parseISO, isValid } from 'date-fns';
import { Eye, Edit, Download, Trash2, AlertTriangle, Loader2, ListChecks, FilePlus2, Search, Copy } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { getAllInvoices, removeInvoiceData, getInvoiceData, saveInvoiceData } from '@/lib/invoice-store';

export default function InvoiceList() {
  const [allInvoices, setAllInvoices] = useState<StoredInvoiceData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    const loadedInvoices = getAllInvoices();
    setAllInvoices(loadedInvoices);
    setIsLoading(false);
  }, []);

  const filteredInvoices = useMemo(() => {
    if (!searchTerm) {
      return allInvoices;
    }
    return allInvoices.filter(invoice =>
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allInvoices, searchTerm]);

  const handleDelete = (invoiceId: string) => {
    removeInvoiceData(invoiceId);
    setAllInvoices(prevInvoices => prevInvoices.filter(inv => inv.id !== invoiceId));
    toast({ title: "Invoice Deleted", description: "The invoice has been removed successfully.", variant: "default" });
  };

  const handleDuplicate = (invoiceIdToDuplicate: string) => {
    const sourceInvoice = getInvoiceData(invoiceIdToDuplicate);
    if (!sourceInvoice) {
      toast({ title: "Duplication Error", description: "Could not find the original invoice to duplicate.", variant: "destructive" });
      return;
    }
    // No need to create a new StoredInvoiceData object here;
    // The InvoiceForm will handle the creation of a new ID and modified invoice number
    // when it loads with the `duplicate` query parameter.
    router.push(`/invoice/details?duplicate=${invoiceIdToDuplicate}`);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading invoices...</p>
      </div>
    );
  }
  
  const formatCurrency = (amount?: number) => {
    if (typeof amount !== 'number') return '₹0.00';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };
  
  const formatDate = (dateString?: string) => {
    if (!dateString || !isValid(parseISO(dateString))) return 'N/A';
    return format(parseISO(dateString), "MMM d, yyyy");
  }

  return (
    <>
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by Invoice # or Customer Name..."
            className="w-full pl-10 py-2 text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredInvoices.length === 0 ? (
        <Card className="text-center shadow-md py-12">
          <CardHeader className="items-center">
            <div className="p-3 bg-primary/10 rounded-full mb-4 w-fit">
              <ListChecks className="mx-auto h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl font-semibold">
              {searchTerm ? "No Invoices Match Your Search" : "No Invoices Yet!"}
            </CardTitle>
            <CardDescription className="text-muted-foreground max-w-sm mx-auto">
              {searchTerm 
                ? "Try adjusting your search term or clear the search." 
                : "It looks like you haven't created any invoices. Get started by creating your first one."
              }
            </CardDescription>
          </CardHeader>
          {!searchTerm && (
            <CardContent>
              <Link href="/invoice/details" passHref>
                <Button size="lg">
                  <FilePlus2 className="mr-2 h-5 w-5" /> Create New Invoice
                </Button>
              </Link>
            </CardContent>
          )}
        </Card>
      ) : (
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
                    <TableHead className="whitespace-nowrap">Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="whitespace-nowrap">Date</TableHead>
                    <TableHead className="text-right whitespace-nowrap min-w-[100px]">Amount</TableHead>
                    <TableHead className="text-center min-w-[200px]">Actions</TableHead> {/* Increased min-width for more buttons */}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium whitespace-nowrap">{invoice.invoiceNumber}</TableCell>
                      <TableCell>{invoice.customerName}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatDate(invoice.invoiceDate)}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">{formatCurrency(invoice.totalFee)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center items-center gap-1 sm:gap-2 flex-wrap">
                          <Button variant="ghost" size="icon" asChild title="Preview Invoice">
                            <Link href={`/invoice/preview/${invoice.id}`}><Eye className="h-4 w-4" /></Link>
                          </Button>
                          <Button variant="ghost" size="icon" asChild title="Edit Invoice">
                            <Link href={`/invoice/details?id=${invoice.id}`}><Edit className="h-4 w-4" /></Link>
                          </Button>
                          <Button variant="ghost" size="icon" title="Duplicate Invoice" onClick={() => handleDuplicate(invoice.id)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" asChild title="Download Options">
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
      )}
    </>
  );
}
