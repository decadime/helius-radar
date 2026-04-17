import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/shell/Sidebar";
import { TopBar } from "@/components/shell/TopBar";
import { ShellProvider } from "@/components/shell/ShellContext";

const sans = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Helius Radar",
  description: "GTM intelligence for crypto-native account coverage.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        <ShellProvider>
          <div className="flex h-screen w-screen overflow-hidden">
            <Sidebar />
            <div className="flex flex-1 min-w-0 flex-col">
              <TopBar />
              <main className="flex-1 overflow-auto">{children}</main>
            </div>
          </div>
        </ShellProvider>
      </body>
    </html>
  );
}
