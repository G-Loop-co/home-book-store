import { afterEach, describe, expect, it } from "vitest";
import { configuredVisionProvider } from "@/lib/vision";

const originalProvider = process.env.VISION_PROVIDER;

afterEach(() => {
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
});
