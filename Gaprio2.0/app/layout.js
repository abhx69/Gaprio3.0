import Navbar from "@/components/Navbar";
import "./globals.css";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/context/ApiContext";

// --- Comprehensive SEO + Branding Metadata ---
export const metadata = {
  title: {
    default: "Gaprio | AI-Powered Mediator for Human Gaps",
    template: "%s | Gaprio",
  },
  description:
    "Gaprio harnesses advanced AI to understand, interpret, and bridge communication gaps, fostering clarity, empathy, and genuine human connection.",
  icons: {
    icon: "https://gaprio.vercel.app/logo.png", // ✅ ensures Next.js knows where to find it
  },
};


export default function RootLayout({ children }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="bg-gray-900">
        <AuthProvider>
            {/* Sticky Responsive Navbar */}
            <Navbar />

            {/* Main Content Area */}
            <main className="">
              {children}
            </main>

            {/* Responsive Footer */}
            {/* <Notification /> */}
            <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
