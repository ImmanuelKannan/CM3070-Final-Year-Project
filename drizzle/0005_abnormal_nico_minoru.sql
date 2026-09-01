CREATE TABLE "consent_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"reference_id" text NOT NULL,
	"client_id" text NOT NULL,
	"canonical_query" text NOT NULL,
	"scopes" jsonb NOT NULL,
	"source" jsonb NOT NULL,
	"released_attributes" jsonb NOT NULL,
	"auth_email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "consent_grants" ADD CONSTRAINT "consent_grants_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_grants" ADD CONSTRAINT "consent_grants_client_id_oauth_client_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_client"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "consent_grants_user_reference_idx" ON "consent_grants" USING btree ("user_id","reference_id");--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_consent_client_user_reference_idx" ON "oauth_consent" USING btree ("client_id","user_id","reference_id");