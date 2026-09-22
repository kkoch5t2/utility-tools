import { describe, expect, it } from "vitest";
import { formatBytes } from "../../src/core/files/file-size";

describe("formatBytes", () => {
  it("容量を読みやすく表示する", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1024)).toBe("1.00 KB");
    expect(formatBytes(10 * 1024 * 1024)).toBe("10.0 MB");
  });
});
