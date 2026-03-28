import "./globals.css";

export const metadata = {
  title: "Synapse | Collaborative Intelligence",
  description: "Chronosync your collective intelligence.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#050508] text-white antialiased">
        {children}
      </body>
    </html>
  );
}