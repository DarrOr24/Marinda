// lib/i18n.ts
import * as Localization from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "@/locales/en.json";
import he from "@/locales/he.json";
import { appStorage } from "./app-storage";

const LANG_STORAGE_KEY = "app:language";

const RTL_LANGS = new Set(["he", "ar", "fa", "ur"]);

export const SUPPORTED_LANGUAGES = [
  { code: "he", label: "Hebrew", nativeLabel: "עברית", flag: "🇮🇱" },
  { code: "en", label: "English", nativeLabel: "English", flag: "🇺🇸" },
] as const;

export type SupportedLangCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

async function getStoredLanguage(): Promise<string | null> {
  try {
    return await appStorage.getItem(LANG_STORAGE_KEY);
  } catch {
    return null;
  }
}

export async function persistLanguage(code: string): Promise<void> {
  await appStorage.setItem(LANG_STORAGE_KEY, code);
}

function getDeviceLanguage(): string {
  const locales = Localization.getLocales();
  const code = locales[0]?.languageCode ?? "he";
  const supported = new Set(SUPPORTED_LANGUAGES.map((l) => l.code));
  if (supported.has(code as SupportedLangCode)) return code;
  const base = code.split("-")[0];
  return supported.has(base as SupportedLangCode) ? base : "he";
}

export function isRtl(code: string): boolean {
  return RTL_LANGS.has(code.split("-")[0]);
}

const initI18n = async () => {
  const stored = await getStoredLanguage();
  const device = getDeviceLanguage();
  const lng = (stored && SUPPORTED_LANGUAGES.some((l) => l.code === stored))
    ? stored
    : device;

  await i18n.use(initReactI18next).init({
    compatibilityJSON: "v4",
    lng,
    fallbackLng: "he",
    resources: {
      he: { translation: he },
      en: { translation: en },
    },
    interpolation: {
      escapeValue: false,
    },
  });
};

export const i18nReady = initI18n();
export default i18n;
