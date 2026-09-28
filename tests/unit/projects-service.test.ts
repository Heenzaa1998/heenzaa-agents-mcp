import { describe, expect, it, vi } from "vitest";
import {
  assignGeneration,
  backfillCosts,
  getCostReport,
  getCreditRate,
  selectTake,
  setCreditRate,
  summarizeCosts,
  toBaht,
} from "@/features/projects/service";
import type { GenerationRecord } from "@/server/db/schema";

let nextId = 1;

function take(overrides: Partial<GenerationRecord> = {}): GenerationRecord {
  return {
    id: nextId++,
    kind: "video",
    operation: "generate_video",
    model: "kling-2.6/text-to-video",
    prompt: "a paper boat",
    status: "success",
    taskId: `task_${nextId}`,
    media: [],
    error: null,
    credits: 55,
    durationSeconds: 5,
    projectId: 1,
    shot: "Shot 1",
    selected: false,
    createdAt: "2026-09-28 01:00:00+00",
    updatedAt: "2026-09-28 01:00:00+00",
    ...overrides,
  };
}

describe("summarizeCosts", () => {
  it("groups takes by shot, ignoring case and spaces, and totals the costs", () => {
    const summary = summarizeCosts([
      take({ shot: "Shot 1" }),
      take({ shot: " shot 1 ", status: "fail", credits: 0 }),
      take({ shot: "SHOT 1", selected: true }),
      take({ shot: "Shot 2", selected: true, durationSeconds: 10, credits: 110 }),
      take({ shot: null, credits: 6, kind: "image", durationSeconds: null }),
    ]);

    expect(summary.shots.map((s) => [s.label, s.takes.length, s.credits])).toEqual([
      ["Shot 1", 3, 110],
      ["Shot 2", 1, 110],
      [null, 1, 6],
    ]);
    expect(summary.shots[0]?.failed).toBe(1);
    expect(summary.takes).toBe(5);
    expect(summary.credits).toBe(226);
    expect(summary.clipsUsed).toBe(2);
    expect(summary.usedSeconds).toBe(15);
    // Everything spent, including discarded takes, per second actually used.
    expect(summary.creditsPerUsedSecond).toBeCloseTo(226 / 15);
  });

  it("counts takes whose cost is not known yet, but not failures", () => {
    const summary = summarizeCosts([
      take({ credits: null, status: "pending" }),
      take({ credits: null, status: "fail" }),
    ]);

    expect(summary.unknownCredits).toBe(1);
    expect(summary.creditsPerUsedSecond).toBeNull();
  });
});

describe("rates", () => {
  it("converts credits to baht with two decimals", () => {
    expect(toBaht(55, 0.165)).toBe(9.08);
  });

  it("falls back to the default rate when none is stored", async () => {
    expect(await getCreditRate({ getSetting: vi.fn().mockResolvedValue(null) })).toBe(0.165);
    expect(await getCreditRate({ getSetting: vi.fn().mockResolvedValue("0.2") })).toBe(0.2);
  });

  it("saves a valid rate and rejects a bad one", async () => {
    const repository = { setSetting: vi.fn() };

    await setCreditRate({ rate: "0.18" }, repository);
    expect(repository.setSetting).toHaveBeenCalledWith("credit_rate_thb", "0.18");
    await expect(setCreditRate({ rate: "-1" }, repository)).rejects.toThrow();
  });
});

describe("assignGeneration", () => {
  it("creates the project on first use and keeps the shot", async () => {
    const repository = {
      findOrCreate: vi.fn().mockResolvedValue({ id: 9, name: "Tokyo" }),
      assign: vi.fn(),
    };

    await assignGeneration({ generationId: "4", project: " Tokyo ", shot: " shot 2 " }, repository);

    expect(repository.findOrCreate).toHaveBeenCalledWith("Tokyo");
    expect(repository.assign).toHaveBeenCalledWith(4, 9, "shot 2");
  });

  it("removes the item from its project when the project is empty", async () => {
    const repository = { findOrCreate: vi.fn(), assign: vi.fn() };

    await assignGeneration({ generationId: 4, project: "", shot: "shot 2" }, repository);

    expect(repository.findOrCreate).not.toHaveBeenCalled();
    expect(repository.assign).toHaveBeenCalledWith(4, null, null);
  });
});

describe("selectTake", () => {
  it("rejects a take that is not in a project", async () => {
    await expect(
      selectTake({ generationId: 3 }, { selectTake: vi.fn().mockResolvedValue(false) }),
    ).rejects.toMatchObject({ code: "take_not_in_project", statusCode: 409 });
  });
});

describe("backfillCosts", () => {
  it("stores the credits KIE reports for older work", async () => {
    const old = take({ id: 50, credits: null, durationSeconds: null });
    const repository = {
      listMissingCredits: vi.fn().mockResolvedValue([old]),
      updateCosts: vi.fn(),
    };
    const client = {
      getTask: vi.fn().mockResolvedValue({ creditsConsumed: 55, durationSeconds: 5 }),
    };

    expect(await backfillCosts(10, client, repository)).toBe(1);
    expect(repository.updateCosts).toHaveBeenCalledWith(50, { credits: 55, durationSeconds: 5 });
  });

  it("skips a task KIE cannot find without failing the rest", async () => {
    const repository = {
      listMissingCredits: vi.fn().mockResolvedValue([take({ credits: null }), take({ credits: null })]),
      updateCosts: vi.fn(),
    };
    const client = {
      getTask: vi
        .fn()
        .mockRejectedValueOnce(new Error("not found"))
        .mockResolvedValueOnce({ creditsConsumed: 6 }),
    };

    expect(await backfillCosts(10, client, repository)).toBe(1);
  });
});

describe("getCostReport", () => {
  it("reports each project and shot in credits and baht", async () => {
    const repository = {
      list: vi.fn().mockResolvedValue([{ id: 1, name: "Tokyo", createdAt: "" }]),
      listGenerations: vi.fn().mockResolvedValue([
        take({ shot: "shot 1" }),
        take({ shot: "shot 1", selected: true }),
      ]),
      getSetting: vi.fn().mockResolvedValue("0.2"),
    };

    const report = await getCostReport(
      {},
      repository,
      { getBalance: vi.fn().mockResolvedValue(824) },
    );

    expect(report).toContain("Balance: 824 credits (฿164.80)");
    expect(report).toContain("Tokyo: 110 credits (฿22.00) over 2 take(s), 0 failed.");
    expect(report).toContain("shot 1: 2 take(s)");
  });

  it("says so when the project does not exist", async () => {
    const repository = {
      list: vi.fn().mockResolvedValue([]),
      listGenerations: vi.fn().mockResolvedValue([]),
      getSetting: vi.fn().mockResolvedValue(null),
    };

    expect(
      await getCostReport({ project: "Nope" }, repository, {
        getBalance: vi.fn().mockRejectedValue(new Error("down")),
      }),
    ).toBe('No project named "Nope".');
  });
});
