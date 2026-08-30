ALTER TABLE "profile_attribute_overrides" RENAME TO "profile_attributes";--> statement-breakpoint
ALTER TABLE "profile_attributes" DROP CONSTRAINT IF EXISTS "profile_attribute_overrides_profile_id_contextual_profiles_id_fk";--> statement-breakpoint
-- Postgres truncates identifiers to 63 characters, so the FK created by
-- migration 0000 is stored under the truncated name below on standard builds.
ALTER TABLE "profile_attributes" DROP CONSTRAINT IF EXISTS "profile_attribute_overrides_profile_id_contextual_profiles_id_f";--> statement-breakpoint
DROP INDEX "contextual_profiles_user_name_lower_idx";--> statement-breakpoint
DROP INDEX "profile_attribute_overrides_profile_key_idx";--> statement-breakpoint
DROP INDEX "profile_attribute_overrides_profile_id_idx";--> statement-breakpoint
-- Profiles created before Profile Types existed get the catch-all type. The
-- column starts nullable so existing rows can be backfilled before NOT NULL
-- is enforced.
ALTER TABLE "contextual_profiles" ADD COLUMN "type" text;--> statement-breakpoint
UPDATE "contextual_profiles" SET "type" = 'others' WHERE "type" IS NULL;--> statement-breakpoint
ALTER TABLE "contextual_profiles" ALTER COLUMN "type" SET NOT NULL;--> statement-breakpoint
-- One Contextual Profile per Profile Type is enforced below by a unique
-- index; fail explicitly instead of letting the index creation error out
-- obscurely if a user has several pre-existing profiles in one type.
DO $$ BEGIN
	IF EXISTS (
		SELECT 1 FROM "contextual_profiles"
		GROUP BY "user_id", "type"
		HAVING COUNT(*) > 1
	) THEN
		RAISE EXCEPTION 'Migration 0003 cannot proceed: multiple contextual profiles share one Profile Type for the same user. Resolve the duplicates manually, then apply the migration again.';
	END IF;
END $$;--> statement-breakpoint
ALTER TABLE "profile_attributes" ADD CONSTRAINT "profile_attributes_profile_id_contextual_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."contextual_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "contextual_profiles_user_type_idx" ON "contextual_profiles" USING btree ("user_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "profile_attributes_profile_key_idx" ON "profile_attributes" USING btree ("profile_id","key");--> statement-breakpoint
CREATE INDEX "profile_attributes_profile_id_idx" ON "profile_attributes" USING btree ("profile_id");--> statement-breakpoint
ALTER TABLE "contextual_profiles" ADD CONSTRAINT "contextual_profiles_type_check" CHECK ("contextual_profiles"."type" in ('social', 'banking', 'school', 'others'));