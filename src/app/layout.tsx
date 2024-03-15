import { Toaster } from "react-hot-toast";
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pecha Line Image Tool",
  description: "Tool by OpenPecha for line image",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="top-center" reverseOrder={false} />
        <script src="/tiff.min.js" defer></script>
      </body>
    </html>
  );
}
