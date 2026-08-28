import type { Metadata } from "next";
import localFont from 'next/font/local';
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const rethink = localFont({
  src: [
    { path: '../../public/font/RethinkSans-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../../public/font/RethinkSans-Italic.ttf', weight: '400', style: 'italic' },
    { path: '../../public/font/RethinkSans-Medium.ttf', weight: '500', style: 'normal' },
    { path: '../../public/font/RethinkSans-MediumItalic.ttf', weight: '500', style: 'italic' },
    { path: '../../public/font/RethinkSans-SemiBold.ttf', weight: '600', style: 'normal' },
    { path: '../../public/font/RethinkSans-SemiBoldItalic.ttf', weight: '600', style: 'italic' },
    { path: '../../public/font/RethinkSans-Bold.ttf', weight: '700', style: 'normal' },
    { path: '../../public/font/RethinkSans-BoldItalic.ttf', weight: '700', style: 'italic' },
    { path: '../../public/font/RethinkSans-ExtraBold.ttf', weight: '800', style: 'normal' },
    { path: '../../public/font/RethinkSans-ExtraBoldItalic.ttf', weight: '800', style: 'italic' },
  ],
  variable: "--font-rethink",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Workplace",
  description: "The unified workspace for your entire company.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${rethink.variable} font-sans bg-gray-50 text-black dark:bg-black dark:text-white antialiased selection:bg-black/20 dark:selection:bg-white/20 min-h-screen transition-colors duration-300`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
