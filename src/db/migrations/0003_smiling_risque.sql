CREATE TABLE "cart" (
	"cart_id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer,
	"product_id" integer,
	"quantity" integer,
	"subtotal" numeric,
	"total" numeric
);
--> statement-breakpoint
CREATE TABLE "customer" (
	"customer_id" serial PRIMARY KEY NOT NULL,
	"mobile" text
);
--> statement-breakpoint
CREATE TABLE "expense" (
	"expense_id" serial PRIMARY KEY NOT NULL,
	"shop_id" integer,
	"amount" numeric,
	"description" text,
	"expense_date" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "order" (
	"order_id" serial PRIMARY KEY NOT NULL,
	"shop_id" integer,
	"product_id" integer,
	"quantity" integer,
	"total_amount" numeric,
	"order_date" timestamp DEFAULT now(),
	"status" text DEFAULT 'pending'
);
--> statement-breakpoint
CREATE TABLE "product" (
	"product_id" serial PRIMARY KEY NOT NULL,
	"shop_id" integer,
	"name" text,
	"price" numeric,
	"quantity" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sell" (
	"sell_id" serial PRIMARY KEY NOT NULL,
	"cart_id" integer,
	"shop_id" integer,
	"customer_id" integer,
	"total_amount" numeric,
	"date_of_sale" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "shop_customer" (
	"shop_id" integer,
	"customer_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "shop_owner" (
	"shop_owner_id" serial PRIMARY KEY NOT NULL,
	"shop_id" integer,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "shop" (
	"shop_id" serial PRIMARY KEY NOT NULL,
	"shop_name" text,
	"location" text,
	"type" text,
	"status" text DEFAULT 'active',
	"shop_image" text,
	"owner_id" text
);
--> statement-breakpoint
CREATE TABLE "user_info" (
	"user_id" text PRIMARY KEY NOT NULL,
	"username" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"image" text
);
--> statement-breakpoint
DROP TABLE "favorites" CASCADE;--> statement-breakpoint
ALTER TABLE "cart" ADD CONSTRAINT "cart_customer_id_customer_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("customer_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart" ADD CONSTRAINT "cart_product_id_product_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("product_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense" ADD CONSTRAINT "expense_shop_id_shop_shop_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shop"("shop_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_shop_id_shop_shop_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shop"("shop_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_product_id_product_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("product_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_shop_id_shop_shop_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shop"("shop_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sell" ADD CONSTRAINT "sell_cart_id_cart_cart_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."cart"("cart_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sell" ADD CONSTRAINT "sell_shop_id_shop_shop_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shop"("shop_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sell" ADD CONSTRAINT "sell_customer_id_customer_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("customer_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_customer" ADD CONSTRAINT "shop_customer_shop_id_shop_shop_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shop"("shop_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_customer" ADD CONSTRAINT "shop_customer_customer_id_customer_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("customer_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_owner" ADD CONSTRAINT "shop_owner_shop_id_shop_shop_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shop"("shop_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_owner" ADD CONSTRAINT "shop_owner_user_id_user_info_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_info"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop" ADD CONSTRAINT "shop_owner_id_user_info_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user_info"("user_id") ON DELETE no action ON UPDATE no action;