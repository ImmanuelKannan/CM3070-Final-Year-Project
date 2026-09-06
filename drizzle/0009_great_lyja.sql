ALTER TABLE "consent_decisions" DROP CONSTRAINT "consent_decisions_client_id_oauth_client_client_id_fk";
--> statement-breakpoint
ALTER TABLE "consent_grants" DROP CONSTRAINT "consent_grants_client_id_oauth_client_client_id_fk";
--> statement-breakpoint
ALTER TABLE "consent_requests" DROP CONSTRAINT "consent_requests_client_id_oauth_client_client_id_fk";
--> statement-breakpoint
ALTER TABLE "consent_revocations" DROP CONSTRAINT "consent_revocations_client_id_oauth_client_client_id_fk";
