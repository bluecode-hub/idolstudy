import type { Metadata } from "next";
import Providers from "./providers";

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
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
