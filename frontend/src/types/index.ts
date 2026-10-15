export enum Role {
  ADMIN = 'ADMIN',
  DISPATCHER = 'DISPATCHER',
  DRIVER = 'DRIVER',
}

export enum LoadStatus {
  PENDING = 'pending',
  DISPATCHED = 'dispatched',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
}

export enum DocumentType {
  RATE_CONFIRMATION = 'RATE_CONFIRMATION',
  BOL = 'BOL',
  POD = 'POD',
  LUMPER_RECEIPT = 'LUMPER_RECEIPT',
  DELIVERY_RECEIPT = 'DELIVERY_RECEIPT',
  OTHER = 'OTHER',
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  phone?: string;
  payPercentage?: number;
  status?: 'ACTIVE' | 'INACTIVE';
  mustChangePassword?: boolean;
  companyId?: string;
  avatarUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Company {
  id: string;
  name: string;
  mcNumber?: string | null;
  dotNumber?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  phone?: string | null;
  email?: string | null;
  tinConfigured?: boolean;
  tinMasked?: string | null;
  logoUrl?: string | null;
  brandColor?: string | null;
  status?: string;
  dispatchNotificationTemplate?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  licenseNumber: string;
  licenseExpiry?: string;
  cdlClass?: string | null;
  cdlEndorsements?: string | null;
  cdlRestrictions?: string | null;
  cdlIssueDate?: string | null;
  dateOfBirth?: string | null;
  medicalCardExpiry?: string | null;
  clearinghouseRenewalDate?: string | null;
  mailingAddress?: string | null;
  mailingCity?: string | null;
  mailingState?: string | null;
  mailingZip?: string | null;
  tin?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  userId?: string;
  companyId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Truck {
  id: string;
  unitNumber: string;
  make?: string;
  model?: string;
  year?: number;
  type?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  vin?: string;
  licensePlate?: string;
  companyId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Broker {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  mcNumber?: string;
  dotNumber?: string;
  contactName?: string;
  companyId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoadStop {
  id: string;
  stopType: 'PICKUP' | 'DELIVERY';
  stopSequence: number;
  facilityName: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  appointmentDate?: string;
  appointmentStart?: string;
  appointmentEnd?: string;
  contactName?: string;
  contactPhone?: string;
  instructions?: string;
  arrivedAt?: string;
  departedAt?: string;
}

export interface Load {
  id: string;
  loadNumber: string;
  brokerReference?: string;
  status: LoadStatus;
  brokerId: string;
  broker?: Broker;
  driverId?: string;
  driver?: Driver;
  truckId?: string;
  truck?: Truck;
  rate: number;
  currency?: string;
  commodity?: string;
  weight?: number;
  weightUnit?: 'LBS' | 'KG';
  equipmentType?: string;
  specialInstructions?: string;
  stops: LoadStop[];
  companyId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoadStatusHistory {
  id: string;
  loadId: string;
  status: LoadStatus;
  previousStatus?: LoadStatus;
  notes?: string;
  changedBy?: string;
  changedByUser?: User;
  createdAt: string;
}

export interface Document {
  id: string;
  loadId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  documentType: DocumentType;
  storagePath?: string;
  uploadedBy?: string;
  uploadedByUser?: User;
  createdAt: string;
}

export interface DocumentExtraction {
  id: string;
  documentId: string;
  fieldName: string;
  extractedValue: string;
  confidence: number;
  verifiedValue?: string;
  isVerified?: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  loadId?: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId?: string;
  user?: User;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface DashboardStats {
  totalLoads: number;
  activeLoads: number;
  completedLoads: number;
  revenue: number;
  revenueThisMonth: number;
  activeDrivers: number;
  availableTrucks: number;
  missingDocuments: number;
}