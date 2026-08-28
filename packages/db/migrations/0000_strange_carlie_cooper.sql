CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" text NOT NULL,
	"initials" text NOT NULL,
	"role" text NOT NULL,
	"role_label" text NOT NULL,
	"avatar_bg" text NOT NULL,
	"badge" text NOT NULL,
	"phone" text,
	"brokerage" text,
	"plan" text DEFAULT 'free' NOT NULL,
	"billing_cycle" text DEFAULT 'monthly' NOT NULL,
	"subscription_cancelled" boolean DEFAULT false NOT NULL,
	"ask_questions_used" text DEFAULT '0' NOT NULL,
	"owned_token_id" text,
	"contractor_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_id" text NOT NULL,
	"address_line1" text NOT NULL,
	"address_line2" text,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"postal_code" text NOT NULL,
	"country_code" text DEFAULT 'US' NOT NULL,
	"parcel_id" text NOT NULL,
	"latitude" numeric,
	"longitude" numeric,
	"year_built" integer,
	"bedrooms" numeric,
	"bathrooms" numeric,
	"living_sqft" integer,
	"lot_sqft" integer,
	"property_type" text,
	"current_estimated_value" numeric,
	"current_health_score" integer,
	"is_showcase" boolean DEFAULT false NOT NULL,
	"is_provisioned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"property_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"occurred_at" date NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"verification_level" text NOT NULL,
	"visibility" text DEFAULT 'AUTHENTICATED' NOT NULL,
	"source_type" text,
	"source_name" text,
	"source_reference" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"supersedes_event_id" uuid,
	"previous_hash" text,
	"event_hash" text NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"event_id" uuid,
	"file_name" text NOT NULL,
	"storage_path" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size" bigint,
	"document_type" text,
	"visibility" text DEFAULT 'AUTHENTICATED' NOT NULL,
	"sha256" text NOT NULL,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_systems" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"system_type" text NOT NULL,
	"display_name" text NOT NULL,
	"status" text NOT NULL,
	"installed_at" date,
	"last_serviced_at" date,
	"expected_life_years" integer,
	"estimated_remaining_years" integer,
	"verification_level" text NOT NULL,
	"source_event_id" uuid,
	"rows" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"notes" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ownership_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"sequence_number" integer NOT NULL,
	"label" text NOT NULL,
	"range_label" text NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"verification_level" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"agent_name" text NOT NULL,
	"status" text NOT NULL,
	"method" text NOT NULL,
	"mls_number" text,
	"escrow_number" text,
	"claimed_at" date NOT NULL,
	"expires_at" date,
	"released_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "home_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"status" text NOT NULL,
	"method" text NOT NULL,
	"verified_at" date,
	"requested_at" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_properties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"property_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contractors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"name" text NOT NULL,
	"initials" text NOT NULL,
	"trade" text NOT NULL,
	"license_number" text NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"verified_since" text NOT NULL,
	"service_area" text NOT NULL,
	"service_zips" text NOT NULL,
	"job_count" integer DEFAULT 0 NOT NULL,
	"phone" text NOT NULL,
	"blurb" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"property_id" uuid NOT NULL,
	"contractor_id" uuid NOT NULL,
	"requested_by_id" uuid,
	"status" text NOT NULL,
	"trade" text NOT NULL,
	"description" text NOT NULL,
	"share_system_record" boolean DEFAULT false NOT NULL,
	"requested_at" date NOT NULL,
	"submission" jsonb,
	"result_event_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_extraction_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"status" text NOT NULL,
	"extracted_json" jsonb,
	"model" text,
	"error_message" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "token_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"from_steward_label" text,
	"to_steward_label" text NOT NULL,
	"to_steward_email" text NOT NULL,
	"status" text NOT NULL,
	"initiated_by" uuid,
	"initiated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"transfer_event_id" uuid
);
--> statement-breakpoint
CREATE TABLE "document_blobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storage_key" text NOT NULL,
	"content_type" text NOT NULL,
	"bytes" "bytea" NOT NULL,
	"sha256" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "property_events" ADD CONSTRAINT "property_events_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_events" ADD CONSTRAINT "property_events_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_documents" ADD CONSTRAINT "property_documents_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_documents" ADD CONSTRAINT "property_documents_event_id_property_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."property_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_documents" ADD CONSTRAINT "property_documents_uploaded_by_profiles_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_systems" ADD CONSTRAINT "property_systems_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_systems" ADD CONSTRAINT "property_systems_source_event_id_property_events_id_fk" FOREIGN KEY ("source_event_id") REFERENCES "public"."property_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ownership_periods" ADD CONSTRAINT "ownership_periods_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_agent_id_profiles_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "home_claims" ADD CONSTRAINT "home_claims_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "home_claims" ADD CONSTRAINT "home_claims_owner_id_profiles_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_properties" ADD CONSTRAINT "saved_properties_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_properties" ADD CONSTRAINT "saved_properties_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_requested_by_id_profiles_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_result_event_id_property_events_id_fk" FOREIGN KEY ("result_event_id") REFERENCES "public"."property_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_extraction_jobs" ADD CONSTRAINT "ai_extraction_jobs_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_extraction_jobs" ADD CONSTRAINT "ai_extraction_jobs_document_id_property_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."property_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_extraction_jobs" ADD CONSTRAINT "ai_extraction_jobs_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_transfers" ADD CONSTRAINT "token_transfers_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_transfers" ADD CONSTRAINT "token_transfers_initiated_by_profiles_id_fk" FOREIGN KEY ("initiated_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_transfers" ADD CONSTRAINT "token_transfers_transfer_event_id_property_events_id_fk" FOREIGN KEY ("transfer_event_id") REFERENCES "public"."property_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "properties_token_id_key" ON "properties" USING btree ("token_id");--> statement-breakpoint
CREATE INDEX "properties_parcel_id_idx" ON "properties" USING btree ("parcel_id");--> statement-breakpoint
CREATE INDEX "properties_address_idx" ON "properties" USING btree (lower("address_line1"));--> statement-breakpoint
CREATE INDEX "properties_city_idx" ON "properties" USING btree (lower("city"));--> statement-breakpoint
CREATE UNIQUE INDEX "property_events_public_id_key" ON "property_events" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "property_events_property_idx" ON "property_events" USING btree ("property_id","occurred_at");--> statement-breakpoint
CREATE INDEX "property_events_type_idx" ON "property_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "property_documents_property_idx" ON "property_documents" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "property_documents_event_idx" ON "property_documents" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "property_systems_property_type_key" ON "property_systems" USING btree ("property_id","system_type");--> statement-breakpoint
CREATE UNIQUE INDEX "ownership_periods_property_seq_key" ON "ownership_periods" USING btree ("property_id","sequence_number");--> statement-breakpoint
CREATE INDEX "claims_property_idx" ON "claims" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "claims_agent_idx" ON "claims" USING btree ("agent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "home_claims_property_owner_key" ON "home_claims" USING btree ("property_id","owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "saved_properties_profile_property_key" ON "saved_properties" USING btree ("profile_id","property_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contractors_public_id_key" ON "contractors" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "contractors_trade_idx" ON "contractors" USING btree (lower("trade"));--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_public_id_key" ON "jobs" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "jobs_property_idx" ON "jobs" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "jobs_contractor_idx" ON "jobs" USING btree ("contractor_id");--> statement-breakpoint
CREATE INDEX "ai_extraction_jobs_property_idx" ON "ai_extraction_jobs" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "token_transfers_property_idx" ON "token_transfers" USING btree ("property_id");--> statement-breakpoint
CREATE UNIQUE INDEX "document_blobs_storage_key_key" ON "document_blobs" USING btree ("storage_key");