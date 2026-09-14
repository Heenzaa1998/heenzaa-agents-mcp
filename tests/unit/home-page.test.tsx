import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("Home page", () => {
  it("renders the production-ready template overview", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", {
        name: /next\.js template with tracing, metrics, and drizzle/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("OpenTelemetry")).toBeInTheDocument();
    expect(screen.getByText("Subscribers flow")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /join the list/i,
      }),
    ).toBeInTheDocument();
  });
});
