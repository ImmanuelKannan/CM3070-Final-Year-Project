CREATE OR REPLACE FUNCTION initialize_identity_attributes() RETURNS trigger AS $$
BEGIN
	IF NEW."account_kind" = 'developer' THEN
		RETURN NEW;
	END IF;
	INSERT INTO "identity_attributes" ("user_id", "key", "value")
	VALUES
		(NEW."id", 'firstName', NEW."first_name"),
		(NEW."id", 'lastName', NEW."last_name"),
		(NEW."id", 'email', NEW."email")
	ON CONFLICT ("user_id", "key") DO NOTHING;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;