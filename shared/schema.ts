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

// Dados municipais importados (BIC/IPTU)
export const municipalData = pgTable("municipal_data", {
  id: pgUuid("id").primaryKey().default(sql`gen_random_uuid()`),
  inscricaoImobiliaria: varchar("inscricao_imobiliaria").notNull(),
  numeroLogradouro: varchar("numero_logradouro"),
  complemento: varchar("complemento"),
  logradouro: varchar("logradouro"),
  bairro: varchar("bairro"),
  cep: varchar("cep"),
  usoPredominante: varchar("uso_predominante"),
  areaTerreno: decimal("area_terreno", { precision: 10, scale: 2 }),
  areaConstruida: decimal("area_construida", { precision: 10, scale: 2 }),
  numeroPavimentos: integer("numero_pavimentos"),
  padraoConstrutivo: varchar("padrao_construtivo"),
  anoConstrucao: integer("ano_construcao"),
  proprietarioNome: varchar("proprietario_nome"),
  proprietarioCpfCnpj: varchar("proprietario_cpf_cnpj"),
  telefone: varchar("telefone"),
  valorVenal: decimal("valor_venal", { precision: 12, scale: 2 }),
  valorIptu: decimal("valor_iptu", { precision: 12, scale: 2 }),
  situacao: varchar("situacao").default("ativo"), // ativo, inativo, pendente
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  observacoes: text("observacoes"),
  dataImportacao: timestamp("data_importacao").defaultNow(),
  fonte: varchar("fonte").notNull(), // BIC, IPTU, outro
  municipio: varchar("municipio").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Matching de propriedades (IA para identificar duplicatas)
export const propertyMatches = pgTable("property_matches", {
  id: pgUuid("id").primaryKey().default(sql`gen_random_uuid()`),
  collectionId: pgUuid("collection_id").references(() => propertyCollections.id),
  municipalDataId: pgUuid("municipal_data_id").references(() => municipalData.id),
  matchScore: decimal("match_score", { precision: 3, scale: 2 }).notNull(), // 0.00 to 1.00
  matchReasons: jsonb("match_reasons").notNull(), // array de critérios de matching
  status: varchar("status").default("pending"), // pending, confirmed, rejected, auto_applied
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  autoApplied: boolean("auto_applied").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Histórico de aplicação de dados municipais
export const municipalDataApplications = pgTable("municipal_data_applications", {
  id: pgUuid("id").primaryKey().default(sql`gen_random_uuid()`),
  collectionId: pgUuid("collection_id").references(() => propertyCollections.id),
  municipalDataId: pgUuid("municipal_data_id").references(() => municipalData.id),
  appliedFields: jsonb("applied_fields").notNull(), // campos que foram aplicados
  appliedBy: varchar("applied_by").references(() => users.id),
  appliedAt: timestamp("applied_at").defaultNow(),
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

export type InsertMunicipalData = typeof municipalData.$inferInsert;
export type MunicipalData = typeof municipalData.$inferSelect;

export type InsertPropertyMatch = typeof propertyMatches.$inferInsert;
export type PropertyMatch = typeof propertyMatches.$inferSelect;

export type InsertMunicipalDataApplication = typeof municipalDataApplications.$inferInsert;
export type MunicipalDataApplication = typeof municipalDataApplications.$inferSelect;

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

export const insertMunicipalDataSchema = createInsertSchema(municipalData).omit({
  id: true,
  dataImportacao: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPropertyMatchSchema = createInsertSchema(propertyMatches).omit({
  id: true,
  createdAt: true,
});

export const insertMunicipalDataApplicationSchema = createInsertSchema(municipalDataApplications).omit({
  id: true,
  appliedAt: true,
});
