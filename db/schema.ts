import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const catalog = sqliteTable('catalog', { id: text('id').primaryKey(), version: integer('version').notNull(), data: text('data').notNull() });
