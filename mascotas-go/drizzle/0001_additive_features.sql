CREATE TABLE "daily_quests_progress" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"quest_id" text NOT NULL,
	"logical_date" text NOT NULL,
	"current_progress" integer DEFAULT 0 NOT NULL,
	"target_progress" integer NOT NULL,
	"claimed" boolean DEFAULT false NOT NULL,
	"claimed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "migration_geo_quarantine" (
	"id" serial PRIMARY KEY NOT NULL,
	"table_name" text NOT NULL,
	"record_id" text NOT NULL,
	"raw_lat" text,
	"raw_lng" text,
	"failure_reason" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pet_album_photos" (
	"id" text PRIMARY KEY NOT NULL,
	"pet_id" text NOT NULL,
	"user_id" text NOT NULL,
	"photo_url" text NOT NULL,
	"date" timestamp NOT NULL,
	"stage" text NOT NULL,
	"caption" text,
	"weight_kg" numeric(5, 2),
	"milestone" text,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "petstop_cooldowns" (
	"user_id" text NOT NULL,
	"petstop_id" text NOT NULL,
	"last_spun_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "petstop_cooldowns_user_id_petstop_id_pk" PRIMARY KEY("user_id","petstop_id")
);
--> statement-breakpoint
CREATE TABLE "reward_events" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"action_type" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"xp_awarded" integer DEFAULT 0 NOT NULL,
	"items_awarded" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "reward_events_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "sos_contact_audit" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_id" text NOT NULL,
	"viewer_uid" text NOT NULL,
	"accessed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_inventory" (
	"user_id" text NOT NULL,
	"item_id" text NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_inventory_user_id_item_id_pk" PRIMARY KEY("user_id","item_id")
);
--> statement-breakpoint
ALTER TABLE "lost_pets" ADD COLUMN "lat_numeric" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "lost_pets" ADD COLUMN "lng_numeric" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "lost_pets" ADD COLUMN "geo_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "lost_pets" ADD COLUMN "contact_method" text DEFAULT 'phone' NOT NULL;--> statement-breakpoint
ALTER TABLE "lost_pets" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "pets" ADD COLUMN "lat_numeric" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "pets" ADD COLUMN "lng_numeric" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "pets" ADD COLUMN "geo_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "pets" ADD COLUMN "is_deleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "pets" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "active_buddy_pet_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "xp" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "level" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "daily_quests_progress" ADD CONSTRAINT "daily_quests_progress_user_id_users_uid_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("uid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_album_photos" ADD CONSTRAINT "pet_album_photos_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_album_photos" ADD CONSTRAINT "pet_album_photos_user_id_users_uid_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("uid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petstop_cooldowns" ADD CONSTRAINT "petstop_cooldowns_user_id_users_uid_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("uid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_events" ADD CONSTRAINT "reward_events_user_id_users_uid_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("uid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sos_contact_audit" ADD CONSTRAINT "sos_contact_audit_report_id_lost_pets_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."lost_pets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sos_contact_audit" ADD CONSTRAINT "sos_contact_audit_viewer_uid_users_uid_fk" FOREIGN KEY ("viewer_uid") REFERENCES "public"."users"("uid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_inventory" ADD CONSTRAINT "user_inventory_user_id_users_uid_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("uid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_user_quest_date" ON "daily_quests_progress" USING btree ("user_id","quest_id","logical_date");