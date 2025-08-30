import type React from "react"
import type { Metadata } from "next"
import { DM_Sans } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"
const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
  weight: ["400", "500", "600", "700"],
})

export const metadata: Metadata = {
  title: "NeuralSim",
  description:
    "Interactive neural network and brain function simulations for students and researchers in neuroscience and AI",
  icons: {
    icon: "brain.ico",
    shortcut: "brain.ico",
    apple: "brain.ico",
  },
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} antialiased`} suppressHydrationWarning>
      <body className="font-sans bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <div className="min-h-screen">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  )
}
