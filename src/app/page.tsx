
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FilePlus2 } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-4">
             <FilePlus2 className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">Welcome to InvoiceCraft</CardTitle>
          <CardDescription className="text-lg text-muted-foreground pt-2">
            Generate professional invoices with ease. Click below to get started.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <Link href="/invoice/details" passHref>
            <Button size="lg" className="mt-4 w-full">
              Create New Invoice
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
