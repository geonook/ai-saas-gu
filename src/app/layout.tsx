import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { MuiThemeProvider } from "@/components/providers/mui-theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/components/ui/toast";
import { TurbopackWarning } from "@/components/development/TurbopackWarning";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: "SaaSonic - Build Your SaaS at Sonic Speed",
  description: "Saasonic gives you everything you need to build, launch, and scale your SaaS — from authentication to payments, all at sonic speed.",
  keywords: ["saas", "framework", "nextjs", "typescript", "tailwind", "react"],
  authors: [{ name: "SaaSonic Team" }],
  creator: "SaaSonic",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://saasonic.com",
    siteName: "SaaSonic",
    title: "SaaSonic - Build Your SaaS at Sonic Speed",
    description: "Saasonic gives you everything you need to build, launch, and scale your SaaS — from authentication to payments, all at sonic speed",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "SaaSonic - Build Your SaaS at Sonic Speed",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SaaSonic - Build Your SaaS at Sonic Speed",
    description: "Saasonic gives you everything you need to build, launch, and scale your SaaS — from authentication to payments, all at sonic speed",
    images: ["/og-image.png"],
    creator: "@saasonic",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <MuiThemeProvider>
            <AuthProvider>
              <ToastProvider>
                <TurbopackWarning />
                {children}
              </ToastProvider>
            </AuthProvider>
          </MuiThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
