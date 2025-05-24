
import InvoicePreview from '@/components/invoice-preview';

export default function InvoicePreviewPage() {
  // The actual logic is in the client component InvoicePreview
  // which will use useParams to get invoiceId
  return (
    <div className="bg-muted/40 dark:bg-muted/20 py-8 min-h-[calc(100vh-4rem)]"> 
        <InvoicePreview />
    </div>
  );
}

// Optional: Add metadata if needed
// export async function generateMetadata({ params }: { params: { invoiceId: string } }) {
//   return {
//     title: `Invoice Preview - ${params.invoiceId}`,
//   };
// }
