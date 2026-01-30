import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PolyEsports | Esports & Game Predictions on Polymarket",
  description: "PolyEsports aggregates esports and gaming prediction markets from Polymarket, delivering data, analysis, and insights to help you predict smarter.",
  keywords: ["esports predictions", "game predictions", "prediction markets", "esports events", "predictions", "Polymarket"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
    <head>
      <link rel="icon" href="/logo.png" type={'image/x-icon'}/>
    </head>
    <body className={`${inter.variable} antialiased`}>
    <Providers>
      <Header />
          <main className="pt-16 min-h-screen">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
