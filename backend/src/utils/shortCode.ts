import { customAlphabet } from "nanoid";
import { env } from "../config/env";

// Excludes visually ambiguous characters (0/O, 1/l/I) to keep short codes easy to read/type.
const ALPHABET = "23456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";

const generate = customAlphabet(ALPHABET, env.shortCodeLength);

export function generateShortCode(): string {
  return generate();
}
