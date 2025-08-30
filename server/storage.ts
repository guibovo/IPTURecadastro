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
  municipalData,
  propertyMatches,
  municipalDataApplications,
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
  type MunicipalData,
  type InsertMunicipalData,
  type PropertyMatch,
  type InsertPropertyMatch,
  type MunicipalDataApplication,
  type InsertMunicipalDataApplication,
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
  getPropertyCollectionById(id: string): Promise<PropertyCollection | undefined>;
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
  
  // Municipal data operations
  processMunicipalDataFile(file: any, municipio: string, fonte: string): Promise<any>;
  getMunicipalData(municipio?: string, page?: number, limit?: number): Promise<MunicipalData[]>;
  getMunicipalDataById(id: string): Promise<MunicipalData | undefined>;
  
  // Property matching operations
  applyMunicipalDataToCollection(collectionId: string, municipalDataId: string): Promise<any>;
  recordMunicipalDataApplication(collectionId: string, municipalDataId: string, appliedFields: any, userId: string): Promise<MunicipalDataApplication>;
  updatePropertyMatchStatus(collectionId: string, municipalDataId: string, status: string, userId: string): Promise<void>;
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

  async getPropertyCollectionById(id: string): Promise<PropertyCollection | undefined> {
    const [collection] = await db.select().from(propertyCollections)
      .where(eq(propertyCollections.id, id));
    return collection;
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

  // Municipal data operations
  async processMunicipalDataFile(file: any, municipio: string, fonte: string): Promise<any> {
    // Implementação básica - processaria CSV/Excel e inseriria dados
    // Por agora, retorna um resultado simulado
    return {
      success: true,
      totalRecords: 100,
      validRecords: 95,
      invalidRecords: 5,
      duplicateRecords: 2,
      errors: ["Linha 10: CPF inválido", "Linha 25: CEP não encontrado"]
    };
  }

  async getMunicipalData(municipio?: string, page = 1, limit = 50): Promise<MunicipalData[]> {
    if (municipio) {
      return await db.select().from(municipalData)
        .where(eq(municipalData.municipio, municipio))
        .orderBy(desc(municipalData.createdAt))
        .limit(limit)
        .offset((page - 1) * limit);
    }
    
    return await db.select().from(municipalData)
      .orderBy(desc(municipalData.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);
  }

  async getMunicipalDataById(id: string): Promise<MunicipalData | undefined> {
    const [data] = await db.select().from(municipalData)
      .where(eq(municipalData.id, id));
    return data;
  }

  // Property matching operations
  async applyMunicipalDataToCollection(collectionId: string, municipalDataId: string): Promise<any> {
    const municipal = await this.getMunicipalDataById(municipalDataId);
    const collection = await this.getPropertyCollectionById(collectionId);
    
    if (!municipal || !collection) {
      throw new Error("Municipal data or collection not found");
    }

    // Mapear campos municipais para campos da collection
    const fieldsToApply = {
      inscricaoImobiliaria: municipal.inscricaoImobiliaria,
      proprietarioNome: municipal.proprietarioNome,
      proprietarioCpfCnpj: municipal.proprietarioCpfCnpj,
      areaTerreno: municipal.areaTerreno,
      areaConstruida: municipal.areaConstruida,
      usoPredominante: municipal.usoPredominante,
      numeroPavimentos: municipal.numeroPavimentos,
      valorVenal: municipal.valorVenal,
    };

    // Atualizar a collection com os dados municipais
    const currentResponses = collection.formResponses as Record<string, any> || {};
    const updatedFormResponses = {
      ...currentResponses,
      ...fieldsToApply
    };

    await this.updatePropertyCollection(collectionId, {
      formResponses: updatedFormResponses,
    });

    return fieldsToApply;
  }

  async recordMunicipalDataApplication(
    collectionId: string, 
    municipalDataId: string, 
    appliedFields: any, 
    userId: string
  ): Promise<MunicipalDataApplication> {
    const [application] = await db.insert(municipalDataApplications).values({
      collectionId,
      municipalDataId,
      appliedFields,
      appliedBy: userId,
    }).returning();
    
    return application;
  }

  async updatePropertyMatchStatus(
    collectionId: string, 
    municipalDataId: string, 
    status: string, 
    userId: string
  ): Promise<void> {
    await db.update(propertyMatches)
      .set({ 
        status,
        reviewedBy: userId,
        reviewedAt: new Date(),
      })
      .where(
        and(
          eq(propertyMatches.collectionId, collectionId),
          eq(propertyMatches.municipalDataId, municipalDataId)
        )
      );
  }
}

export const storage = new DatabaseStorage();
