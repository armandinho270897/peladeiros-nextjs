import './globals.css';
import SplashScreen from './components/SplashScreen';
import OnboardingOverlay from './components/OnboardingOverlay';
import InAppBrowserBanner from './components/InAppBrowserBanner';
import InstallBanner from './components/InstallBanner';
import BottomNav from './components/BottomNav';
import { AuthProvider } from './components/AuthProvider';
import { ToastProvider } from './components/ToastProvider';

export const metadata = {
  metadataBase: new URL('https://peladeiros-nextjs.vercel.app'),
  title: 'Peladeiros',
  description: 'Vem pro fut, vem.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Peladeiros',
  },
  icons: {
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport = {
  themeColor: '#161412',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Anton&family=Permanent+Marker&family=Work+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* Filtro de borda áspera/stencil, compartilhado por qualquer elemento
            que aplique `filter: url(#pl-rough-filter)` (ticket CTA, ícones da
            navegação) — definido uma vez aqui pra existir em toda página,
            inclusive as sem BottomNav montado (login, splash). */}
        <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
          <filter id="pl-rough-filter">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="4" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.3" />
          </filter>
        </svg>
        <InAppBrowserBanner />
        <InstallBanner />
        <SplashScreen />
        <OnboardingOverlay />
        <ToastProvider>
          <AuthProvider>
            {children}
            <BottomNav />
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
