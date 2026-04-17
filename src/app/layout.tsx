import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/shell/Sidebar";
import { TopBar } from "@/components/shell/TopBar";

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
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">
        <div className="flex h-screen w-screen overflow-hidden">
          <Sidebar />
          <div className="flex flex-1 min-w-0 flex-col">
            <TopBar />
            <main className="flex-1 overflow-auto">
              <div className="mx-auto max-w-[1400px] px-8 py-8">
                {children}
              </div>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
