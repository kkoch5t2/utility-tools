import { describe, expect, it } from "vitest";
import { calculateTargetSize } from "../../src/engines/image/resize-image";

describe("calculateTargetSize", () => {
  it("1920x1080を長辺1000pxへ縮小する", () => {
    expect(calculateTargetSize(1920, 1080, "long-edge", 1000, false)).toEqual({ width: 1000, height: 563 });
  });
  it("拡大禁止時は小さい画像を拡大しない", () => {
    expect(calculateTargetSize(640, 480, "width", 1000, false)).toEqual({ width: 640, height: 480 });
  });
  it("高さ指定でもアスペクト比を維持する", () => {
    expect(calculateTargetSize(1200, 800, "height", 400, false)).toEqual({ width: 600, height: 400 });
  });
});
