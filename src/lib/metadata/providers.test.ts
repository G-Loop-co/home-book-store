import { describe, expect, it } from "vitest";
import {
  isbnTwProductUrls,
  kingstoneProductUrls,
  mapIsbnTwProduct,
  mapKingstoneProduct,
  searchQueries
} from "@/lib/metadata/providers";
import type { VisionBook } from "@/lib/types";

const baseInput: VisionBook = {
  title: "攝相現象學",
  author: "",
  publisher: "",
  language: "Traditional Chinese",
  spineText: "攝相現象學",
  isbn: "",
  bbox: { x: 0, y: 0, width: 1, height: 1 },
  confidence: 0.9,
  notes: ""
};

describe("metadata provider query generation", () => {
  it("creates clean Traditional Chinese title queries from noisy spine text", () => {
    const input: VisionBook = {
      title: "藝術癮類 01: 攝相 現象學",
      author: "",
      publisher: "一O四六",
      language: "Traditional Chinese",
      spineText: "藝術癮類\n01\n攝\n相\n現象學\n（修訂版）\n一O四六",
      isbn: "",
      bbox: { x: 0, y: 0, width: 1, height: 1 },
      confidence: 0.9,
      notes: ""
    };

    const queries = searchQueries(input);

    expect(queries).toContain("攝相現象學");
    expect(queries.indexOf("攝相現象學")).toBeLessThan(3);
  });

  it("filters publisher and edition-only spine lines from lookup queries", () => {
    const input: VisionBook = {
      title: "野外观鸟手册",
      author: "",
      publisher: "",
      language: "Simplified Chinese",
      spineText: "野外观鸟手册\n（第二版）",
      isbn: "",
      bbox: { x: 0, y: 0, width: 1, height: 1 },
      confidence: 0.9,
      notes: ""
    };

    expect(searchQueries(input)).toContain("野外观鸟手册");
    expect(searchQueries(input)).not.toContain("（第二版）");
  });

  it("filters person-like English author lines from lookup queries", () => {
    const input: VisionBook = {
      title: "失焦",
      author: "羅伯·卡帕",
      publisher: "",
      language: "Traditional Chinese",
      spineText: "Robert Capa\nSlightly Out of Focus\n失焦",
      isbn: "",
      bbox: { x: 0, y: 0, width: 1, height: 1 },
      confidence: 0.9,
      notes: ""
    };

    const queries = searchQueries(input);

    expect(queries).toContain("Slightly Out of Focus");
    expect(queries).not.toContain("Robert Capa");
  });

  it("adds common CJK vision correction variants", () => {
    const input: VisionBook = {
      title: "男孩，颶鼠，狐狸與馬",
      author: "查理·麥克斯",
      publisher: "天下",
      language: "Traditional Chinese",
      spineText: "男孩，颶鼠，狐狸與馬\n查理·麥克斯 著\n天下",
      isbn: "",
      bbox: { x: 0, y: 0, width: 1, height: 1 },
      confidence: 0.95,
      notes: ""
    };

    const queries = searchQueries(input);

    expect(queries).toContain("男孩，鼴鼠，狐狸與馬");
    expect(queries).not.toContain("天下");
  });
});

describe("free scrape metadata providers", () => {
  it("extracts ISBN.tw product links and maps JSON-LD", () => {
    const searchHtml = '<main><a href="/9786269812325">攝相現象學</a></main>';
    const productHtml = `
      <html>
        <head>
          <meta name="description" content="攝相現象學修訂版 作者：張燦輝" />
          <script type="application/ld+json">
            {
              "@context": "http://schema.org/",
              "@type": "Product",
              "url": "https://ISBN.tw/9786269812325",
              "isbn": "9786269812325",
              "name": "攝相現象學修訂版",
              "image": "https://ISBN.tw/9786269812325.jpg",
              "author": [{"@type": "Person", "name": "張燦輝"}],
              "publisher": [{"@type": "Organization", "name": "2046"}],
              "datePublished": "2024-06-19"
            }
          </script>
        </head>
      </html>
    `;

    expect(isbnTwProductUrls(searchHtml)).toEqual(["https://isbn.tw/9786269812325"]);
    expect(mapIsbnTwProduct(productHtml, "https://isbn.tw/9786269812325", baseInput)).toMatchObject({
      title: "攝相現象學修訂版",
      authors: ["張燦輝"],
      publisher: "2046",
      publishedDate: "2024-06-19",
      isbn13: "9786269812325",
      source: "isbn_tw"
    });
  });

  it("extracts KingStone product links and maps detail metadata", () => {
    const searchHtml = `
      <a href="/basic/2011920820430/?lid=home_keyword">熱門商品</a>
      <a href="/basic/2019500064526/?lid=search&amp;kw=x">攝相現象學修訂版</a>
    `;
    const productHtml = `
      <html>
        <head>
          <title>攝相現象學修訂版－金石堂</title>
          <meta name="description" content="攝相現象學修訂版 | 作者: 張燦輝 | 2046 2024/06/19出版 | 類別: 藝術設計 | ISBN: 9786269812325 | 語言: 中文繁體">
          <meta property="og:image" content="https://cdn.kingstone.com.tw/book.jpg">
        </head>
      </html>
    `;

    expect(kingstoneProductUrls(searchHtml)).toEqual(["https://www.kingstone.com.tw/basic/2019500064526/"]);
    expect(mapKingstoneProduct(productHtml, "https://www.kingstone.com.tw/basic/2019500064526/", baseInput)).toMatchObject({
      title: "攝相現象學修訂版",
      authors: ["張燦輝"],
      publisher: "2046",
      publishedDate: "2024-06-19",
      isbn13: "9786269812325",
      coverUrl: "https://cdn.kingstone.com.tw/book.jpg",
      source: "kingstone"
    });
  });
});
