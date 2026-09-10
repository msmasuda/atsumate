import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
const KEY_LENGTH = 64;
const N = 2 ** 15;
const R = 8;
const P = 1;
const MAX_MEMORY = 64 * 1024 * 1024;

export const PASSWORD_MIN_LENGTH = 15;
export const PASSWORD_MAX_LENGTH = 128;

export function isPasswordAllowed(password: string) {
  return password.length >= PASSWORD_MIN_LENGTH && password.length <= PASSWORD_MAX_LENGTH;
}

function derive(password: string, salt: Buffer, keyLength: number) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, keyLength, { N, r: R, p: P, maxmem: MAX_MEMORY }, (error, value) => {
      if (error) reject(error);
      else resolve(value);
    });
  });
}

export async function hashPassword(password: string) {
  if (!isPasswordAllowed(password)) throw new Error("パスワードの長さが不正です。");
  const salt = randomBytes(16);
  const derived = await derive(password, salt, KEY_LENGTH);
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${derived.toString("base64")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [algorithm, n, r, p, saltValue, hashValue, ...rest] = storedHash.split("$");
  if (algorithm !== "scrypt" || !saltValue || !hashValue || rest.length) return false;

  const parameters = [n, r, p].map(Number);
  if (parameters.some((value) => !Number.isSafeInteger(value) || value <= 0)) return false;

  try {
    const expected = Buffer.from(hashValue, "base64");
    const salt = Buffer.from(saltValue, "base64");
    if (expected.length !== KEY_LENGTH || salt.length !== 16) return false;
    if (parameters[0] !== N || parameters[1] !== R || parameters[2] !== P) return false;
    const actual = await derive(password, salt, expected.length);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
