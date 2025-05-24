
import InvoiceList from "@/components/invoice-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FilePlus2 } from "lucide-react";

export default function InvoicesPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-primary">Your Invoices</h1>
          <p className="text-muted-foreground">View, manage, and track all your created invoices.</p>
        </div>
        <Link href="/invoice/details" passHref>
          <Button>
            <FilePlus2 className="mr-2 h-4 w-4" /> Create New Invoice
          </Button>
        </Link>
      </div>
      <InvoiceList />
    </div>
  );
}
