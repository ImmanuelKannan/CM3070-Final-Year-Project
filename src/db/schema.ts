import { boolean, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export * from "./auth-schema.ts";

export const todos = pgTable("todos", {
	id: serial("id").primaryKey(),
	title: text("title").notNull(),
	description: text("description"),
	isCompleted: boolean("is_completed").default(false),
	createdAt: timestamp("created_at").defaultNow(),
});
