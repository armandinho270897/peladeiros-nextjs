'use client';
import { useEffect, useState } from 'react';

const DURATION_MS = 1800;
const EXIT_MS = 500;

export default function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(dismiss, DURATION_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismiss() {
    setExiting((already) => {
      if (already) return already;
      setTimeout(() => setVisible(false), EXIT_MS);
      return true;
    });
  }

  if (!visible) return null;

  return (
    <div className={`pl-splash ${exiting ? 'pl-splash-exit' : ''}`} onClick={dismiss}>
      <img src="/icons/icon-512.png" alt="Peladeiros" className="pl-splash-logo" width={160} height={160} fetchPriority="high" />
    </div>
  );
}
