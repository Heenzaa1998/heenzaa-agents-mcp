import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";
import { mcpTools } from "@/content/site";

describe("Home page", () => {
  it("introduces the studio and links to the gallery", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { level: 1, name: /make images and video by just asking/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open gallery/i })).toHaveAttribute(
      "href",
      "/gallery",
    );
  });

  it("lists every MCP tool and how to connect", () => {
    const { container } = render(<Home />);
    const toolsSection = container.querySelector<HTMLElement>("#tools");

    expect(toolsSection).not.toBeNull();
    for (const tool of mcpTools) {
      expect(within(toolsSection!).getByText(tool.name)).toBeInTheDocument();
    }
    expect(screen.getByRole("heading", { name: /add it to claude once/i })).toBeInTheDocument();
    expect(screen.getByText(/\/api\/mcp$/)).toBeInTheDocument();
  });
});
