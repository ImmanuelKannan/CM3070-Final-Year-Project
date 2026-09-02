CREATE TABLE "consent_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"reference_id" text NOT NULL,
	"client_id" text NOT NULL,
	"canonical_query" text NOT NULL,
	"canonical_scopes" jsonb NOT NULL,
	"decision" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "consent_decisions_decision_check" CHECK ("consent_decisions"."decision" in ('approved', 'rejected'))
);
--> statement-breakpoint
ALTER TABLE "consent_decisions" ADD CONSTRAINT "consent_decisions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_decisions" ADD CONSTRAINT "consent_decisions_client_id_oauth_client_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_client"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "consent_decisions_user_reference_idx" ON "consent_decisions" USING btree ("user_id","reference_id");--> statement-breakpoint
INSERT INTO "consent_decisions" ("user_id", "client_id", "reference_id", "canonical_query", "canonical_scopes", "decision", "created_at")
SELECT g."user_id",
       g."client_id",
       g."reference_id",
       g."canonical_query",
       COALESCE(
         (SELECT jsonb_agg(scope ORDER BY scope)
          FROM (SELECT DISTINCT value AS scope FROM jsonb_array_elements_text(g."scopes")) AS s),
         '[]'::jsonb
       ),
       'approved',
       g."created_at"
FROM "consent_grants" g
ON CONFLICT ("user_id", "reference_id") DO NOTHING;
