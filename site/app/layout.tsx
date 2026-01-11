import "./globals.css";

import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";

import Nav from "../components/Nav";

export const metadata: Metadata = {
  title: "Detection Pack Lab",
  description: "Sigma → Elastic + CI-verified validation evidence",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <div className="container">{children}</div>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "rgba(14, 18, 28, 0.92)",
              color: "rgba(255,255,255,0.92)",
              border: "1px solid rgba(255,255,255,0.12)",
            },
          }}
        />
      </body>
    </html>
  );
}

