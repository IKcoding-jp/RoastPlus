import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';

import { FirestoreResumeHandler } from '@/components/FirestoreResumeHandler';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration';
import { SplashScreenWrapper } from '@/components/SplashScreenWrapper';
import { SyncErrorBanner } from '@/components/SyncErrorBanner';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ToastProvider } from '@/components/Toast';

import './globals.css';

const inter = localFont({
  src: './fonts/Inter-latin.woff2',
  variable: '--font-inter',
  weight: '100 900',
  display: 'swap',
  fallback: ['Noto Sans JP', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', 'sans-serif'],
});

const playfair = localFont({
  src: [
    { path: './fonts/PlayfairDisplay-latin.woff2', style: 'normal', weight: '400 900' },
    { path: './fonts/PlayfairDisplay-latin-italic.woff2', style: 'italic', weight: '400 900' },
  ],
  variable: '--font-playfair',
  display: 'swap',
  fallback: ['Georgia', 'Times New Roman', 'serif'],
});

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
    <html lang="ja" className={`${inter.variable} ${playfair.variable}`} suppressHydrationWarning>
      <body
        className="antialiased font-serif bg-page"
        data-roastplus-e2e-mode={e2eMode ? 'true' : 'false'}
        suppressHydrationWarning
      >
        <SplashScreenWrapper />
        <ServiceWorkerRegistration />
        <FirestoreResumeHandler />
        <ThemeProvider>
          <ToastProvider>
            <OfflineBanner />
            <SyncErrorBanner />
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
