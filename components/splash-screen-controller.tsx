// components/splash-screen-controller.tsx
import { useAuthContext } from '@/hooks/use-auth-context';
import { SplashScreen } from 'expo-router';
import { useEffect, useRef } from 'react';

SplashScreen.preventAutoHideAsync().catch(() => { /* ignore */ });

export function SplashScreenController() {
  const { isLoading } = useAuthContext();
  const hasHiddenRef = useRef(false);

  useEffect(() => {
    if (isLoading || hasHiddenRef.current) return;

    (async () => {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
        console.log('SplashScreen.hideAsync error', e);
      } finally {
        hasHiddenRef.current = true;
      }
    })();
  }, [isLoading]);

  return null;
}
