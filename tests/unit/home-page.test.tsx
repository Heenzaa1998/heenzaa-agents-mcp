import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomeView } from "@/components/home-view";
import { dictionaries } from "@/content/i18n";
import { toolNames } from "@/content/site";

describe("Home page", () => {
  it("introduces the studio in English and links to the gallery", () => {
    render(<HomeView dict={dictionaries.en} />);

    expect(
      screen.getByRole("heading", { level: 1, name: /make images and video just by asking/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open gallery/i })).toHaveAttribute(
      "href",
      "/gallery",
    );
  });

  it("renders in Thai", () => {
    render(<HomeView dict={dictionaries.th} />);

    expect(
      screen.getByRole("heading", { level: 1, name: /สร้างภาพและวิดีโอ/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /เปิดแกลเลอรี/ })).toBeInTheDocument();
  });

  it("lists every MCP tool and how to connect", () => {
    const { container } = render(<HomeView dict={dictionaries.en} />);
    const toolsSection = container.querySelector<HTMLElement>("#tools");

    expect(toolsSection).not.toBeNull();
    for (const name of toolNames) {
      expect(within(toolsSection!).getByText(name)).toBeInTheDocument();
    }
    expect(
      within(toolsSection!).getByRole("heading", { name: `${toolNames.length} tools, one connector.` }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /add it to claude once/i })).toBeInTheDocument();
    expect(screen.getByText(/\/api\/mcp$/)).toBeInTheDocument();
  });

  // The home page list is kept by hand, so adding a tool to the MCP route
  // without listing it here should fail loudly.
  it("lists exactly the tools the MCP route registers", () => {
    const source = readFileSync(path.join(process.cwd(), "src/app/api/mcp/route.ts"), "utf8");
    const registered = [...source.matchAll(/registerTool\(\s*"([a-z_]+)"/g)].map((match) => match[1]);

    expect(registered.length).toBeGreaterThan(0);
    expect([...toolNames].sort()).toEqual(registered.sort());
  });
});
