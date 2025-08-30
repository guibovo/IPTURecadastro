# Replit.md

## Overview

This is a municipal property data collection application designed for field agents and administrators to conduct property surveys and update IPTU (property tax) records. The system provides both mobile and desktop interfaces with offline-first capabilities, allowing field workers to collect property data, capture photos, and sync with servers when connectivity is available.

The application supports multi-user workflows with role-based access control (field agents and administrators), dynamic form management, shapefile import for geographic data visualization, comprehensive data synchronization mechanisms, and AI-powered BIC (Boletim de Informações Cadastrais) pattern learning for intelligent property identification and automated data entry assistance.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript in a Vite-powered SPA
- **UI Framework**: Shadcn/ui components built on Radix UI primitives with Tailwind CSS styling
- **Routing**: Wouter for client-side routing with authentication-based route protection
- **State Management**: TanStack Query for server state management and caching
- **Offline Storage**: IndexedDB through a custom OfflineStorage class for local data persistence
- **Maps**: Leaflet integration for geographic data visualization and user location tracking
- **Forms**: React Hook Form with Zod validation for dynamic form rendering and data collection

### Backend Architecture  
- **Runtime**: Node.js with Express.js REST API
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Database Provider**: Neon serverless PostgreSQL with connection pooling
- **Authentication**: Replit's OpenID Connect (OIDC) authentication system with session management
- **File Storage**: Google Cloud Storage integration with custom ACL (Access Control List) policies
- **Session Store**: PostgreSQL-backed sessions using connect-pg-simple

### Data Storage Solutions
- **Primary Database**: PostgreSQL hosted on Neon with the following key tables:
  - Users (authentication and role management)
  - Forms (dynamic form definitions with JSON schemas)
  - Missions (property collection assignments)
  - PropertyCollections (survey data responses)
  - Photos (image metadata and storage references)
  - ShapefileLayers and ShapefileFeatures (geographic boundary data)
  - SyncQueue (offline synchronization tracking)
  - AuditLog (system activity tracking)
- **Local Storage**: IndexedDB for offline data persistence with sync status tracking
- **File Storage**: Google Cloud Storage for photos and shapefile uploads

### Authentication and Authorization
- **Provider**: Replit Auth using OpenID Connect protocol
- **Session Management**: Server-side sessions stored in PostgreSQL with configurable TTL
- **Role-Based Access**: Two primary roles (field_agent, admin) with route-level protection
- **API Security**: Credential-based authentication for all API endpoints

### External Dependencies

**Core Infrastructure:**
- Neon PostgreSQL database for primary data storage
- Google Cloud Storage for file and photo storage
- Replit Authentication service for user management

**Geographic Data Processing:**
- Leaflet for interactive map rendering
- OpenStreetMap tiles for base map layers
- Shapefile processing capabilities for importing geographic boundaries

**Development and Deployment:**
- Vite for frontend build tooling and development server
- ESBuild for backend TypeScript compilation
- Drizzle Kit for database schema migrations

**Frontend Libraries:**
- TanStack Query for API state management and caching
- React Hook Form for form state management
- Zod for runtime type validation
- Radix UI for accessible component primitives
- Tailwind CSS for styling system

**Backend Libraries:**
- Express.js for HTTP server and routing
- Drizzle ORM for database operations
- Multer for file upload handling
- OpenID Client for authentication flows

The system is designed with offline-first principles, allowing field agents to work without internet connectivity and sync data when connection is restored. The architecture supports dynamic form creation by administrators, real-time GPS tracking for accurate property location data, and AI-powered municipal data pattern learning that provides intelligent property identification, automated suggestions, and context-aware data entry assistance based on municipality-specific BIC patterns.

## Recent AI Enhancements

### BIC Pattern Learning System (Latest)
- **AI-Powered Pattern Analysis**: Machine learning system that analyzes municipal BIC data to identify location-specific patterns in property addresses, codes, owner names, and property characteristics
- **Municipality-Specific Learning**: Each municipality's data patterns are learned independently, ensuring high accuracy for local conventions and standards
- **Intelligent Property Identification**: Real-time analysis of property data during collection with confidence scoring for address matching, owner identification, property code validation, and location verification
- **Smart Auto-Fill Suggestions**: Context-aware suggestions for property data entry based on learned municipal patterns, including address format recommendations, property type suggestions, and data validation warnings
- **Rapid Property Matching**: Advanced string matching algorithms identify potential property matches in existing BIC data with detailed confidence metrics
- **Administrative Interface**: Comprehensive dashboard for managing AI training, viewing learned patterns, monitoring identification accuracy, and analyzing system performance per municipality