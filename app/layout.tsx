import { AuthProvider } from '@/contexts/AuthContext';
import './globals.css';
import favicon from './favicon.ico';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>FitRank - Coaches Portal</title>
        <meta name="description" content="FitRank coaches management portal" />
        <link rel="icon" href={(favicon as any)?.src || (favicon as any)} />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
