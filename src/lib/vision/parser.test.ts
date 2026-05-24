import { describe, expect, it } from "vitest";
import { parseVisionJson } from "@/lib/vision/parser";

describe("parseVisionJson", () => {
  it("parses fenced strict JSON", () => {
    const result = parseVisionJson(`\`\`\`json
{
  "books": [
    {
      "title": "Slightly Out of Focus",
      "author": "Robert Capa",
      "publisher": "",
      "language": "en",
      "spineText": "Slightly Out of Focus Robert Capa",
      "isbn": "",
      "bbox": { "x": 0.1, "y": 0.2, "width": 0.3, "height": 0.7 },
      "confidence": 0.88,
      "notes": ""
    }
  ]
}
\`\`\``);

    expect(result.books).toHaveLength(1);
    expect(result.books[0]?.title).toBe("Slightly Out of Focus");
  });

  it("fills defaults for partial provider payloads", () => {
    const result = parseVisionJson(`{"books":[{"title":"missing fields"}]}`);
    expect(result.books[0]).toMatchObject({
      title: "missing fields",
      author: "",
      bbox: { x: 0, y: 0, width: 1, height: 1 },
      confidence: 0.5
    });
  });

  it("clamps bounding boxes to the image", () => {
    const result = parseVisionJson(`{"books":[{"title":"box","bbox":{"x":0.8,"y":0.8,"width":0.8,"height":0.8}}]}`);
    expect(result.books[0]?.bbox.x).toBe(0.8);
    expect(result.books[0]?.bbox.y).toBe(0.8);
    expect(result.books[0]?.bbox.width).toBeCloseTo(0.2);
    expect(result.books[0]?.bbox.height).toBeCloseTo(0.2);
  });

  it("rejects payloads without a books array", () => {
    expect(() => parseVisionJson(`{"items":[{"title":"wrong root"}]}`)).toThrow();
  });
});
