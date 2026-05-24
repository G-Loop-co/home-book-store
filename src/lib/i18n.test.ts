import { describe, expect, it } from "vitest";
import { languageDirection, normalizeUiLanguage, translate } from "@/lib/i18n";

describe("i18n helpers", () => {
  it("normalizes supported and unsupported UI languages", () => {
    expect(normalizeUiLanguage("en")).toBe("en");
    expect(normalizeUiLanguage("not-supported")).toBe("zh-Hant");
  });

  it("formats translated strings and RTL direction", () => {
    expect(translate("en", "bookCount", { count: 3 })).toBe("3 books");
    expect(languageDirection("ar")).toBe("rtl");
  });
});
