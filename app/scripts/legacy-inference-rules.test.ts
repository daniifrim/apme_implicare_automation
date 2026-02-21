/**
 * ABOUTME: Tests for legacy inference rules
 */

import { describe, it, expect } from "vitest";
import {
  inferTemplatesFromRawData,
  getInferableTemplateSlugs,
  getTemplateNameFromSlug,
  SLUG_TO_NAME,
} from "./legacy-inference-rules";

describe("legacy-inference-rules", () => {
  describe("inferTemplatesFromRawData", () => {
    it("should return empty array for empty rawData", () => {
      const result = inferTemplatesFromRawData({});
      expect(result).toEqual([]);
    });

    it("should return empty array for null rawData", () => {
      const result = inferTemplatesFromRawData(null);
      expect(result).toEqual([]);
    });

    it("should infer mission template when user is interested", () => {
      const rawData = {
        "Vrei să fii informat(ă) despre oportunitățile de a merge pe câmpul de misiune?":
          "Da, pe termen scurt (2-4 săptămâni)",
      };
      const result = inferTemplatesFromRawData(rawData);
      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe("info-misiune-pe-termen-scurt-apme");
    });

    it("should skip mission template when user is excluded", () => {
      const rawData = {
        "Vrei să fii informat(ă) despre oportunitățile de a merge pe câmpul de misiune?":
          "Nu acum, poate mai târziu",
      };
      const result = inferTemplatesFromRawData(rawData);
      expect(result).toHaveLength(0);
    });

    it("should infer missionary prayer template", () => {
      const rawData = {
        "Vrei să adopți în rugăciune un misionar sau un popor neatins cu Evanghelia ?":
          "Misionar",
        "Pentru ce misionar vrei să te rogi?": "Florin & Daniela (Uganda)",
      };
      const result = inferTemplatesFromRawData(rawData);
      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe("info-rugaciune-pentru-misionari");
    });

    it("should skip prayer template when missionary selection is empty", () => {
      const rawData = {
        "Vrei să adopți în rugăciune un misionar sau un popor neatins cu Evanghelia ?":
          "Misionar",
        "Pentru ce misionar vrei să te rogi?": "",
      };
      const result = inferTemplatesFromRawData(rawData);
      expect(result).toHaveLength(0);
    });

    it("should infer ethnic group prayer template", () => {
      const rawData = {
        "Vrei să adopți în rugăciune un misionar sau un popor neatins cu Evanghelia ?":
          "Popor neatins cu Evanghelia",
        "Pentru care popor neatins vrei să te rogi?": "Fulani/Sokoto (Niger)",
      };
      const result = inferTemplatesFromRawData(rawData);
      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe("info-rugaciune-pentru-grup-etnic");
    });

    it("should infer camp template", () => {
      const rawData = {
        "Vrei să primești informații despre taberele de misiune APME?":
          "Nu am participat, doresc informații",
      };
      const result = inferTemplatesFromRawData(rawData);
      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe("info-tabere-misiune-apme");
    });

    it("should skip camp template for past participants", () => {
      const rawData = {
        "Vrei să primești informații despre taberele de misiune APME?":
          "Am participat, doresc să mai fiu informat și pe viitor",
      };
      const result = inferTemplatesFromRawData(rawData);
      expect(result).toHaveLength(0);
    });

    it("should infer Kairos course template", () => {
      const rawData = {
        "Ești interesat(ă) să participi la anumite cursuri de pregătire când vor fi disponibile în zona ta?":
          "Cursul Kairos",
      };
      const result = inferTemplatesFromRawData(rawData);
      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe("info-despre-cursul-kairos");
    });

    it("should infer Mobilizează course template", () => {
      const rawData = {
        "Ești interesat(ă) să participi la anumite cursuri de pregătire când vor fi disponibile în zona ta?":
          "Cursul Mobilizează",
      };
      const result = inferTemplatesFromRawData(rawData);
      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe("info-despre-cursul-mobilizeaza");
    });

    it("should infer donation template when TRUE", () => {
      const rawData = {
        "Dorești să ajuți financiar lucrările și misionarii APME?": "TRUE",
      };
      const result = inferTemplatesFromRawData(rawData);
      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe("info-donatii-apme");
    });

    it("should infer donation template when Da", () => {
      const rawData = {
        "Dorești să ajuți financiar lucrările și misionarii APME?": "Da",
      };
      const result = inferTemplatesFromRawData(rawData);
      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe("info-donatii-apme");
    });

    it("should skip donation template when false", () => {
      const rawData = {
        "Dorești să ajuți financiar lucrările și misionarii APME?": "FALSE",
      };
      const result = inferTemplatesFromRawData(rawData);
      expect(result).toHaveLength(0);
    });

    it("should infer volunteer template when TRUE", () => {
      const rawData = {
        "Dorești să te implici ca voluntar APME?": "TRUE",
      };
      const result = inferTemplatesFromRawData(rawData);
      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe("info-voluntariat-apme");
    });

    it("should infer multiple templates", () => {
      const rawData = {
        "Vrei să fii informat(ă) despre oportunitățile de a merge pe câmpul de misiune?":
          "Da, pe termen lung",
        "Vrei să primești informații despre taberele de misiune APME?":
          "Nu am participat, doresc informații",
        "Ești interesat(ă) să participi la anumite cursuri de pregătire când vor fi disponibile în zona ta?":
          "Cursul Kairos",
        "Dorești să ajuți financiar lucrările și misionarii APME?": "TRUE",
        "Dorești să te implici ca voluntar APME?": "TRUE",
      };
      const result = inferTemplatesFromRawData(rawData);
      expect(result).toHaveLength(5);
      const slugs = result.map((r) => r.slug);
      expect(slugs).toContain("info-misiune-pe-termen-scurt-apme");
      expect(slugs).toContain("info-tabere-misiune-apme");
      expect(slugs).toContain("info-despre-cursul-kairos");
      expect(slugs).toContain("info-donatii-apme");
      expect(slugs).toContain("info-voluntariat-apme");
    });

    it("should deduplicate templates by slug", () => {
      const rawData = {
        "Dorești să ajuți financiar lucrările și misionarii APME?": "TRUE",
      };
      const result1 = inferTemplatesFromRawData(rawData);
      const result2 = inferTemplatesFromRawData(rawData);
      expect(result1).toHaveLength(1);
      expect(result2).toHaveLength(1);
    });
  });

  describe("getInferableTemplateSlugs", () => {
    it("should return all inferable slugs", () => {
      const slugs = getInferableTemplateSlugs();
      expect(slugs).toContain("info-misiune-pe-termen-scurt-apme");
      expect(slugs).toContain("info-rugaciune-pentru-misionari");
      expect(slugs).toContain("info-donatii-apme");
      expect(slugs.length).toBe(Object.keys(SLUG_TO_NAME).length);
    });
  });

  describe("getTemplateNameFromSlug", () => {
    it("should return name for known slug", () => {
      const name = getTemplateNameFromSlug("info-donatii-apme");
      expect(name).toBe("Info Donații APME");
    });

    it("should return null for unknown slug", () => {
      const name = getTemplateNameFromSlug("unknown-slug");
      expect(name).toBeNull();
    });
  });
});
