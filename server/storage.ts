import {
  users,
  forms,
  shapefileLayers,
  shapefileFeatures,
  workAreas,
  missions,
  propertyCollections,
  photos,
  syncQueue,
  auditLog,
  type User,
  type UpsertUser,
  type Form,
  type InsertForm,
  type ShapefileLayer,
  type InsertShapefileLayer,
  type ShapefileFeature,
  type InsertShapefileFeature,
  type WorkArea,
  type InsertWorkArea,
  type Mission,
  type InsertMission,
  type PropertyCollection,
  type InsertPropertyCollection,
  type Photo,
  type InsertPhoto,
  type SyncQueue,
  type InsertSyncQueue,
  type AuditLog,
  type InsertAuditLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Form operations
  createForm(form: InsertForm): Promise<Form>;
  getActiveForms(): Promise<Form[]>;
  getFormById(id: string): Promise<Form | undefined>;
  updateForm(id: string, updates: Partial<InsertForm>): Promise<Form>;
  
  // Shapefile operations
  createShapefileLayer(layer: InsertShapefileLayer): Promise<ShapefileLayer>;
  getShapefileLayers(): Promise<ShapefileLayer[]>;
  createShapefileFeature(feature: InsertShapefileFeature): Promise<ShapefileFeature>;
  getShapefileFeaturesByLayer(layerId: string): Promise<ShapefileFeature[]>;
  
  // Work area operations
  createWorkArea(area: InsertWorkArea): Promise<WorkArea>;
  getWorkAreas(): Promise<WorkArea[]>;
  getWorkAreasByTeam(team: string): Promise<WorkArea[]>;
  
  // Mission operations
  createMission(mission: InsertMission): Promise<Mission>;
  getMissionsByUser(userId: string): Promise<Mission[]>;
  getMissionById(id: string): Promise<Mission | undefined>;
  updateMissionStatus(id: string, status: string): Promise<Mission>;
  getMissionsByStatus(status: string): Promise<Mission[]>;
  
  // Property collection operations
  createPropertyCollection(collection: InsertPropertyCollection): Promise<PropertyCollection>;
  getPropertyCollectionsByMission(missionId: string): Promise<PropertyCollection[]>;
  updatePropertyCollection(id: string, updates: Partial<InsertPropertyCollection>): Promise<PropertyCollection>;
  
  // Photo operations
  createPhoto(photo: InsertPhoto): Promise<Photo>;
  getPhotosByCollection(collectionId: string): Promise<Photo[]>;
  getPhotosByMission(missionId: string): Promise<Photo[]>;
  updatePhotoSyncStatus(id: string, status: string, remotePath?: string): Promise<Photo>;
  
  // Sync queue operations
  addToSyncQueue(item: InsertSyncQueue): Promise<SyncQueue>;
  getSyncQueueItems(status?: string): Promise<SyncQueue[]>;
  updateSyncQueueItem(id: string, updates: Partial<InsertSyncQueue>): Promise<SyncQueue>;
  
  // Audit operations
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Form operations
  async createForm(form: InsertForm): Promise<Form> {
    const [newForm] = await db.insert(forms).values(form).returning();
    return newForm;
  }

  async getActiveForms(): Promise<Form[]> {
    return await db.select().from(forms).where(eq(forms.isActive, true)).orderBy(desc(forms.createdAt));
  }

  async getFormById(id: string): Promise<Form | undefined> {
    const [form] = await db.select().from(forms).where(eq(forms.id, id));
    return form;
  }

  async updateForm(id: string, updates: Partial<InsertForm>): Promise<Form> {
    const [updatedForm] = await db
      .update(forms)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(forms.id, id))
      .returning();
    return updatedForm;
  }

  // Shapefile operations
  async createShapefileLayer(layer: InsertShapefileLayer): Promise<ShapefileLayer> {
    const [newLayer] = await db.insert(shapefileLayers).values(layer).returning();
    return newLayer;
  }

  async getShapefileLayers(): Promise<ShapefileLayer[]> {
    return await db.select().from(shapefileLayers).where(eq(shapefileLayers.isActive, true));
  }

  async createShapefileFeature(feature: InsertShapefileFeature): Promise<ShapefileFeature> {
    const [newFeature] = await db.insert(shapefileFeatures).values(feature).returning();
    return newFeature;
  }

  async getShapefileFeaturesByLayer(layerId: string): Promise<ShapefileFeature[]> {
    return await db.select().from(shapefileFeatures).where(eq(shapefileFeatures.layerId, layerId));
  }

  // Work area operations
  async createWorkArea(area: InsertWorkArea): Promise<WorkArea> {
    const [newArea] = await db.insert(workAreas).values(area).returning();
    return newArea;
  }

  async getWorkAreas(): Promise<WorkArea[]> {
    return await db.select().from(workAreas).where(eq(workAreas.isActive, true));
  }

  async getWorkAreasByTeam(team: string): Promise<WorkArea[]> {
    return await db.select().from(workAreas)
      .where(and(eq(workAreas.team, team), eq(workAreas.isActive, true)));
  }

  // Mission operations
  async createMission(mission: InsertMission): Promise<Mission> {
    const [newMission] = await db.insert(missions).values(mission).returning();
    return newMission;
  }

  async getMissionsByUser(userId: string): Promise<Mission[]> {
    return await db.select().from(missions)
      .where(eq(missions.assignedTo, userId))
      .orderBy(desc(missions.createdAt));
  }

  async getMissionById(id: string): Promise<Mission | undefined> {
    const [mission] = await db.select().from(missions).where(eq(missions.id, id));
    return mission;
  }

  async updateMissionStatus(id: string, status: string): Promise<Mission> {
    const [updatedMission] = await db
      .update(missions)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(missions.id, id))
      .returning();
    return updatedMission;
  }

  async getMissionsByStatus(status: string): Promise<Mission[]> {
    return await db.select().from(missions)
      .where(eq(missions.status, status as any))
      .orderBy(desc(missions.createdAt));
  }

  // Property collection operations
  async createPropertyCollection(collection: InsertPropertyCollection): Promise<PropertyCollection> {
    const [newCollection] = await db.insert(propertyCollections).values(collection).returning();
    return newCollection;
  }

  async getPropertyCollectionsByMission(missionId: string): Promise<PropertyCollection[]> {
    return await db.select().from(propertyCollections)
      .where(eq(propertyCollections.missionId, missionId))
      .orderBy(desc(propertyCollections.collectedAt));
  }

  async updatePropertyCollection(id: string, updates: Partial<InsertPropertyCollection>): Promise<PropertyCollection> {
    const [updatedCollection] = await db
      .update(propertyCollections)
      .set(updates)
      .where(eq(propertyCollections.id, id))
      .returning();
    return updatedCollection;
  }

  // Photo operations
  async createPhoto(photo: InsertPhoto): Promise<Photo> {
    const [newPhoto] = await db.insert(photos).values(photo).returning();
    return newPhoto;
  }

  async getPhotosByCollection(collectionId: string): Promise<Photo[]> {
    return await db.select().from(photos)
      .where(eq(photos.collectionId, collectionId))
      .orderBy(asc(photos.capturedAt));
  }

  async getPhotosByMission(missionId: string): Promise<Photo[]> {
    return await db.select().from(photos)
      .where(eq(photos.missionId, missionId))
      .orderBy(asc(photos.capturedAt));
  }

  async updatePhotoSyncStatus(id: string, status: string, remotePath?: string): Promise<Photo> {
    const updates: any = { syncStatus: status };
    if (remotePath) {
      updates.remotePath = remotePath;
    }
    
    const [updatedPhoto] = await db
      .update(photos)
      .set(updates)
      .where(eq(photos.id, id))
      .returning();
    return updatedPhoto;
  }

  // Sync queue operations
  async addToSyncQueue(item: InsertSyncQueue): Promise<SyncQueue> {
    const [newItem] = await db.insert(syncQueue).values(item).returning();
    return newItem;
  }

  async getSyncQueueItems(status?: string): Promise<SyncQueue[]> {
    if (status) {
      return await db.select().from(syncQueue)
        .where(eq(syncQueue.status, status))
        .orderBy(asc(syncQueue.createdAt));
    }
    return await db.select().from(syncQueue).orderBy(asc(syncQueue.createdAt));
  }

  async updateSyncQueueItem(id: string, updates: Partial<InsertSyncQueue>): Promise<SyncQueue> {
    const [updatedItem] = await db
      .update(syncQueue)
      .set(updates)
      .where(eq(syncQueue.id, id))
      .returning();
    return updatedItem;
  }

  // Audit operations
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [newLog] = await db.insert(auditLog).values(log).returning();
    return newLog;
  }
}

export const storage = new DatabaseStorage();
