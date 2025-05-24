
import type { Metadata } from 'next';
import Link from 'next/link';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ThemeToggleButton } from '@/components/theme-toggle-button';
import { Toaster } from '@/components/ui/toaster';
import { FileText, ListChecks, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';


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
  manifest: '/manifest.json', // Added manifest link for PWA
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#64B5F6" /> 
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        {/* You can also add apple-touch-icon links here if you have specific iOS icons */}
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col bg-background`}>
        <header className="sticky top-0 z-50 w-full border-b bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-3 group">
              <FileText className="h-7 w-7 text-primary group-hover:text-primary/90 transition-colors" />
              <h1 className="text-2xl font-semibold tracking-tight group-hover:text-primary/90 transition-colors">InvoiceCraft</h1>
            </Link>
            <nav className="flex items-center gap-4"> {/* Increased gap from 2 to 4 */}
              <Link href="/invoices" passHref>
                <Button variant="ghost" className="text-muted-foreground hover:text-primary">
                  <ListChecks className="h-4 w-4" />
                  Invoices
                </Button>
              </Link>
              <Link href="/settings" passHref>
                 <Button variant="ghost" className="text-muted-foreground hover:text-primary">
                   <Settings className="h-4 w-4" />
                   Settings
                 </Button>
              </Link>
              <ThemeToggleButton />
            </nav>
          </div>
        </header>
        <main className="flex-1 w-full">
          {children}
        </main>
        <Toaster />
      </body>
    </html>
  );
}
