ALTER TABLE "user" ALTER COLUMN "first_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "last_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "account_kind" text DEFAULT 'identity_holder' NOT NULL;