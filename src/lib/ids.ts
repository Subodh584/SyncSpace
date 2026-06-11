import { customAlphabet, nanoid } from "nanoid";

/** Primary id generator for app rows. */
export const genId = (): string => nanoid(21);

/** Human-typable join code, e.g. "K7QF-2M9P". */
const codeAlphabet = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8);
export function genJoinCode(): string {
  const raw = codeAlphabet();
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}
