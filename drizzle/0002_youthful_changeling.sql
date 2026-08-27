CREATE TABLE "contextual_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_attribute_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"key" text NOT NULL,
	"value" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contextual_profiles" ADD CONSTRAINT "contextual_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_attribute_overrides" ADD CONSTRAINT "profile_attribute_overrides_profile_id_contextual_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."contextual_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "contextual_profiles_user_name_lower_idx" ON "contextual_profiles" USING btree ("user_id",lower("name"));--> statement-breakpoint
CREATE INDEX "contextual_profiles_user_id_idx" ON "contextual_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profile_attribute_overrides_profile_key_idx" ON "profile_attribute_overrides" USING btree ("profile_id","key");--> statement-breakpoint
CREATE INDEX "profile_attribute_overrides_profile_id_idx" ON "profile_attribute_overrides" USING btree ("profile_id");