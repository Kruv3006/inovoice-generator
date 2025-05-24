
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react"; // Changed icon
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] px-4">
      <Card className="w-full max-w-md shadow-xl text-center">
        <CardHeader>
          <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
             <FileText className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">Welcome to InvoiceCraft</CardTitle>
          <CardDescription className="text-lg text-muted-foreground pt-2">
            Effortlessly create and manage professional invoices.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <Link href="/invoice/details" passHref>
            <Button size="lg" className="mt-4 w-full max-w-xs">
              Create New Invoice
            </Button>
          </Link>
           <Link href="/invoices" passHref>
            <Button variant="outline" size="lg" className="mt-3 w-full max-w-xs">
              View My Invoices
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
