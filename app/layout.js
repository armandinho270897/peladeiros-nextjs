// CSS global dividido por área (ver app/styles/) em vez de um globals.css
// só — a ordem de import replica exatamente a ordem original das regras,
// então nenhum empate de especificidade muda de resultado.
import './styles/base.css';
import './styles/login.css';
import './styles/pelada-e-avisos.css';
import './styles/home-e-times.css';
import './styles/nav.css';
import './styles/mapa.css';
import './styles/onboarding.css';
import './styles/chat.css';
import './styles/organizar.css';
import './styles/admin.css';
import './styles/desafiado.css';
import SplashScreen from './components/SplashScreen';
import OnboardingOverlay from './components/OnboardingOverlay';
import InAppBrowserBanner from './components/InAppBrowserBanner';
import InstallBanner from './components/InstallBanner';
import BottomNav from './components/BottomNav';
import { SPLASH_IOS } from '@/lib/splashIos';
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
        {/* Tela de abertura do app instalado no iPhone — o Safari não gera
            isso sozinho a partir do manifest (diferente do Android), exige
            um link por tamanho de tela + densidade. Imagens geradas por
            scripts/gerar-splash-ios.mjs. */}
        {SPLASH_IOS.map((s) => (
          <link
            key={s.nome}
            rel="apple-touch-startup-image"
            href={`/icons/splash/splash-${s.nome}.png`}
            media={`(device-width: ${s.cssW}px) and (device-height: ${s.cssH}px) and (-webkit-device-pixel-ratio: ${s.dpr}) and (orientation: portrait)`}
          />
        ))}
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
