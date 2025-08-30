export interface Mission {
  id: string;
  featureId?: string;
  assignedTo?: string;
  formId?: string;
  priority: 'low' | 'medium' | 'high';
  deadline?: Date;
  status: 'new' | 'in_progress' | 'pending_photos' | 'completed' | 'approved' | 'rejected';
  latitude?: number;
  longitude?: number;
  address?: string;
  propertyCode?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PropertyCollection {
  id: string;
  missionId?: string;
  formResponses: Record<string, any>;
  latitude: number;
  longitude: number;
  accuracy?: number;
  collectedBy?: string;
  collectedAt: Date;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'error';
  version: number;
}

export interface Photo {
  id: string;
  collectionId?: string;
  missionId?: string;
  type: 'facade' | 'number' | 'lateral' | 'back';
  filename: string;
  localPath?: string;
  remotePath?: string;
  isPrimary: boolean;
  latitude?: number;
  longitude?: number;
  width?: number;
  height?: number;
  fileSize?: number;
  capturedAt: Date;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'error';
}

export interface Form {
  id: string;
  version: string;
  title: string;
  schemaJson: FormSchema;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FormSchema {
  form_id: string;
  title: string;
  sections: FormSection[];
  logic?: FormLogic[];
  geofence_required?: boolean;
  gps_accuracy_max_m?: number;
}

export interface FormSection {
  id: string;
  title: string;
  fields: FormField[];
  collapsible?: boolean;
  required?: boolean;
}

export interface FormField {
  id: string;
  type: 'text' | 'number' | 'date' | 'time' | 'select' | 'multiselect' | 'checkbox' | 'photo' | 'coordinates';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  min?: number;
  max?: number;
  min_count?: number;
  max_count?: number;
  validation?: {
    pattern?: string;
    message?: string;
  };
}

export interface FormLogic {
  if: {
    field: string;
    eq?: string;
    neq?: string;
    gt?: number;
    lt?: number;
  };
  show?: string[];
  hide?: string[];
  require?: string[];
}

export interface ShapefileLayer {
  id: string;
  name: string;
  source?: string;
  srid: string;
  isActive: boolean;
  createdAt: Date;
}

export interface ShapefileFeature {
  id: string;
  layerId?: string;
  geometry: import('geojson').Geometry;
  properties: Record<string, any>;
  createdAt: Date;
}

export interface SyncQueueItem {
  id: string;
  type: string;
  referenceId: string;
  payload: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  lastAttempt?: Date;
  error?: string;
  createdAt: Date;
}

export interface GPSCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  timestamp: Date;
}

export interface NavigationOptions {
  provider: 'google' | 'waze';
  mode: 'driving' | 'walking';
}

export interface DashboardStats {
  todayMissions?: number;
  totalMissions?: number;
  completed: number;
  pending: number;
  toSync: number;
  activeAgents?: number;
  completedToday?: number;
  pendingSync?: number;
}
