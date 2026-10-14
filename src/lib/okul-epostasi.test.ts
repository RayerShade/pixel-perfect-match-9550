// @ts-nocheck -- bun test dosyası (bun:test türleri projede yok)
import { describe, expect, it } from "bun:test";
import { okulEpostasiMi } from "./okul-epostasi";

describe("kurum e-postası eşleşmesi", () => {
  it("büyük harfli kurum adresi tanınır", () => {
    expect(okulEpostasiMi("A.B@OGR.IU.EDU.TR")).toBe(true);
  });
  it("sondaki boşluk sonucu değiştirmez", () => {
    expect(okulEpostasiMi("a@ogr.iu.edu.tr ")).toBe(true);
  });
  it("kişisel e-posta kabul edilmez", () => {
    expect(okulEpostasiMi("a@gmail.com")).toBe(false);
  });
  it("uzantıyı taklit eden adres kabul edilmez", () => {
    expect(okulEpostasiMi("a@evil-ogr.iu.edu.tr")).toBe(false);
    expect(okulEpostasiMi("a@ogr.iu.edu.trx")).toBe(false);
  });
  it("boş adres kabul edilmez", () => {
    expect(okulEpostasiMi("")).toBe(false);
  });
});
