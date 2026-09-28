import { describe, expect, it } from "vitest";
import { dictionaries, resolveLocale } from "@/content/i18n";

// Collects every key path, including array indexes, so a missing or extra
// translation shows up by name.
function keyPaths(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object") {
    return [prefix];
  }

  return Object.entries(value).flatMap(([key, child]) =>
    keyPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("dictionaries", () => {
  it("has the same keys in Thai and English", () => {
    expect(keyPaths(dictionaries.th).sort()).toEqual(keyPaths(dictionaries.en).sort());
  });

  it("has no empty strings", () => {
    for (const dict of Object.values(dictionaries)) {
      const empty = keyPaths(dict).filter((path) => {
        const leaf = path.split(".").reduce<unknown>(
          (node, key) => (node as Record<string, unknown>)[key],
          dict,
        );

        return typeof leaf === "string" && leaf.trim() === "";
      });

      expect(empty).toEqual([]);
    }
  });

  it("formats the gallery summary in each language", () => {
    expect(dictionaries.en.gallery.summary(1)).toMatch(/^1 item,/);
    expect(dictionaries.en.gallery.summary(3)).toMatch(/^3 items,/);
    expect(dictionaries.th.gallery.summary(3)).toMatch(/^3 รายการ/);
  });
});

describe("resolveLocale", () => {
  it("prefers the cookie", () => {
    expect(resolveLocale("en", "th-TH,th;q=0.9")).toBe("en");
  });

  it("falls back to the first supported Accept-Language", () => {
    expect(resolveLocale(undefined, "fr-FR,en-US;q=0.8,th;q=0.5")).toBe("en");
  });

  it("defaults to Thai", () => {
    expect(resolveLocale(undefined, "fr-FR,de;q=0.8")).toBe("th");
    expect(resolveLocale("xx", null)).toBe("th");
  });
});
