import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Image Chat",
  description: "Chat with Claude and generate images with Magnific."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
