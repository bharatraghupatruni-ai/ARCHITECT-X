import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "ARCHITECT-X | Evidence-Grounded Multi-Agent Architecture Review",
  description:
    "An Evidence-Grounded Multi-Agent Software Architecture Review and Decision System.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#090D16] text-slate-100 antialiased flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
        <Header />
        <main className="flex-1 bg-grid-pattern">{children}</main>
        <footer className="border-t border-surface-50 py-6 text-center text-xs text-slate-500 font-mono">
          <p>ARCHITECT-X — Phase 1 Project Foundation</p>
        </footer>
      </body>
    </html>
  );
}
