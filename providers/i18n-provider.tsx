// providers/i18n-provider.tsx
import { PropsWithChildren, useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";

import { i18nReady } from "@/lib/i18n";

export function I18nProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    i18nReady.then(() => setReady(true));
  }, []);

  if (!ready) {
    return <ActivityIndicator />;
  }

  return <>{children}</>;
}
