import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "IdolStudy",
  description: "Track goals and study sessions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        
        {children}
      </body>
    </html>
  );
}
