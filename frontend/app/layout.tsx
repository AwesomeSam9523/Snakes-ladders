import React from "react"
import type {Metadata} from "next"
import {Geist, Geist_Mono} from "next/font/google"
import {Analytics} from "@vercel/analytics/next"
import "./globals.css"

const _geist = Geist({subsets: ["latin"]})
const _geistMono = Geist_Mono({subsets: ["latin"]})

export const metadata: Metadata = {
  title: "Snake & Ladder - Admin Portal",
  icons: {
    icon: [
      {url: '/favicon.ico'},
      {url: '/icon.png', type: 'image/png'},
    ],
    apple: '/icon.png',
    shortcut: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // React.useEffect(() => {
  //   sessionStorage.removeItem('app_version_reloaded')
  // }, [])
  return (
    <html lang="en">
    <body className={`font-sans antialiased`}>
    {children}
    <Analytics/>
    </body>
    </html>
  )
}
