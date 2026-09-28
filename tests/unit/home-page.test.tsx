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
    expect(screen.getByRole("heading", { name: /add it to claude once/i })).toBeInTheDocument();
    expect(screen.getByText(/\/api\/mcp$/)).toBeInTheDocument();
  });
});
