import { persistentMap } from "@nanostores/persistent";
import { atom } from "nanostores";
import type { Referrer } from "../types";

export type AuthSettings = {
  key: string | undefined;
  visitId: string | undefined;
  beliefs: string | undefined;
  encryptedEmail: string | undefined;
  encryptedCode: string | undefined;
  consent: string | undefined;
  active: string | undefined;
  hasProfile: string | undefined;
  unlockedProfile: string | undefined;
  knownCorpusIds: string | undefined;
};

export type AuthProfile = {
  firstname: string | undefined;
  contactPersona: string | undefined;
  email: string | undefined;
  shortBio: string | undefined;
};

export const auth = persistentMap<AuthSettings>("auth:", {
  key: undefined,
  visitId: undefined,
  beliefs: undefined,
  encryptedEmail: undefined,
  encryptedCode: undefined,
  consent: undefined,
  active: undefined,
  hasProfile: undefined,
  unlockedProfile: undefined,
  knownCorpusIds: undefined,
});

export const entered = atom<boolean>(false);
export const newProfile = atom<boolean>(false);
export const sync = atom<boolean>(false);
export const locked = atom<boolean>(false);
export const error = atom<boolean | undefined>(undefined);
export const success = atom<boolean | undefined>(undefined);
export const loading = atom<boolean | undefined>(undefined);
export const profile = atom<AuthProfile>({
  firstname: undefined,
  contactPersona: undefined,
  email: undefined,
  shortBio: undefined,
});
export const referrer = atom<Referrer>({});
