import { env } from "@/server/env";
import { AppError } from "@/server/errors/app-error";
import { withSpan } from "@/server/observability/tracing";

// KIE.ai jobs API. Generation is asynchronous: create a task, then poll until
// it reaches a terminal state, then read the hosted result URLs.
const CREATE_TASK_URL = "https://api.kie.ai/api/v1/jobs/createTask";
const RECORD_INFO_URL = "https://api.kie.ai/api/v1/jobs/recordInfo";
const USER_AGENT = "heenzaa-agents-mcp/0.1 (+https://kie.ai)";

export const TEXT_TO_IMAGE_MODEL = "gpt-image-2-text-to-image";
export const IMAGE_TO_IMAGE_MODEL = "gpt-image/1.5-image-to-image";

const POLL_TIMEOUT_MS = 240_000;
const POLL_INTERVAL_MS = 3_000;

export type KieImageResult = {
  taskId: string;
  urls: string[];
  creditsConsumed?: number;
};

export type GenerateImageParams = {
  prompt: string;
  aspectRatio: string;
  resolution?: string;
  background?: string;
};

export type EditImageParams = {
  prompt: string;
  imageUrls: string[];
  aspectRatio: string;
  quality: string;
};

export type KieClient = {
  generateImage: (params: GenerateImageParams) => Promise<KieImageResult>;
  editImage: (params: EditImageParams) => Promise<KieImageResult>;
};

type KiePayload = { code?: number; msg?: string; data?: unknown };

type KieTaskData = {
  state?: string;
  resultJson?: string;
  failCode?: string;
  failMsg?: string;
  creditsConsumed?: number;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function requireApiKey(): string {
  if (!env.KIE_API_KEY) {
    throw new AppError("KIE_API_KEY is not configured on the server.", {
      code: "kie_not_configured",
      statusCode: 503,
    });
  }

  return env.KIE_API_KEY;
}

function authHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": USER_AGENT,
  };
}

async function readJson(response: Response, label: string): Promise<KiePayload> {
  if (!response.ok) {
    const detail = await response.text().catch(() => "");

    throw new AppError(
      `KIE ${label} returned HTTP ${response.status}: ${detail.slice(0, 300)}`,
      { code: "kie_http_error", statusCode: 502 },
    );
  }

  return (await response.json()) as KiePayload;
}

async function createTask(
  apiKey: string,
  model: string,
  input: Record<string, unknown>,
): Promise<string> {
  const payload = await readJson(
    await fetch(CREATE_TASK_URL, {
      method: "POST",
      headers: authHeaders(apiKey),
      body: JSON.stringify({ model, input }),
    }),
    "createTask",
  );

  const taskId = (payload.data as { taskId?: string } | undefined)?.taskId;

  if (!taskId) {
    throw new AppError("KIE createTask did not return a taskId.", {
      code: "kie_create_failed",
      statusCode: 502,
    });
  }

  return taskId;
}

function parseResultUrls(resultJson: string | undefined): string[] {
  if (!resultJson) {
    throw new AppError("KIE task succeeded but returned no result payload.", {
      code: "kie_empty_result",
      statusCode: 502,
    });
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(resultJson);
  } catch {
    throw new AppError("KIE returned a malformed resultJson payload.", {
      code: "kie_bad_result",
      statusCode: 502,
    });
  }

  const urls = (parsed as { resultUrls?: unknown }).resultUrls;

  if (
    !Array.isArray(urls) ||
    urls.length === 0 ||
    !urls.every((url): url is string => typeof url === "string")
  ) {
    throw new AppError("KIE result contained no image URLs.", {
      code: "kie_no_urls",
      statusCode: 502,
    });
  }

  return urls;
}

async function pollTask(
  apiKey: string,
  taskId: string,
): Promise<{ urls: string[]; creditsConsumed?: number }> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  const url = `${RECORD_INFO_URL}?taskId=${encodeURIComponent(taskId)}`;

  while (Date.now() <= deadline) {
    const payload = await readJson(
      await fetch(url, { headers: authHeaders(apiKey) }),
      "recordInfo",
    );
    const data = (payload.data ?? {}) as KieTaskData;

    if (data.state === "success") {
      return {
        urls: parseResultUrls(data.resultJson),
        creditsConsumed: data.creditsConsumed,
      };
    }

    if (data.state === "fail") {
      const reason = [data.failCode, data.failMsg].filter(Boolean).join(" ");

      throw new AppError(`KIE task failed: ${reason}`.trim(), {
        code: "kie_task_failed",
        statusCode: 502,
      });
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new AppError(
    `KIE task timed out after ${POLL_TIMEOUT_MS / 1000}s.`,
    { code: "kie_task_timeout", statusCode: 504 },
  );
}

async function runJob(
  model: string,
  input: Record<string, unknown>,
): Promise<KieImageResult> {
  const apiKey = requireApiKey();
  const taskId = await createTask(apiKey, model, input);
  const { urls, creditsConsumed } = await pollTask(apiKey, taskId);

  return { taskId, urls, creditsConsumed };
}

export const kieClient: KieClient = {
  generateImage(params) {
    return withSpan(
      "kie.generate_image",
      {
        attributes: {
          "app.feature": "image-generation",
          "app.operation": "generate_image",
          "kie.model": TEXT_TO_IMAGE_MODEL,
        },
      },
      async (span) => {
        const input: Record<string, unknown> = {
          prompt: params.prompt,
          aspect_ratio: params.aspectRatio,
        };

        if (params.resolution && params.resolution !== "1K") {
          input.resolution = params.resolution;
        }

        if (params.background) {
          input.background = params.background;
        }

        const result = await runJob(TEXT_TO_IMAGE_MODEL, input);

        span.setAttribute("kie.result.count", result.urls.length);

        if (typeof result.creditsConsumed === "number") {
          span.setAttribute("kie.credits_consumed", result.creditsConsumed);
        }

        return result;
      },
    );
  },

  editImage(params) {
    return withSpan(
      "kie.edit_image",
      {
        attributes: {
          "app.feature": "image-generation",
          "app.operation": "edit_image",
          "kie.model": IMAGE_TO_IMAGE_MODEL,
        },
      },
      async (span) => {
        const input: Record<string, unknown> = {
          input_urls: params.imageUrls,
          prompt: params.prompt,
          aspect_ratio: params.aspectRatio,
          quality: params.quality,
        };

        const result = await runJob(IMAGE_TO_IMAGE_MODEL, input);

        span.setAttribute("kie.input.count", params.imageUrls.length);
        span.setAttribute("kie.result.count", result.urls.length);

        if (typeof result.creditsConsumed === "number") {
          span.setAttribute("kie.credits_consumed", result.creditsConsumed);
        }

        return result;
      },
    );
  },
};
