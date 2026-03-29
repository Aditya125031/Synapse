import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Synapse | Collective Intelligence",
  description: "AI-powered note-taking that fills your knowledge gaps using peer intelligence.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#050508] text-white antialiased">
        {children}
      </body>
    </html>
  );
}