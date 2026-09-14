import { describe, expect, it, vi } from "vitest";
import { createSubscriber } from "@/features/subscribers/service";

describe("createSubscriber", () => {
  it("normalizes the payload before passing it to the repository", async () => {
    const repository = {
      create: vi.fn().mockResolvedValue({
        createdAt: "2026-03-07T00:00:00.000Z",
        email: "jane@example.com",
        id: 1,
        name: "Jane Example",
      }),
      findByEmail: vi.fn().mockResolvedValue(null),
    };

    const subscriber = await createSubscriber(
      {
        email: "  JANE@EXAMPLE.COM ",
        name: "  Jane Example  ",
      },
      repository,
    );

    expect(repository.findByEmail).toHaveBeenCalledWith("jane@example.com");
    expect(repository.create).toHaveBeenCalledWith({
      email: "jane@example.com",
      name: "Jane Example",
    });
    expect(subscriber.email).toBe("jane@example.com");
  });

  it("rejects a duplicate subscriber", async () => {
    const repository = {
      create: vi.fn(),
      findByEmail: vi.fn().mockResolvedValue({
        createdAt: "2026-03-07T00:00:00.000Z",
        email: "jane@example.com",
        id: 1,
        name: "Jane Example",
      }),
    };

    await expect(
      createSubscriber(
        {
          email: "jane@example.com",
          name: "Jane Example",
        },
        repository,
      ),
    ).rejects.toMatchObject({
      code: "subscriber_exists",
      statusCode: 409,
    });
    expect(repository.create).not.toHaveBeenCalled();
  });
});
