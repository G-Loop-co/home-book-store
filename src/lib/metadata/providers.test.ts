import { describe, expect, it } from "vitest";
import {
  isbnTwProductUrls,
  kingstoneProductUrls,
  mapIsbnDbBook,
  mapIsbnTwProduct,
  mapKingstoneProduct,
  mapLibraryOfCongressResult,
  mapNaverBookItem,
  mapOpenBdBook,
  mapRakutenBookItem,
  mapSruDcRecord,
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

  it("maps Library of Congress JSON results", () => {
    const candidate = mapLibraryOfCongressResult(
      {
        id: "https://www.loc.gov/item/01010101/",
        title: "Invisible Cities",
        contributor_names: ["Italo Calvino"],
        publisher: ["Harcourt Brace Jovanovich"],
        date: "1974",
        isbn: ["9780156453806"],
        image_url: ["http://example.com/small.jpg", "http://example.com/large.jpg"],
        description: ["A city catalogue."]
      },
      {
        ...baseInput,
        title: "Invisible Cities",
        spineText: "Invisible Cities Italo Calvino"
      }
    );

    expect(candidate).toMatchObject({
      title: "Invisible Cities",
      authors: ["Italo Calvino"],
      publisher: "Harcourt Brace Jovanovich",
      publishedDate: "1974",
      isbn13: "9780156453806",
      coverUrl: "https://example.com/large.jpg",
      description: "A city catalogue.",
      source: "library_of_congress"
    });
  });

  it("maps ISBNdb API books", () => {
    const candidate = mapIsbnDbBook(
      {
        title: "Slightly Out of Focus",
        authors: ["Robert Capa"],
        publisher: "Modern Library",
        date_published: "2001-09-04T00:00:00.000Z",
        isbn: "0375753966",
        isbn13: "9780375753961",
        image: "http://example.com/capa.jpg",
        overview: "A photographer memoir."
      },
      {
        ...baseInput,
        title: "Slightly Out of Focus",
        spineText: "Slightly Out of Focus Robert Capa"
      }
    );

    expect(candidate).toMatchObject({
      title: "Slightly Out of Focus",
      authors: ["Robert Capa"],
      publisher: "Modern Library",
      publishedDate: "2001-09-04",
      isbn10: "0375753966",
      isbn13: "9780375753961",
      coverUrl: "https://example.com/capa.jpg",
      description: "A photographer memoir.",
      source: "isbn_db"
    });
  });

  it("maps Naver Books JSON results with HTML cleanup and both ISBNs", () => {
    const candidate = mapNaverBookItem(
      {
        title: "<b>불곰</b>의 주식투자 불패공식",
        author: "불곰 박선목",
        publisher: "부키",
        pubdate: "20160729",
        isbn: "8960515523 9788960515529",
        image: "http://bookthumb.phinf.naver.net/cover.jpg",
        description: "잘못된 <b>주식</b>투자 습관을 버리다.",
        link: "https://search.shopping.naver.com/book/catalog/1"
      },
      {
        ...baseInput,
        title: "불곰의 주식투자 불패공식",
        spineText: "불곰의 주식투자 불패공식"
      }
    );

    expect(candidate).toMatchObject({
      title: "불곰의 주식투자 불패공식",
      authors: ["불곰 박선목"],
      publisher: "부키",
      publishedDate: "2016-07-29",
      isbn10: "8960515523",
      isbn13: "9788960515529",
      coverUrl: "https://bookthumb.phinf.naver.net/cover.jpg",
      description: "잘못된 주식투자 습관을 버리다.",
      source: "naver_books"
    });
  });

  it("maps Rakuten Books JSON results", () => {
    const candidate = mapRakutenBookItem(
      {
        title: "こころ",
        author: "夏目漱石",
        publisherName: "新潮社",
        salesDate: "2004年05月",
        isbn: "9784101001548",
        largeImageUrl: "http://thumbnail.image.rakuten.co.jp/book.jpg",
        itemCaption: "夏目漱石の代表作。",
        itemUrl: "https://books.rakuten.co.jp/rb/1/"
      },
      {
        ...baseInput,
        title: "こころ",
        spineText: "こころ 夏目漱石"
      }
    );

    expect(candidate).toMatchObject({
      title: "こころ",
      authors: ["夏目漱石"],
      publisher: "新潮社",
      publishedDate: "2004-05",
      isbn13: "9784101001548",
      coverUrl: "https://thumbnail.image.rakuten.co.jp/book.jpg",
      description: "夏目漱石の代表作。",
      source: "rakuten_books"
    });
  });

  it("maps openBD Japanese ISBN results", () => {
    const candidate = mapOpenBdBook(
      {
        summary: {
          isbn: "9784101001548",
          title: "こころ",
          author: "夏目漱石",
          publisher: "新潮社",
          pubdate: "200405",
          cover: "http://example.com/kokoro.jpg"
        }
      },
      {
        ...baseInput,
        title: "こころ",
        spineText: "こころ 夏目漱石"
      }
    );

    expect(candidate).toMatchObject({
      title: "こころ",
      authors: ["夏目漱石"],
      publisher: "新潮社",
      publishedDate: "2004-05",
      isbn13: "9784101001548",
      coverUrl: "https://example.com/kokoro.jpg",
      source: "openbd"
    });
  });

  it("maps SRU Dublin Core records for national libraries", () => {
    const record = `
      <srw:record>
        <srw:recordData>
          <oai_dc:dc>
            <dc:title>Le Petit Prince</dc:title>
            <dc:creator>Antoine de Saint-Exupéry</dc:creator>
            <dc:publisher>Gallimard</dc:publisher>
            <dc:date>1999</dc:date>
            <dc:identifier>ISBN 9782070408504</dc:identifier>
            <dc:identifier>ark:/12148/cb123</dc:identifier>
            <dc:description>Conte philosophique.</dc:description>
          </oai_dc:dc>
        </srw:recordData>
      </srw:record>
    `;

    expect(
      mapSruDcRecord(record, "bnf", {
        ...baseInput,
        title: "Le Petit Prince",
        spineText: "Le Petit Prince"
      })
    ).toMatchObject({
      title: "Le Petit Prince",
      authors: ["Antoine de Saint-Exupéry"],
      publisher: "Gallimard",
      publishedDate: "1999",
      isbn13: "9782070408504",
      description: "Conte philosophique.",
      source: "bnf",
      sourceId: "ark:/12148/cb123"
    });
  });
});
