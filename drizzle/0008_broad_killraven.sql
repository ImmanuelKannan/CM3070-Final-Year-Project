CREATE TABLE "consent_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"reference_id" text NOT NULL,
	"client_id" text NOT NULL,
	"client_name" text NOT NULL,
	"scopes" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "consent_decisions" DROP CONSTRAINT "consent_decisions_client_id_oauth_client_client_id_fk";
--> statement-breakpoint
ALTER TABLE "consent_grants" DROP CONSTRAINT "consent_grants_client_id_oauth_client_client_id_fk";
--> statement-breakpoint
ALTER TABLE "consent_revocations" DROP CONSTRAINT "consent_revocations_client_id_oauth_client_client_id_fk";
--> statement-breakpoint
ALTER TABLE "consent_revocations" ADD COLUMN "client_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "consent_revocations" ADD COLUMN "scopes" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "consent_requests" ADD CONSTRAINT "consent_requests_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_requests" ADD CONSTRAINT "consent_requests_client_id_oauth_client_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_client"("client_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "consent_requests_user_reference_idx" ON "consent_requests" USING btree ("user_id","reference_id");--> statement-breakpoint
CREATE INDEX "consent_requests_user_created_at_idx" ON "consent_requests" USING btree ("user_id","created_at");--> statement-breakpoint
ALTER TABLE "consent_decisions" ADD CONSTRAINT "consent_decisions_client_id_oauth_client_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_client"("client_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_grants" ADD CONSTRAINT "consent_grants_client_id_oauth_client_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_client"("client_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_revocations" ADD CONSTRAINT "consent_revocations_client_id_oauth_client_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_client"("client_id") ON DELETE restrict ON UPDATE no action;