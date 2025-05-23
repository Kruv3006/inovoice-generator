
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ThemeToggleButton } from '@/components/theme-toggle-button';
import { Toaster } from '@/components/ui/toaster';
import { FileText } from 'lucide-react'; // Or consider a more business-y icon like Briefcase

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'InvoiceCraft',
  description: 'Generate professional invoices with ease.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col bg-background`}>
        <header className="sticky top-0 z-50 w-full border-b bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <div className="container flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-7 w-7 text-primary" />
              <h1 className="text-2xl font-semibold tracking-tight">InvoiceCraft</h1>
            </div>
            <ThemeToggleButton />
          </div>
        </header>
        <main className="flex-1 w-full"> {/* Container usually in page, not layout for more control */}
          {children}
        </main>
        <Toaster />
      </body>
    </html>
  );
}
