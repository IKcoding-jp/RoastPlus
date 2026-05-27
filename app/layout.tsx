import type { Metadata, Viewport } from 'next';
// TEMPORARY: Google Fonts disabled for build - will re-enable after deployment
// import { Geist, Geist_Mono, Noto_Serif_JP, Playfair_Display, Nunito } from "next/font/google";
import './globals.css';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration';
import { SplashScreenWrapper } from '@/components/SplashScreenWrapper';
import { ToastProvider } from '@/components/Toast';
import { ThemeProvider } from '@/components/ThemeProvider';

export const metadata: Metadata = {
  title: 'RoastPlus',
  description: 'コーヒー豆加工業務をサポートするWebアプリ',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/site.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'RoastPlus',
  },
};

export const viewport: Viewport = {
  themeColor: '#261a14',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const e2eMode = process.env.NEXT_PUBLIC_E2E_MODE === 'true';

  return (
    <html lang="ja" suppressHydrationWarning>
      <body
        className="antialiased font-serif bg-page"
        data-roastplus-e2e-mode={e2eMode ? 'true' : 'false'}
        suppressHydrationWarning
      >
        <SplashScreenWrapper />
        <ServiceWorkerRegistration />
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
