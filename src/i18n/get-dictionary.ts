import type { Locale } from "./locales";
import { de, type Dictionary } from "./dictionaries/de";
import { en } from "./dictionaries/en";
import { fr } from "./dictionaries/fr";
import { it } from "./dictionaries/it";

const dictionaries: Record<Locale, Dictionary> = { de, en, fr, it };
export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
export type { Dictionary };
