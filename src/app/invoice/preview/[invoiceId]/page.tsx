
import InvoicePreview from '@/components/invoice-preview';

export default function InvoicePreviewPage() {
  // The actual logic is in the client component InvoicePreview
  // which will use useParams to get invoiceId
  return <InvoicePreview />;
}

// Optional: Add metadata if needed
// export async function generateMetadata({ params }: { params: { invoiceId: string } }) {
//   return {
//     title: `Invoice Preview - ${params.invoiceId}`,
//   };
// }
