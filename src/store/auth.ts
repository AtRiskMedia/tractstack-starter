import { persistentMap } from "@nanostores/persistent";

type AuthValue = {
  token: string;
};

export const auth = persistentMap<AuthValue>("auth:", {
  token: "",
});
