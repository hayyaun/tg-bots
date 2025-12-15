import { Language } from "./types";
import { getProfileStrings, getProfileStringsSync, type IProfileStrings } from "./i18n";

export { getProfileStrings, getProfileStringsSync };
export type { IProfileStrings };

// Default (static) Persian strings for MatchFound legacy usage
const defaultStrings = getProfileStringsSync(Language.Persian);
export const errors = defaultStrings.errors;
export const success = defaultStrings.success;
export const profileValues = defaultStrings.profileValues;
export const buttons = defaultStrings.buttons;
export const editPrompts = defaultStrings.editPrompts;

