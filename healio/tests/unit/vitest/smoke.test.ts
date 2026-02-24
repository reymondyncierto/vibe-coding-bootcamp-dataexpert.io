import { describe, expect, it } from "vitest";

describe("vitest harness", () => {
  it("runs with tsconfig alias support", async () => {
    const mod = await import("@/lib/utils");
    expect(mod.sanitizeFilenameSegment("Hello Clinic!")).toBe("hello-clinic");
  });
});

