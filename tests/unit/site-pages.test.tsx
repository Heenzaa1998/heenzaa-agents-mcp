import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import GuidePage from "@/app/guide/page";
import OperationsPage from "@/app/operations/page";

describe("Guide page", () => {
  it("renders the usage guide content", () => {
    render(<GuidePage />);

    expect(
      screen.getByRole("heading", {
        name: /use the project confidently once the app is live/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("/api/subscribers")).toBeInTheDocument();
    expect(screen.getByText("Daily workflow")).toBeInTheDocument();
  });
});

describe("Operations page", () => {
  it("renders the runbook content", () => {
    render(<OperationsPage />);

    expect(
      screen.getByRole("heading", {
        name: /operate the live system with health, metrics, logs, and traces/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("OTEL_TRACE_IGNORE_PATHS")).toBeInTheDocument();
    expect(screen.getByText("Tempo and Grafana workflow")).toBeInTheDocument();
  });
});
