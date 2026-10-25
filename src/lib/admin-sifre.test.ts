// @ts-nocheck -- bun:test types are not included in the app's TypeScript environment.
import { describe, expect, it } from "bun:test";
import { compare } from "bcryptjs";
import { adminYeniSifreSemasi } from "./admin-sifre";
import { adminYeniSifreHash } from "./admin-sifre.server";

describe("admin yeni hesap şifresi", () => {
  it("kısa ve karmaşıklık koşulu olmayan şifreyi kabul eder", async () => {
    expect(adminYeniSifreSemasi.parse("a")).toBe("a");
    const hash = await adminYeniSifreHash("a");
    expect(await compare("a", hash)).toBe(true);
    expect(await compare("b", hash)).toBe(false);
  });
  it("boş şifreyle şifresiz hesap oluşturmaz", () => {
    expect(adminYeniSifreSemasi.safeParse("").success).toBe(false);
  });
  it("bcrypt sınırını aşan çok baytlı şifreleri sessizce kesmez", () => {
    expect(adminYeniSifreSemasi.safeParse("ş".repeat(36)).success).toBe(true);
    expect(adminYeniSifreSemasi.safeParse("ş".repeat(37)).success).toBe(false);
  });
});