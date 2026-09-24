CREATE TABLE "generations" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"operation" text NOT NULL,
	"model" text NOT NULL,
	"prompt" text NOT NULL,
	"status" text NOT NULL,
	"task_id" text,
	"media" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "generations_task_id_unique" UNIQUE("task_id")
);
