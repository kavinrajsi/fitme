/**
 * Root layout — wraps every page in the app.
 *
 * Sets up the IBM Plex Sans/Mono fonts (exposed as CSS variables), the PWA
 * metadata + web manifest, and a next-themes ThemeProvider locked to a dark
 * default. Establishes the global font + theme shell that every route renders
 * inside of; the Sonner toaster is mounted within the page/segment trees.
 */
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

// PWA / installable-app metadata: manifest, Apple touch icon, and standalone web-app hints.
export const metadata = {
  title: "KyaReFitting aa",
  description: "Sign in with Google to get started.",
  manifest: "/manifest.webmanifest",
  icons: { apple: "/apple-icon.png" },
  appleWebApp: { capable: true, title: "KyaReFitting aa", statusBarStyle: "default" },
};

// Mobile viewport + theme-color (matched to the light/dark backgrounds) for the status bar.
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

// The document shell. Font CSS-variable classes are applied on <html>;
// suppressHydrationWarning is required because next-themes sets the class clientside.
export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${ibmPlexSans.variable} ${ibmPlexMono.variable}`}
    >
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
