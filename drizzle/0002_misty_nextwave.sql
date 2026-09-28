CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "generations" ADD COLUMN "credits" double precision;--> statement-breakpoint
ALTER TABLE "generations" ADD COLUMN "duration_seconds" integer;--> statement-breakpoint
ALTER TABLE "generations" ADD COLUMN "project_id" integer;--> statement-breakpoint
ALTER TABLE "generations" ADD COLUMN "shot" text;--> statement-breakpoint
ALTER TABLE "generations" ADD COLUMN "selected" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "generations" ADD CONSTRAINT "generations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;