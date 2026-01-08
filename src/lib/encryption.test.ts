import { describe, it, expect } from "vitest";
import { encrypt, decrypt } from "./encryption";

describe("encryption", () => {
  describe("encrypt and decrypt", () => {
    it("should encrypt and decrypt a string correctly", () => {
      const originalText = "sk-test-api-key-12345";
      const encrypted = encrypt(originalText);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(originalText);
    });

    it("should produce different ciphertext for same plaintext", () => {
      const originalText = "same-text";
      const encrypted1 = encrypt(originalText);
      const encrypted2 = encrypt(originalText);
      
      // IVがランダムなので、暗号文は異なるはず
      expect(encrypted1).not.toBe(encrypted2);
      
      // しかし、両方とも同じ平文に復号できる
      expect(decrypt(encrypted1)).toBe(originalText);
      expect(decrypt(encrypted2)).toBe(originalText);
    });

    it("should handle empty string", () => {
      const originalText = "";
      const encrypted = encrypt(originalText);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(originalText);
    });

    it("should handle unicode characters", () => {
      const originalText = "日本語のAPIキー🔑";
      const encrypted = encrypt(originalText);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(originalText);
    });

    it("should handle long strings", () => {
      const originalText = "a".repeat(10000);
      const encrypted = encrypt(originalText);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(originalText);
    });
  });

});

