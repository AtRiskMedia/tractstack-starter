import { atom } from "nanostores";

export const activeHelpKeyStore = atom<string | null>(null);
export const showHelpStore = atom<boolean>(true);
