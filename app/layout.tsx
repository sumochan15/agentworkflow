import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI Jonbin Movie Maker - AI-Powered Video Creation",
  description: "Create engaging video summaries from text or URLs using AI. Transform your content into professional videos with AI-generated voiceovers and visuals.",
  keywords: "AI, video creation, video maker, AI video, content automation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="scroll-smooth">
      <body className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} ${outfit.variable} font-sans antialiased min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900`}>
        {/* Animated background pattern */}
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-accent/10 to-transparent rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 max-w-6xl relative">
          <div className="animate-fade-in">
            {children}
          </div>
        </main>

        {/* Decorative gradient orbs */}
        <div className="fixed top-0 right-0 w-96 h-96 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-3xl -z-10 opacity-40" />
        <div className="fixed bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-secondary/20 to-primary/20 rounded-full blur-3xl -z-10 opacity-40" />
      </body>
    </html>
  );
}
