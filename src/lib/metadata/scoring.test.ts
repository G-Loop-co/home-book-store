import { describe, expect, it } from "vitest";
import { scoreCandidate, titleSimilarity } from "@/lib/metadata/scoring";
import type { MetadataCandidate, VisionBook } from "@/lib/types";

const vision: VisionBook = {
  title: "男孩，鼴鼠，狐狸與馬",
  author: "查理 麥克斯",
  publisher: "",
  language: "zh-Hant",
  spineText: "男孩，鼴鼠，狐狸與馬 查理 麥克斯",
  isbn: "",
  bbox: { x: 0, y: 0, width: 0.2, height: 1 },
  confidence: 0.9,
  notes: ""
};

describe("metadata scoring", () => {
  it("scores exact normalized titles higher than unrelated titles", () => {
    expect(titleSimilarity("Slightly Out of Focus", "Slightly Out of Focus")).toBe(1);
    expect(titleSimilarity("Slightly Out of Focus", "Wild Birds")).toBeLessThan(0.5);
  });

  it("scores Chinese title candidates", () => {
    const candidate: Omit<MetadataCandidate, "score"> = {
      id: "test",
      title: "男孩、鼴鼠、狐狸與馬",
      authors: ["查理 麥克斯"],
      publisher: "",
      publishedDate: "",
      isbn10: "",
      isbn13: "",
      coverUrl: "",
      description: "",
      source: "manual",
      sourceId: ""
    };

    expect(scoreCandidate(vision, candidate)).toBeGreaterThan(0.75);
  });

  it("scores noisy CJK title prefixes without losing the real title", () => {
    expect(titleSimilarity("藝術癮類 01: 攝相 現象學", "攝相現象學")).toBeGreaterThan(0.8);
  });

  it("scores candidate titles with edition suffixes", () => {
    const candidate: Omit<MetadataCandidate, "score"> = {
      id: "test",
      title: "攝相現象學修訂版",
      authors: ["張燦輝"],
      publisher: "2046",
      publishedDate: "2024-06-19",
      isbn10: "",
      isbn13: "9786269812325",
      coverUrl: "",
      description: "",
      source: "manual",
      sourceId: ""
    };

    expect(
      scoreCandidate(
        {
          title: "藝術癮類 01: 攝相 現象學",
          author: "",
          publisher: "一O四六",
          language: "zh-Hant",
          spineText: "藝術癮類\n01\n攝\n相\n現象學\n（修訂版）\n一O四六",
          isbn: "",
          bbox: { x: 0, y: 0, width: 1, height: 1 },
          confidence: 0.9,
          notes: ""
        },
        candidate
      )
    ).toBeGreaterThan(0.55);
  });

  it("does not treat short CJK substrings as strong title matches", () => {
    expect(titleSimilarity("失焦", "錯失焦慮的性別差異")).toBeLessThan(0.5);
  });

  it("matches common Traditional, Simplified, and vision-confused title variants", () => {
    expect(titleSimilarity("男孩，颶鼠，狐狸與馬", "男孩、鼹鼠、狐狸和马")).toBe(1);
  });

  it("does not score edition-only spine lines as the book title", () => {
    const candidate: Omit<MetadataCandidate, "score"> = {
      id: "test",
      title: "泛函分析（第二版）",
      authors: [],
      publisher: "",
      publishedDate: "",
      isbn10: "",
      isbn13: "9787040496383",
      coverUrl: "",
      description: "",
      source: "manual",
      sourceId: ""
    };

    expect(
      scoreCandidate(
        {
          title: "野外观鸟手册",
          author: "",
          publisher: "",
          language: "zh-Hans",
          spineText: "野外观鸟手册\n（第二版）",
          isbn: "",
          bbox: { x: 0, y: 0, width: 1, height: 1 },
          confidence: 0.9,
          notes: ""
        },
        candidate
      )
    ).toBeLessThan(0.3);
  });
});
