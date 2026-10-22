CREATE TABLE "lost_pets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"pet_name" text NOT NULL,
	"species" text NOT NULL,
	"breed" text NOT NULL,
	"color" text NOT NULL,
	"photo_url" text,
	"description" text NOT NULL,
	"contact_name" text NOT NULL,
	"contact_phone" text NOT NULL,
	"reward" text,
	"last_seen_lat" text NOT NULL,
	"last_seen_lng" text NOT NULL,
	"last_seen_address" text NOT NULL,
	"status" text DEFAULT 'lost' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"species" text NOT NULL,
	"name" text NOT NULL,
	"breed" text NOT NULL,
	"color" text NOT NULL,
	"mood" text NOT NULL,
	"rarity" text NOT NULL,
	"cute_score" integer NOT NULL,
	"xp_reward" integer NOT NULL,
	"description" text NOT NULL,
	"fun_fact" text NOT NULL,
	"photo_url" text NOT NULL,
	"lat" text NOT NULL,
	"lng" text NOT NULL,
	"location_name" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"avatar" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
ALTER TABLE "lost_pets" ADD CONSTRAINT "lost_pets_user_id_users_uid_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("uid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pets" ADD CONSTRAINT "pets_user_id_users_uid_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("uid") ON DELETE no action ON UPDATE no action;