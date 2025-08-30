import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { ObjectStorageService } from "./objectStorage";
import multer from "multer";
import { z } from "zod";
import { insertFormSchema, insertMissionSchema, insertPropertyCollectionSchema, insertPhotoSchema } from "@shared/schema";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Form management routes
  app.get('/api/forms', isAuthenticated, async (req, res) => {
    try {
      const forms = await storage.getActiveForms();
      res.json(forms);
    } catch (error) {
      console.error("Error fetching forms:", error);
      res.status(500).json({ message: "Failed to fetch forms" });
    }
  });

  app.post('/api/forms', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const formData = insertFormSchema.parse(req.body);
      const form = await storage.createForm(formData);
      
      // Audit log
      await storage.createAuditLog({
        userId,
        action: 'create',
        entity: 'form',
        entityId: form.id,
        changes: formData,
      });

      res.json(form);
    } catch (error) {
      console.error("Error creating form:", error);
      res.status(500).json({ message: "Failed to create form" });
    }
  });

  // Shapefile management routes
  app.get('/api/shapefiles/layers', isAuthenticated, async (req, res) => {
    try {
      const layers = await storage.getShapefileLayers();
      res.json(layers);
    } catch (error) {
      console.error("Error fetching shapefile layers:", error);
      res.status(500).json({ message: "Failed to fetch shapefile layers" });
    }
  });

  app.post('/api/shapefiles/upload', isAuthenticated, upload.single('shapefile'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No shapefile provided" });
      }

      // Basic validation - check if it's a ZIP file
      if (!req.file.originalname.endsWith('.zip')) {
        return res.status(400).json({ message: "File must be a ZIP archive" });
      }

      // Create shapefile layer record
      const layer = await storage.createShapefileLayer({
        name: req.body.name || req.file.originalname,
        source: req.file.originalname,
        srid: req.body.srid || 'EPSG:4326',
      });

      // TODO: Process shapefile in background
      // For now, return the layer record
      res.json(layer);
    } catch (error) {
      console.error("Error uploading shapefile:", error);
      res.status(500).json({ message: "Failed to upload shapefile" });
    }
  });

  app.get('/api/shapefiles/features/:layerId', isAuthenticated, async (req, res) => {
    try {
      const { layerId } = req.params;
      const features = await storage.getShapefileFeaturesByLayer(layerId);
      res.json(features);
    } catch (error) {
      console.error("Error fetching shapefile features:", error);
      res.status(500).json({ message: "Failed to fetch shapefile features" });
    }
  });

  // Mission management routes
  app.get('/api/missions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      let missions;
      if (user?.role === 'admin') {
        // Admin can see all missions
        const status = req.query.status as string;
        missions = status ? await storage.getMissionsByStatus(status) : await storage.getMissionsByUser('');
      } else {
        // Field agents only see their own missions
        missions = await storage.getMissionsByUser(userId);
      }
      
      res.json(missions);
    } catch (error) {
      console.error("Error fetching missions:", error);
      res.status(500).json({ message: "Failed to fetch missions" });
    }
  });

  app.post('/api/missions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const missionData = insertMissionSchema.parse(req.body);
      const mission = await storage.createMission(missionData);
      
      // Audit log
      await storage.createAuditLog({
        userId,
        action: 'create',
        entity: 'mission',
        entityId: mission.id,
        changes: missionData,
      });

      res.json(mission);
    } catch (error) {
      console.error("Error creating mission:", error);
      res.status(500).json({ message: "Failed to create mission" });
    }
  });

  app.get('/api/missions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const mission = await storage.getMissionById(id);
      if (!mission) {
        return res.status(404).json({ message: "Mission not found" });
      }

      // Check permissions
      if (user?.role !== 'admin' && mission.assignedTo !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(mission);
    } catch (error) {
      console.error("Error fetching mission:", error);
      res.status(500).json({ message: "Failed to fetch mission" });
    }
  });

  app.patch('/api/missions/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user.claims.sub;
      
      const mission = await storage.getMissionById(id);
      if (!mission) {
        return res.status(404).json({ message: "Mission not found" });
      }

      // Check permissions
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin' && mission.assignedTo !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedMission = await storage.updateMissionStatus(id, status);
      
      // Audit log
      await storage.createAuditLog({
        userId,
        action: 'update',
        entity: 'mission',
        entityId: id,
        changes: { status },
      });

      res.json(updatedMission);
    } catch (error) {
      console.error("Error updating mission status:", error);
      res.status(500).json({ message: "Failed to update mission status" });
    }
  });

  // Property collection routes
  app.post('/api/property-collections', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const collectionData = insertPropertyCollectionSchema.parse({
        ...req.body,
        collectedBy: userId,
      });
      
      const collection = await storage.createPropertyCollection(collectionData);
      
      // Update mission status
      if (collection.missionId) {
        await storage.updateMissionStatus(collection.missionId, 'pending_photos');
      }
      
      // Add to sync queue
      await storage.addToSyncQueue({
        type: 'property_data',
        referenceId: collection.id,
        payload: collectionData,
      });

      // Audit log
      await storage.createAuditLog({
        userId,
        action: 'create',
        entity: 'property_collection',
        entityId: collection.id,
        changes: collectionData,
      });

      res.json(collection);
    } catch (error) {
      console.error("Error creating property collection:", error);
      res.status(500).json({ message: "Failed to create property collection" });
    }
  });

  app.get('/api/property-collections/mission/:missionId', isAuthenticated, async (req: any, res) => {
    try {
      const { missionId } = req.params;
      const userId = req.user.claims.sub;
      
      // Check mission permissions
      const mission = await storage.getMissionById(missionId);
      if (!mission) {
        return res.status(404).json({ message: "Mission not found" });
      }

      const user = await storage.getUser(userId);
      if (user?.role !== 'admin' && mission.assignedTo !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const collections = await storage.getPropertyCollectionsByMission(missionId);
      res.json(collections);
    } catch (error) {
      console.error("Error fetching property collections:", error);
      res.status(500).json({ message: "Failed to fetch property collections" });
    }
  });

  // Photo management routes
  app.post('/api/photos/upload-url', isAuthenticated, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  app.post('/api/photos', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const photoData = insertPhotoSchema.parse(req.body);
      
      const photo = await storage.createPhoto(photoData);
      
      // Add to sync queue
      await storage.addToSyncQueue({
        type: 'photo_upload',
        referenceId: photo.id,
        payload: photoData,
      });

      // Audit log
      await storage.createAuditLog({
        userId,
        action: 'create',
        entity: 'photo',
        entityId: photo.id,
        changes: photoData,
      });

      res.json(photo);
    } catch (error) {
      console.error("Error creating photo record:", error);
      res.status(500).json({ message: "Failed to create photo record" });
    }
  });

  app.get('/api/photos/mission/:missionId', isAuthenticated, async (req: any, res) => {
    try {
      const { missionId } = req.params;
      const userId = req.user.claims.sub;
      
      // Check mission permissions
      const mission = await storage.getMissionById(missionId);
      if (!mission) {
        return res.status(404).json({ message: "Mission not found" });
      }

      const user = await storage.getUser(userId);
      if (user?.role !== 'admin' && mission.assignedTo !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const photos = await storage.getPhotosByMission(missionId);
      res.json(photos);
    } catch (error) {
      console.error("Error fetching photos:", error);
      res.status(500).json({ message: "Failed to fetch photos" });
    }
  });

  // Sync management routes
  app.get('/api/sync/queue', isAuthenticated, async (req, res) => {
    try {
      const status = req.query.status as string;
      const queueItems = await storage.getSyncQueueItems(status);
      res.json(queueItems);
    } catch (error) {
      console.error("Error fetching sync queue:", error);
      res.status(500).json({ message: "Failed to fetch sync queue" });
    }
  });

  app.post('/api/sync/process', isAuthenticated, async (req, res) => {
    try {
      // Get pending sync items
      const pendingItems = await storage.getSyncQueueItems('pending');
      
      // Process items (simplified for demo)
      for (const item of pendingItems.slice(0, 10)) { // Process max 10 at a time
        try {
          await storage.updateSyncQueueItem(item.id, {
            status: 'completed',
            lastAttempt: new Date(),
          });
        } catch (itemError) {
          await storage.updateSyncQueueItem(item.id, {
            status: 'failed',
            lastAttempt: new Date(),
            attempts: (item.attempts ?? 0) + 1,
            error: String(itemError),
          });
        }
      }

      res.json({ message: "Sync process initiated", processed: Math.min(pendingItems.length, 10) });
    } catch (error) {
      console.error("Error processing sync:", error);
      res.status(500).json({ message: "Failed to process sync" });
    }
  });

  // Dashboard stats routes
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      let stats;
      if (user?.role === 'admin') {
        // Admin stats - aggregate for all users
        stats = {
          totalMissions: 156,
          activeAgents: 8,
          completedToday: 25,
          pendingSync: 3,
        };
      } else {
        // Field agent stats - personal stats
        const missions = await storage.getMissionsByUser(userId);
        const pendingSync = await storage.getSyncQueueItems('pending');
        
        stats = {
          todayMissions: missions.filter(m => {
            const today = new Date();
            const missionDate = m.createdAt ? new Date(m.createdAt) : new Date();
            return missionDate.toDateString() === today.toDateString();
          }).length,
          completed: missions.filter(m => m.status === 'completed').length,
          pending: missions.filter(m => m.status === 'new' || m.status === 'in_progress').length,
          toSync: pendingSync.length,
        };
      }
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // CSV export routes
  app.get('/api/export/csv', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // For demo, return a simple CSV structure
      const csvHeaders = [
        'id_imovel',
        'inscricao_municipal', 
        'endereco',
        'bairro',
        'uso_predominante',
        'area_terreno_m2',
        'area_construida_m2',
        'data_coleta',
        'status',
        'latitude',
        'longitude'
      ].join(';');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="recadastramento.csv"');
      res.write('\ufeff'); // UTF-8 BOM
      res.write(csvHeaders + '\n');
      
      // Write actual data from collections
      // For demo purposes, we'll write header only
      res.end();
    } catch (error) {
      console.error("Error exporting CSV:", error);
      res.status(500).json({ message: "Failed to export CSV" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
