import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDbForTests } from "@/lib/db";
import { configuredVisionProvider } from "@/lib/vision";

const originalProvider = process.env.VISION_PROVIDER;

beforeEach(() => {
  closeDbForTests();
  process.env.BOOK_STORE_DB_PATH = `.data/test-${randomUUID()}.sqlite`;
});

afterEach(() => {
  closeDbForTests();
  if (originalProvider === undefined) {
    delete process.env.VISION_PROVIDER;
  } else {
    process.env.VISION_PROVIDER = originalProvider;
  }
});

describe("configuredVisionProvider", () => {
  it("defaults to OpenCode Go", () => {
    delete process.env.VISION_PROVIDER;
    expect(configuredVisionProvider()).toBe("opencode-go");
  });

  it("allows OpenAI fallback", () => {
    process.env.VISION_PROVIDER = "openai";
    expect(configuredVisionProvider()).toBe("openai");
  });

  it("allows Grok, Gemini, and Claude providers", () => {
    process.env.VISION_PROVIDER = "grok";
    expect(configuredVisionProvider()).toBe("grok");

    process.env.VISION_PROVIDER = "gemini";
    closeDbForTests();
    expect(configuredVisionProvider()).toBe("gemini");

    process.env.VISION_PROVIDER = "claude";
    closeDbForTests();
    expect(configuredVisionProvider()).toBe("claude");
  });

  it("normalizes gork to Grok", () => {
    process.env.VISION_PROVIDER = "gork";
    expect(configuredVisionProvider()).toBe("grok");
  });
});
