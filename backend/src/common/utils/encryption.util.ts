import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
// In a real application, this should be a 32-byte key stored securely in environment variables.
// For this thesis, we will use a hardcoded 32-byte key or derive it.
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY || '12345678901234567890123456789012', 'utf8'); // 32 chars
const IV_LENGTH = 12; // For GCM

export class EncryptionUtil {
  static encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');

    // Return iv:encrypted:authTag
    return `${iv.toString('hex')}:${encrypted}:${authTag}`;
  }

  static decrypt(text: string): string {
    if (!text || !text.includes(':')) return text;

    try {
      const parts = text.split(':');
      if (parts.length !== 3) return text;

      const iv = Buffer.from(parts[0], 'hex');
      const encryptedText = parts[1];
      const authTag = Buffer.from(parts[2], 'hex');

      const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch {
      // If decryption fails (e.g. data wasn't encrypted), return original
      return text;
    }
  }
}
