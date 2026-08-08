import './globals.css';
import SplashScreen from './components/SplashScreen';

export const metadata = {
  metadataBase: new URL('https://peladeiros-nextjs.vercel.app'),
  title: 'Peladeiros',
  description: 'Achou o campo, chamou o povo, bateu bola.',
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
  themeColor: '#0A0A0A',
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
        <SplashScreen />
        {children}
      </body>
    </html>
  );
}
