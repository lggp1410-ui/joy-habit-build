import { pgTable, uuid, text, jsonb, timestamp, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const userPreferences = pgTable("user_preferences", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().unique(),
  routines: jsonb("routines").default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
});

export const icons = pgTable("icons", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  category: text("category").notNull(),
  filename: text("filename").notNull(),
  storagePath: text("storage_path").notNull(),
  data: text("data"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
});
