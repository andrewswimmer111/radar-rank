import * as Crypto from 'expo-crypto';

// 32-char hex token derived from a v4 UUID (~122 bits of entropy).
// Plenty for unguessability while staying URL-safe without encoding.
export function generateToken(): string {
  return Crypto.randomUUID().replace(/-/g, '');
}
