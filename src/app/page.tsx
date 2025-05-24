
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] px-4 py-8">
      <Card className="w-full max-w-md shadow-xl text-center">
        <CardHeader>
          <div className="mx-auto bg-primary/10 p-3 sm:p-4 rounded-full w-fit mb-4">
             <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-bold">Welcome to InvoiceCraft</CardTitle>
          <CardDescription className="text-base sm:text-lg text-muted-foreground pt-2">
            Effortlessly create and manage professional invoices.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-3 px-4 sm:px-6">
          <Link href="/invoice/details" passHref className="w-full">
            <Button size="lg" className="w-full max-w-xs mx-auto">
              Create New Invoice
            </Button>
          </Link>
           <Link href="/invoices" passHref className="w-full">
            <Button variant="outline" size="lg" className="w-full max-w-xs mx-auto">
              View My Invoices
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
