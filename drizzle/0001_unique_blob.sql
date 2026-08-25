CREATE TABLE "identity_attributes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"key" text NOT NULL,
	"value" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "first_name" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "last_name" text;--> statement-breakpoint
UPDATE "user"
SET
	"first_name" = split_part(trim("name"), ' ', 1),
	"last_name" = CASE
		WHEN position(' ' in trim("name")) > 0
			THEN trim(substring(trim("name") from position(' ' in trim("name")) + 1))
		ELSE ''
	END;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "first_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "last_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "identity_attributes" ADD CONSTRAINT "identity_attributes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "identity_attributes_user_key_idx" ON "identity_attributes" USING btree ("user_id","key");--> statement-breakpoint
CREATE INDEX "identity_attributes_user_id_idx" ON "identity_attributes" USING btree ("user_id");--> statement-breakpoint
INSERT INTO "identity_attributes" ("user_id", "key", "value")
SELECT "id", 'firstName', "first_name" FROM "user"
UNION ALL
SELECT "id", 'lastName', "last_name" FROM "user"
UNION ALL
SELECT "id", 'email', "email" FROM "user"
ON CONFLICT ("user_id", "key") DO NOTHING;--> statement-breakpoint
CREATE FUNCTION initialize_identity_attributes() RETURNS trigger AS $$
BEGIN
	INSERT INTO "identity_attributes" ("user_id", "key", "value")
	VALUES
		(NEW."id", 'firstName', NEW."first_name"),
		(NEW."id", 'lastName', NEW."last_name"),
		(NEW."id", 'email', NEW."email")
	ON CONFLICT ("user_id", "key") DO NOTHING;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER initialize_identity_attributes_after_user_insert
AFTER INSERT ON "user"
FOR EACH ROW EXECUTE FUNCTION initialize_identity_attributes();