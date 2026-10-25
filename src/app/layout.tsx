import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Post Reviewer",
  description: "Preview and approve LinkedIn posts before they go live.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
