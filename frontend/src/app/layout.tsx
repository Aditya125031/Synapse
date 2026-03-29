import "./globals.css";
import FloatingChatbot from "@/components/floating_chatbot"; // Import the chatbot

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
        {/* Your existing layout/navbar/dashboard code goes here */}
        {children}

        {/* The AI Bot floats on top of everything! */}
        <FloatingChatbot />
      </body>
    </html>
  );
}