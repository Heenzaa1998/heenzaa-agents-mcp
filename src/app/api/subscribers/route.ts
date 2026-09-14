import { NextResponse } from "next/server";
import { createSubscriber } from "@/features/subscribers/service";
import { observeRoute } from "@/server/http/observed-route";

export const runtime = "nodejs";

export const POST = observeRoute(
  {
    method: "POST",
    route: "/api/subscribers",
  },
  async function POST(request: Request) {
    const payload = await request.json();
    const subscriber = await createSubscriber(payload);

    return NextResponse.json({ data: subscriber }, { status: 201 });
  },
);
