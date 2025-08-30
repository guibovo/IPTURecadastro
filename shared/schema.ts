import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  decimal,
  integer,
  boolean,
  uuid as pgUuid,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("field_agent"), // field_agent, admin
  team: varchar("team"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Form definitions
export const forms = pgTable("forms", {
  id: pgUuid("id").primaryKey().default(sql`gen_random_uuid()`),
  version: varchar("version").notNull(),
  title: varchar("title").notNull(),
  schemaJson: jsonb("schema_json").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Shapefile layers
export const shapefileLayers = pgTable("shapefile_layers", {
  id: pgUuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  source: varchar("source"),
  srid: varchar("srid").default("EPSG:4326"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Shapefile features
export const shapefileFeatures = pgTable("shapefile_features", {
  id: pgUuid("id").primaryKey().default(sql`gen_random_uuid()`),
  layerId: pgUuid("layer_id").references(() => shapefileLayers.id),
  geometry: jsonb("geometry").notNull(), // GeoJSON geometry
  properties: jsonb("properties").notNull(), // Feature properties
  createdAt: timestamp("created_at").defaultNow(),
});

// Work areas for geofencing
export const workAreas = pgTable("work_areas", {
  id: pgUuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  polygon: jsonb("polygon").notNull(), // GeoJSON polygon
  team: varchar("team"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Mission status enum
export const missionStatusEnum = pgEnum("mission_status", [
  "new",
  "in_progress", 
  "pending_photos",
  "completed",
  "approved",
  "rejected"
]);

// Missions
export const missions = pgTable("missions", {
  id: pgUuid("id").primaryKey().default(sql`gen_random_uuid()`),
  featureId: pgUuid("feature_id").references(() => shapefileFeatures.id),
  assignedTo: varchar("assigned_to").references(() => users.id),
  formId: pgUuid("form_id").references(() => forms.id),
  priority: varchar("priority").default("medium"), // low, medium, high
  deadline: timestamp("deadline"),
  status: missionStatusEnum("status").default("new"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  address: text("address"),
  propertyCode: varchar("property_code"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Property data collections
export const propertyCollections = pgTable("property_collections", {
  id: pgUuid("id").primaryKey().default(sql`gen_random_uuid()`),
  missionId: pgUuid("mission_id").references(() => missions.id),
  formResponses: jsonb("form_responses").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  accuracy: decimal("accuracy", { precision: 5, scale: 2 }),
  collectedBy: varchar("collected_by").references(() => users.id),
  collectedAt: timestamp("collected_at").defaultNow(),
  syncStatus: varchar("sync_status").default("pending"), // pending, syncing, synced, error
  version: integer("version").default(1),
});

// Photos
export const photos = pgTable("photos", {
  id: pgUuid("id").primaryKey().default(sql`gen_random_uuid()`),
  collectionId: pgUuid("collection_id").references(() => propertyCollections.id),
  missionId: pgUuid("mission_id").references(() => missions.id),
  type: varchar("type").notNull(), // facade, number, lateral, back
  filename: varchar("filename").notNull(),
  localPath: varchar("local_path"),
  remotePath: varchar("remote_path"),
  isPrimary: boolean("is_primary").default(false),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  width: integer("width"),
  height: integer("height"),
  fileSize: integer("file_size"),
  capturedAt: timestamp("captured_at").defaultNow(),
  syncStatus: varchar("sync_status").default("pending"),
});

// Sync queue for offline operations
export const syncQueue = pgTable("sync_queue", {
  id: pgUuid("id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type").notNull(), // property_data, photo_upload, etc
  referenceId: pgUuid("reference_id").notNull(),
  payload: jsonb("payload").notNull(),
  status: varchar("status").default("pending"), // pending, processing, completed, failed
  attempts: integer("attempts").default(0),
  lastAttempt: timestamp("last_attempt"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Audit log
export const auditLog = pgTable("audit_log", {
  id: pgUuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  action: varchar("action").notNull(),
  entity: varchar("entity").notNull(),
  entityId: varchar("entity_id").notNull(),
  changes: jsonb("changes"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const userRelations = relations(users, ({ many }) => ({
  missions: many(missions),
  collections: many(propertyCollections),
  auditEntries: many(auditLog),
}));

export const formRelations = relations(forms, ({ many }) => ({
  missions: many(missions),
}));

export const shapefileLayerRelations = relations(shapefileLayers, ({ many }) => ({
  features: many(shapefileFeatures),
}));

export const shapefileFeatureRelations = relations(shapefileFeatures, ({ one, many }) => ({
  layer: one(shapefileLayers, {
    fields: [shapefileFeatures.layerId],
    references: [shapefileLayers.id],
  }),
  missions: many(missions),
}));

export const missionRelations = relations(missions, ({ one, many }) => ({
  feature: one(shapefileFeatures, {
    fields: [missions.featureId],
    references: [shapefileFeatures.id],
  }),
  assignee: one(users, {
    fields: [missions.assignedTo],
    references: [users.id],
  }),
  form: one(forms, {
    fields: [missions.formId],
    references: [forms.id],
  }),
  collections: many(propertyCollections),
  photos: many(photos),
}));

export const propertyCollectionRelations = relations(propertyCollections, ({ one, many }) => ({
  mission: one(missions, {
    fields: [propertyCollections.missionId],
    references: [missions.id],
  }),
  collector: one(users, {
    fields: [propertyCollections.collectedBy],
    references: [users.id],
  }),
  photos: many(photos),
}));

export const photoRelations = relations(photos, ({ one }) => ({
  collection: one(propertyCollections, {
    fields: [photos.collectionId],
    references: [propertyCollections.id],
  }),
  mission: one(missions, {
    fields: [photos.missionId],
    references: [missions.id],
  }),
}));

// Schema types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type InsertForm = typeof forms.$inferInsert;
export type Form = typeof forms.$inferSelect;

export type InsertShapefileLayer = typeof shapefileLayers.$inferInsert;
export type ShapefileLayer = typeof shapefileLayers.$inferSelect;

export type InsertShapefileFeature = typeof shapefileFeatures.$inferInsert;
export type ShapefileFeature = typeof shapefileFeatures.$inferSelect;

export type InsertWorkArea = typeof workAreas.$inferInsert;
export type WorkArea = typeof workAreas.$inferSelect;

export type InsertMission = typeof missions.$inferInsert;
export type Mission = typeof missions.$inferSelect;

export type InsertPropertyCollection = typeof propertyCollections.$inferInsert;
export type PropertyCollection = typeof propertyCollections.$inferSelect;

export type InsertPhoto = typeof photos.$inferInsert;
export type Photo = typeof photos.$inferSelect;

export type InsertSyncQueue = typeof syncQueue.$inferInsert;
export type SyncQueue = typeof syncQueue.$inferSelect;

export type InsertAuditLog = typeof auditLog.$inferInsert;
export type AuditLog = typeof auditLog.$inferSelect;

// Insert schemas for validation
export const insertFormSchema = createInsertSchema(forms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMissionSchema = createInsertSchema(missions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPropertyCollectionSchema = createInsertSchema(propertyCollections).omit({
  id: true,
  collectedAt: true,
});

export const insertPhotoSchema = createInsertSchema(photos).omit({
  id: true,
  capturedAt: true,
});

export const insertShapefileLayerSchema = createInsertSchema(shapefileLayers).omit({
  id: true,
  createdAt: true,
});
