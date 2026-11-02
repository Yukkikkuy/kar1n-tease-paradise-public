import { customAlphabet } from "nanoid";

const gen = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 4);

/** Format: XXXX-XXXX-XXXX-XXXX — hard to guess */
export function generateLicenseCode() {
  return `${gen()}-${gen()}-${gen()}-${gen()}`;
}
