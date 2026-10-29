import { describe, expect, it } from "vitest";
import { wordsToDigits } from "@/lib/numberWords";

describe("wordsToDigits", () => {
  const cases: [string, string][] = [
    ["lima ribu", "5.000"],
    ["sepuluh ribu", "10.000"],
    ["sebelas ribu", "11.000"],
    ["dua belas ribu", "12.000"],
    ["lima belas ribu", "15.000"],
    ["dua puluh ribu", "20.000"],
    ["dua puluh lima ribu", "25.000"],
    ["tiga puluh lima ribu", "35.000"],
    ["sembilan puluh sembilan ribu", "99.000"],
    ["seratus ribu", "100.000"],
    ["seratus lima puluh ribu", "150.000"],
    ["dua ratus ribu", "200.000"],
    ["dua ratus lima puluh ribu", "250.000"],
    ["sembilan ratus sembilan puluh sembilan ribu", "999.000"],
    ["seribu", "1.000"],
    ["seribu lima ratus", "1.500"],
    ["tiga ribu lima ratus", "3.500"],
    ["lima ribu lima ratus", "5.500"],
    ["satu juta", "1.000.000"],
    ["sejuta", "1.000.000"],
    ["dua juta", "2.000.000"],
    ["setengah juta", "500.000"],
    ["satu setengah juta", "1.500.000"],
    ["dua setengah juta", "2.500.000"],
    ["dua setengah ribu", "2.500"],
    ["satu juta lima ratus ribu", "1.500.000"],
    ["dua juta lima ratus lima puluh ribu", "2.550.000"],
    ["seratus juta", "100.000.000"],
    ["empat juta", "4.000.000"],
  ];

  it.each(cases)("reads %j as %j", (words, digits) => {
    expect(wordsToDigits(words)).toBe(digits);
  });

  it("works inside a sentence and keeps the other words", () => {
    expect(wordsToDigits("kopi dua puluh lima ribu")).toBe("kopi 25.000");
    expect(wordsToDigits("makan siang tiga puluh lima ribu di warteg")).toBe("makan siang 35.000 di warteg");
    expect(wordsToDigits("kopi dua puluh lima ribu, parkir lima ribu")).toBe("kopi 25.000, parkir 5.000");
    expect(wordsToDigits("kopi lima ribu parkir dua ribu")).toBe("kopi 5.000 parkir 2.000");
  });

  it("ignores case", () => {
    expect(wordsToDigits("Kopi Dua Puluh Lima Ribu")).toBe("Kopi 25.000");
    expect(wordsToDigits("LIMA RIBU")).toBe("5.000");
  });

  it("leaves a quantity or a small number as words", () => {
    expect(wordsToDigits("dua kopi")).toBe("dua kopi");
    expect(wordsToDigits("beli tiga nasi")).toBe("beli tiga nasi");
    expect(wordsToDigits("dua puluh lima")).toBe("dua puluh lima");
    expect(wordsToDigits("seratus")).toBe("seratus");
  });

  it("leaves a quantity next to an amount alone", () => {
    expect(wordsToDigits("dua kopi lima ribu")).toBe("dua kopi 5.000");
    expect(wordsToDigits("lima ribu dua kopi")).toBe("5.000 dua kopi");
  });

  it("keeps a bare digit after the amount as a quantity", () => {
    expect(wordsToDigits("lima ribu dua")).toBe("5.000 dua");
    expect(wordsToDigits("lima ribu lima ratus lima")).toBe("5.500 lima");
    expect(wordsToDigits("seribu lima ratus dua kopi")).toBe("1.500 dua kopi");
    expect(wordsToDigits("lima ribu dua belas")).toBe("5.012");
    expect(wordsToDigits("dua ribu tiga puluh")).toBe("2.030");
  });

  it("does not touch words that only contain a number word", () => {
    expect(wordsToDigits("satuan 10rb")).toBe("satuan 10rb");
    expect(wordsToDigits("ribuan orang")).toBe("ribuan orang");
    expect(wordsToDigits("jutaan rupiah")).toBe("jutaan rupiah");
    expect(wordsToDigits("sebelah kantor lima ribu")).toBe("sebelah kantor 5.000");
    expect(wordsToDigits("tiga ribuan")).toBe("tiga ribuan");
  });

  it("leaves digits alone", () => {
    expect(wordsToDigits("kopi 25rb")).toBe("kopi 25rb");
    expect(wordsToDigits("bensin 25.000")).toBe("bensin 25.000");
    expect(wordsToDigits("")).toBe("");
  });

  it("leaves words that do not make a number", () => {
    expect(wordsToDigits("lima lima ribu")).toBe("lima lima ribu");
    expect(wordsToDigits("belas ribu")).toBe("belas ribu");
    expect(wordsToDigits("lima seribu")).toBe("lima seribu");
  });

  it("is safe to run twice", () => {
    const once = wordsToDigits("kopi dua puluh lima ribu");
    expect(wordsToDigits(once)).toBe(once);
  });
});
