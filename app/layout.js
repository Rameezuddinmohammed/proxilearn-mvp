import './globals.css'

export const metadata = {
  title: 'Proxilearn - Educational Platform',
  description: 'AI-powered unified educational ecosystem for schools',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  )
}