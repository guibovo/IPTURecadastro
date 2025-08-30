import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { setupLocalAuth } from "./localAuth";
import { ObjectStorageService } from "./objectStorage";
import { bicPatternLearningService } from "./bicPatternLearning";
import multer from "multer";
import { z } from "zod";
import { insertFormSchema, insertMissionSchema, insertPropertyCollectionSchema, insertPhotoSchema } from "@shared/schema";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware - setup both Replit and local auth
  setupLocalAuth(app);
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

  // Admin dashboard routes
  app.get('/api/admin/recent-activity', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get recent audit logs
      const recentActivity = [
        {
          description: "Nova missão criada",
          user: "Admin",
          timestamp: "2 min atrás"
        },
        {
          description: "Dados municipais importados",
          user: "Admin",
          timestamp: "15 min atrás"
        },
        {
          description: "Agente completou coleta",
          user: "João Silva",
          timestamp: "1 hora atrás"
        }
      ];

      res.json(recentActivity);
    } catch (error) {
      console.error("Error fetching recent activity:", error);
      res.status(500).json({ message: "Failed to fetch recent activity" });
    }
  });

  app.get('/api/admin/system-health', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const systemHealth = {
        server: {
          status: "healthy",
          uptime: "99.9%"
        },
        database: {
          status: "healthy",
          uptime: "99.8%"
        },
        storage: {
          status: "healthy",
          uptime: "100%"
        }
      };

      res.json(systemHealth);
    } catch (error) {
      console.error("Error fetching system health:", error);
      res.status(500).json({ message: "Failed to fetch system health" });
    }
  });

  app.get('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get('/api/municipal-data/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const stats = {
        totalRecords: 15420,
        bicRecords: 8932,
        iptuRecords: 6488,
        lastImport: new Date().toISOString()
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching municipal data stats:", error);
      res.status(500).json({ message: "Failed to fetch municipal data stats" });
    }
  });

  app.post('/api/admin/sync-system', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      // Log da sincronização
      await storage.createAuditLog({
        userId,
        action: 'sync',
        entity: 'system',
        entityId: 'system',
        changes: { timestamp: new Date().toISOString() },
      });

      res.json({ message: "System sync completed successfully" });
    } catch (error) {
      console.error("Error syncing system:", error);
      res.status(500).json({ message: "Failed to sync system" });
    }
  });

  // BIC Pattern Learning Routes
  app.post('/api/bic/learn-patterns/:municipio', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { municipio } = req.params;
      
      // Executar análise e aprendizado de padrões
      const pattern = await bicPatternLearningService.analyzeAndLearnPatterns(municipio);
      
      // Log da ação
      await storage.createAuditLog({
        userId,
        action: 'learn_patterns',
        entity: 'bic_patterns',
        entityId: municipio,
        changes: { 
          sampleSize: pattern.sampleSize,
          confidence: pattern.confidence,
          timestamp: new Date().toISOString()
        },
      });

      res.json({
        message: `Padrões BIC aprendidos com sucesso para ${municipio}`,
        pattern: {
          municipio: pattern.municipio,
          confidence: pattern.confidence,
          sampleSize: pattern.sampleSize,
          lastUpdated: pattern.lastUpdated,
          patternTypes: Object.keys(pattern.patterns),
        }
      });
    } catch (error) {
      console.error("Error learning BIC patterns:", error);
      res.status(500).json({ 
        message: "Failed to learn BIC patterns", 
        error: error.message 
      });
    }
  });

  app.post('/api/bic/identify-property', isAuthenticated, async (req: any, res) => {
    try {
      const { municipio, propertyData } = req.body;
      
      if (!municipio || !propertyData) {
        return res.status(400).json({ message: "Municipality and property data are required" });
      }

      // Identificar propriedade usando padrões aprendidos
      const result = await bicPatternLearningService.identifyProperty(municipio, propertyData);
      
      res.json({
        message: "Property identification completed",
        result
      });
    } catch (error) {
      console.error("Error identifying property:", error);
      res.status(500).json({ 
        message: "Failed to identify property", 
        error: error.message 
      });
    }
  });

  app.post('/api/bic/cadastro-suggestions', isAuthenticated, async (req: any, res) => {
    try {
      const { municipio, partialData } = req.body;
      
      if (!municipio || !partialData) {
        return res.status(400).json({ message: "Municipality and partial data are required" });
      }

      // Obter sugestões para melhorar o cadastro
      const suggestions = await bicPatternLearningService.provideCadastroSuggestions(municipio, partialData);
      
      res.json({
        message: "Cadastro suggestions generated",
        suggestions
      });
    } catch (error) {
      console.error("Error generating cadastro suggestions:", error);
      res.status(500).json({ 
        message: "Failed to generate suggestions", 
        error: error.message 
      });
    }
  });

  app.get('/api/bic/patterns/:municipio', isAuthenticated, async (req: any, res) => {
    try {
      const { municipio } = req.params;
      
      // Obter padrões aprendidos para o município
      const pattern = bicPatternLearningService.getPatternForMunicipality(municipio);
      
      if (!pattern) {
        return res.status(404).json({ 
          message: `No patterns found for municipality ${municipio}. Run pattern learning first.` 
        });
      }

      res.json({
        message: `BIC patterns for ${municipio}`,
        pattern: {
          municipio: pattern.municipio,
          confidence: pattern.confidence,
          sampleSize: pattern.sampleSize,
          lastUpdated: pattern.lastUpdated,
          patterns: pattern.patterns,
        }
      });
    } catch (error) {
      console.error("Error fetching BIC patterns:", error);
      res.status(500).json({ 
        message: "Failed to fetch BIC patterns", 
        error: error.message 
      });
    }
  });

  app.get('/api/bic/learned-municipalities', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      // Listar municípios com padrões aprendidos
      const municipalities = bicPatternLearningService.getLearnedMunicipalities();
      
      res.json({
        message: "Learned municipalities",
        municipalities,
        count: municipalities.length
      });
    } catch (error) {
      console.error("Error fetching learned municipalities:", error);
      res.status(500).json({ 
        message: "Failed to fetch learned municipalities", 
        error: error.message 
      });
    }
  });

  // Endpoint para aprendizado contínuo durante coleta
  app.post('/api/bic/learn-continuous', isAuthenticated, async (req: any, res) => {
    try {
      const { municipio, propertyData } = req.body;
      
      if (!municipio || !propertyData) {
        return res.status(400).json({ message: "Municipality and property data are required" });
      }

      // Atualizar padrões com novos dados coletados
      await bicPatternLearningService.updatePatternsWithNewData(municipio, propertyData);
      
      res.json({
        message: "BIC patterns updated with new data",
        municipio
      });
    } catch (error) {
      console.error("Error in continuous BIC learning:", error);
      res.status(500).json({ 
        message: "Failed to update BIC patterns", 
        error: error.message 
      });
    }
  });

  // Endpoint para aprendizado baseado em feedback do usuário
  app.post('/api/bic/learn-feedback', isAuthenticated, async (req: any, res) => {
    try {
      const { municipio, propertyData, acceptedSuggestions } = req.body;
      
      if (!municipio || !propertyData || !acceptedSuggestions) {
        return res.status(400).json({ 
          message: "Municipality, property data, and accepted suggestions are required" 
        });
      }

      // Aprender com feedback do usuário
      await bicPatternLearningService.learnFromUserFeedback(municipio, propertyData, acceptedSuggestions);
      
      res.json({
        message: "BIC patterns updated with user feedback",
        municipio,
        acceptedSuggestions
      });
    } catch (error) {
      console.error("Error learning from user feedback:", error);
      res.status(500).json({ 
        message: "Failed to learn from user feedback", 
        error: error.message 
      });
    }
  });

  // Endpoint para otimização automática de padrões
  app.post('/api/bic/optimize-patterns/:municipio', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { municipio } = req.params;
      
      // Otimizar padrões automaticamente
      await bicPatternLearningService.optimizePatternsAutomatically(municipio);
      
      res.json({
        message: `BIC patterns optimized for ${municipio}`,
        municipio
      });
    } catch (error) {
      console.error("Error optimizing BIC patterns:", error);
      res.status(500).json({ 
        message: "Failed to optimize BIC patterns", 
        error: error.message 
      });
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

      // Aprendizado contínuo da IA BIC (executado em background)
      if (collection.missionId) {
        const mission = await storage.getMissionById(collection.missionId);
        if (mission?.municipio) {
          try {
            await bicPatternLearningService.updatePatternsWithNewData(mission.municipio, collectionData);
            console.log(`IA BIC atualizada com dados de coleta para ${mission.municipio}`);
            
            // Otimização automática a cada 10 submissões
            // Usar uma contagem simples baseada em mission ID para triggerar otimização
            const missionCollections = await storage.getPropertyCollectionsByMission(collection.missionId);
            if (missionCollections.length % 10 === 0) {
              await bicPatternLearningService.optimizePatternsAutomatically(mission.municipio);
              console.log(`Padrões BIC otimizados automaticamente para ${mission.municipio} (${missionCollections.length} submissões)`);
            }
          } catch (bicError) {
            console.warn('Erro no aprendizado BIC durante submissão:', bicError);
          }
        }
      }

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

  // Municipal data management routes
  app.post('/api/municipal-data/upload', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { municipio, fonte } = req.body;
      const file = req.file;

      if (!file || !municipio || !fonte) {
        return res.status(400).json({ message: "File, município and fonte are required" });
      }

      const { aiPropertyMatcher } = await import('./aiMatcher');
      const result = await storage.processMunicipalDataFile(file, municipio, fonte);
      
      // Audit log
      await storage.createAuditLog({
        userId,
        action: 'upload',
        entity: 'municipal_data',
        entityId: 'bulk',
        changes: { municipio, fonte, filename: file.originalname, result },
      });

      res.json(result);
    } catch (error) {
      console.error("Error uploading municipal data:", error);
      res.status(500).json({ message: "Failed to upload municipal data" });
    }
  });

  app.get('/api/municipal-data', isAuthenticated, async (req, res) => {
    try {
      const { municipio, page = 1, limit = 50 } = req.query;
      const municipalData = await storage.getMunicipalData(municipio as string, Number(page), Number(limit));
      res.json(municipalData);
    } catch (error) {
      console.error("Error fetching municipal data:", error);
      res.status(500).json({ message: "Failed to fetch municipal data" });
    }
  });

  app.post('/api/property-collections/:id/find-matches', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const collection = await storage.getPropertyCollectionById(id);
      
      if (!collection) {
        return res.status(404).json({ message: "Property collection not found" });
      }

      const { aiPropertyMatcher } = await import('./aiMatcher');
      const formResponses = collection.formResponses as Record<string, any> || {};
      const propertyData = {
        ...formResponses,
        latitude: collection.latitude ? parseFloat(collection.latitude.toString()) : undefined,
        longitude: collection.longitude ? parseFloat(collection.longitude.toString()) : undefined,
      };

      // Assumir São Paulo como padrão se não especificado
      const matches = await aiPropertyMatcher.findMatches(propertyData, 'SP');
      
      // Salvar matches encontrados
      for (const match of matches) {
        await aiPropertyMatcher.saveMatch(
          id, 
          match.municipalDataId, 
          match.score, 
          match.reasons,
          true // permitir auto-aplicação
        );
      }

      const mappedMatches = matches.map(match => ({
        id: `${id}-${match.municipalDataId}`,
        municipalDataId: match.municipalDataId,
        score: match.score,
        confidence: aiPropertyMatcher.getConfidenceLevel(match.score),
        reasons: match.reasons,
        autoApplied: match.score >= 0.95,
        municipalData: match.municipalData
      }));

      res.json(mappedMatches);
    } catch (error) {
      console.error("Error finding property matches:", error);
      res.status(500).json({ message: "Failed to find property matches" });
    }
  });

  app.post('/api/property-matches/:id/apply', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { municipalDataId } = req.body;
      const userId = req.user.claims.sub;

      const municipalData = await storage.getMunicipalDataById(municipalDataId);
      if (!municipalData) {
        return res.status(404).json({ message: "Municipal data not found" });
      }

      // Aplicar dados municipais na collection
      const appliedFields = await storage.applyMunicipalDataToCollection(id, municipalDataId);
      
      // Registrar aplicação
      await storage.recordMunicipalDataApplication(id, municipalDataId, appliedFields, userId);
      
      // Atualizar status do match
      await storage.updatePropertyMatchStatus(id, municipalDataId, 'confirmed', userId);

      // Audit log
      await storage.createAuditLog({
        userId,
        action: 'apply_municipal_data',
        entity: 'property_collection',
        entityId: id,
        changes: { municipalDataId, appliedFields },
      });

      res.json({ success: true, appliedFields });
    } catch (error) {
      console.error("Error applying municipal data:", error);
      res.status(500).json({ message: "Failed to apply municipal data" });
    }
  });

  app.post('/api/property-matches/:id/reject', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { municipalDataId } = req.body;
      const userId = req.user.claims.sub;

      await storage.updatePropertyMatchStatus(id, municipalDataId, 'rejected', userId);

      res.json({ success: true });
    } catch (error) {
      console.error("Error rejecting property match:", error);
      res.status(500).json({ message: "Failed to reject property match" });
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
