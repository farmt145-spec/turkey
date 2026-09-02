import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./passwords";

describe("local password authentication", () => {
  it("stores a salted scrypt hash and verifies only the original password", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    expect(hash).toMatch(/^scrypt\$[a-f0-9]+\$[a-f0-9]+$/);
    await expect(verifyPassword("correct-horse-battery-staple", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });

  it("rejects malformed stored hashes", async () => {
    await expect(verifyPassword("any-password", "not-a-password-hash")).resolves.toBe(false);
  });
});
