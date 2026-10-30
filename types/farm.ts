// ─────────────────────────────────────────────────────────────
// Farm Domain Types
// ─────────────────────────────────────────────────────────────

/** Cardinal compass/geographic direction for farm zones. */
export type Direction = 'north' | 'south' | 'east' | 'west' | 'central';

/** Operational state of any monitored asset or zone. */
export type OperationalStatus =
  | 'active'
  | 'scheduled'
  | 'idle'
  | 'maintenance'
  | 'offline'
  | 'optimal';

/** Irrigation system types available in the farm. */
export type IrrigationMethod =
  | 'drip'
  | 'sprinkler'
  | 'pivot'
  | 'fertigation'
  | 'flood'
  | 'subsurface';

// ─────────────────────────────────────────────────────────────
// Field & Crop
// ─────────────────────────────────────────────────────────────

export interface CropRecord {
  id: string;
  name: string;
  variety: string;
  plantedAt: string; // ISO date string
  expectedHarvestAt: string;
  fieldId: string;
}

export interface FieldSector {
  id: string;
  name: string;
  areaHectares: number;
  direction: Direction;
  /** Primary crop currently planted in this sector. */
  crop: string;
  /** Soil moisture percentage (0-100). */
  moisture: number;
  /** Human-readable status label shown in the UI. */
  status: string;
  /** CSS custom property string or hex for status badge colour. */
  statusColor: string;
  operationalStatus: OperationalStatus;
}

// ─────────────────────────────────────────────────────────────
// Irrigation
// ─────────────────────────────────────────────────────────────

export interface IrrigationScheduleEntry {
  id: string;
  /** UTC time label shown in the UI, e.g. "18:30 UTC". */
  time: string;
  title: string;
  description: string;
  method: IrrigationMethod;
  /** Water volume in litres. */
  volumeLitres: number;
  status: 'in-progress' | 'queued' | 'scheduled' | 'completed' | 'cancelled';
  /** CSS custom property or hex for status colour. */
  badgeColor: string;
}

// ─────────────────────────────────────────────────────────────
// Telemetry / KPI Metrics
// ─────────────────────────────────────────────────────────────

export interface KpiMetric {
  id: string;
  label: string;
  value: string;
  trend: string;
  isPositive: boolean;
  /** CSS custom property string, e.g. "var(--accent-emerald)". */
  accentColor: string;
}

// ─────────────────────────────────────────────────────────────
// IoT / Sensor
// ─────────────────────────────────────────────────────────────

export type SensorType =
  | 'soil-moisture'
  | 'temperature'
  | 'humidity'
  | 'light'
  | 'wind-speed'
  | 'rain-gauge'
  | 'ndvi';

export interface SensorReading {
  sensorId: string;
  sensorType: SensorType;
  value: number;
  unit: string;
  recordedAt: string; // ISO datetime
  fieldId: string;
}

// ─────────────────────────────────────────────────────────────
// Machinery & Fleet
// ─────────────────────────────────────────────────────────────

export type MachineryStatus = 'operational' | 'in-use' | 'maintenance' | 'decommissioned';

export interface MachineryRecord {
  id: string;
  name: string;
  type: string;
  status: MachineryStatus;
  lastServicedAt: string;
  fuelLevel?: number; // 0-100 percentage
}

// ─────────────────────────────────────────────────────────────
// User / Auth
// ─────────────────────────────────────────────────────────────

export type UserRole = 'owner' | 'agronomist' | 'operator' | 'viewer';

export interface FarmUser {
  id: string;
  name: string;
  role: UserRole;
  initials: string;
  email: string;
}

export interface FarmProfile {
  id: string;
  name: string;
  zone: string;
  totalAreaHectares: number;
  owner: FarmUser;
}
