
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
  manifest: '/manifest.json',
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
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col bg-background`}>
        <header className="sticky top-0 z-50 w-full border-b bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-2 group">
              <FileText className="h-6 w-6 text-primary group-hover:text-primary/90 transition-colors" />
              <h1 className="text-xl font-semibold tracking-tight group-hover:text-primary/90 transition-colors">InvoiceCraft</h1>
            </Link>
            <nav className="flex items-center gap-1">
              <Link href="/invoices" passHref>
                <Button variant="ghost" className="px-2 py-1 h-auto sm:px-3 sm:py-2 sm:h-10 text-sm">
                  <ListChecks className="h-4 w-4 mr-0 sm:mr-1" />
                  <span className="hidden sm:inline">Invoices</span>
                </Button>
              </Link>
              <Link href="/settings" passHref>
                 <Button variant="ghost" className="px-2 py-1 h-auto sm:px-3 sm:py-2 sm:h-10 text-sm">
                   <Settings className="h-4 w-4 mr-0 sm:mr-1" />
                   <span className="hidden sm:inline">Settings</span>
                 </Button>
              </Link>
              <ThemeToggleButton />
            </nav>
          </div>
        </header>
        <main className="flex-1 w-full">
          {children}
        </main>
        <footer className="text-center text-xs text-muted-foreground p-4 border-t">
          <p>InvoiceCraft is provided as-is. We are not responsible for any errors or omissions in invoices generated or for any issues arising from the use of this application.</p>
        </footer>
        <Toaster />
      </body>
    </html>
  );
}

    