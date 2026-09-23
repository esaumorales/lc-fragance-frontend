import { describe, expect, it } from "vitest";
import { cn } from "@/lib/cn";

describe("cn", () => {
  it("combina clases simples", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("ignora valores falsy", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b");
  });

  it("resuelve conflictos de tailwind quedándose con la última clase", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});
