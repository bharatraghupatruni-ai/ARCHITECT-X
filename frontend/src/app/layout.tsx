import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body className="min-h-screen bg-slate-50/70 text-slate-900 antialiased flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
        <div className="flex-1 flex flex-col">{children}</div>
      </body>
    </html>
  );
}
