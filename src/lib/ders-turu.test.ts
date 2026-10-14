import { describe, expect, it } from "vitest";
import { dersTuruDuzelt, uygulamaTuru } from "./schedule-data";

describe("ders türü", () => {
  it("adında 'Uygulama Alanları' geçen ders teoriktir", () => {
    expect(dersTuruDuzelt("pratik", "Psikoloji Akımları ve Psikolojinin Uygulama Alanları")).toBe("teorik");
  });
  it("numaralı anatomi uygulaması uygulamadır", () => {
    expect(dersTuruDuzelt("teorik", "Anatomi Uygulama 12")).toBe("pratik");
  });
  it("derslik adındaki 'Uygulama Salonu' türü değiştirmez", () => {
    expect(dersTuruDuzelt(undefined, "Bakteri morfolojisi", "Mikrobiyoloji AD Uygulama Salonu")).toBe("teorik");
  });
  it("admin elle verdiği tür korunur", () => {
    expect(dersTuruDuzelt("pratik", "Sağlıklı beslenme", "", true)).toBe("pratik");
  });
  it("uygulama tablosundaki satır varsayılan uygulamadır", () => {
    expect(uygulamaTuru({ ad: "Biyofizik", tur: "teorik" })).toBe("pratik");
  });
});
