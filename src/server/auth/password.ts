import { hash, verify } from "@node-rs/argon2";

// Parâmetros recomendados pelo OWASP para Argon2id (2024+).
const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, ARGON2_OPTIONS);
}

export async function verifyPassword(hashed: string, plain: string): Promise<boolean> {
  return verify(hashed, plain);
}
