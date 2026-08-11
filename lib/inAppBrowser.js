// Detecta navegadores embutidos (in-app browsers) de apps que costumam
// restringir armazenamento local, o que quebra a persistência de sessão.
// Padrões manuais em vez de biblioteca externa — poucos regex resolvem
// bem e evita dependência nova só pra isso.
const PATTERNS = [
  /FBAN|FBAV/i,          // Facebook
  /Instagram/i,           // Instagram
  /Line\//i,               // LINE
  /MicroMessenger/i,       // WeChat
  /\bTikTok\b/i,           // TikTok
  /BytedanceWebview/i,     // TikTok (variante)
  /musical_ly/i,           // TikTok (token legado de UA)
  /Twitter/i,              // X/Twitter in-app
  /Snapchat/i,             // Snapchat
  /Pinterest/i,            // Pinterest
];

export function isInAppBrowser(userAgent) {
  if (!userAgent) return false;
  return PATTERNS.some((re) => re.test(userAgent));
}
