// lib/types/comparison.ts

// ── Types d'anomalies ─────────────────────────────────────────────────────────

export type AnomalyType = "duplicate" | "divergence" | "new" | "missing" | "complex";

export type TableName = 
  | "feeder"
  | "substation"
  | "power_transformer"
  | "busbar"
  | "bay"
  | "switch"
  | "wire"
  | "structure"
  | "arms"
  | "bt_boards"
  | "customers";

// ── Champ divergent ──────────────────────────────────────────────────────────

export interface DivergentField {
  field: string;
  reference_value: any;
  collected_value: any;
}

// ── Cas d'anomalie ───────────────────────────────────────────────────────────

export interface AnomalyCase {
  id: string;
  type: AnomalyType;
  table: TableName;
  mrid: string;
  name: string | null;
  reference_record: Record<string, any> | null;
  collected_record: Record<string, any> | null;
  duplicate_occurrences?: Record<string, any>[];
  divergent_fields?: DivergentField[];
  complex_reason?: string | null;
  feeder_name: string | null;
  substation_name: string | null;
}

// ── Résultat de comparaison ──────────────────────────────────────────────────

export interface ComparisonSummary {
  total: number;
  duplicate: number;
  divergence: number;
  new: number;
  missing: number;
  complex: number;
}

export interface ComparisonResult {
  analyzed_at: string;
  summary: ComparisonSummary;
  cases: AnomalyCase[];
}

// ── Équipements de référence (MySQL) ─────────────────────────────────────────

export interface ReferenceFeeder {
  m_rid: string;
  name: string;
  voltage: number;
  is_injection: number;
  created_at: string;
}

export interface ReferenceSubstation {
  m_rid: string;
  name: string;
  type: string | null;
  regime: string | null;
  zone_type: string | null;
  exploitation: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface ReferenceTransformer {
  m_rid: string;
  name: string | null;
  apparent_power: number | null;
  w1_voltage: number | null;
  w2_voltage: string | null;
  active: number | null;
}

export interface ReferenceBay {
  m_rid: string;
  name: string | null;
  type: string | null;
  voltage: number | null;
  busbar_id: string | null;
}

export interface ReferenceSwitch {
  m_rid: string;
  name: string | null;
  type: string | null;
  phase: string | null;
  voltage: number | null;
  normal_open: number | null;
}

export interface ReferencePrimarySubstation {
  id: string;
  name: string;
}

export interface ReferenceData {
  feeder: ReferenceFeeder;
  primary_substation: ReferencePrimarySubstation | null;
  substations: ReferenceSubstation[];
  power_transformers: ReferenceTransformer[];
  bays: ReferenceBay[];
  switches: ReferenceSwitch[];
}

// ── Équipements collectés (PostGIS) ──────────────────────────────────────────

export interface CollectedFeeder {
  m_rid: string;
  name: string;
  voltage: number;
  created_at: string;
  collected_by: string;
  collected_at: string;
}

export interface CollectedSubstation {
  m_rid: string;
  name: string;
  type: string | null;
  regime: string | null;
  exploitation: string | null;
  latitude: number | null;
  longitude: number | null;
  photo: string | null;
  created_at: string;
  qrcode: string | null;
}

export interface CollectedTransformer {
  m_rid: string;
  name: string | null;
  apparent_power: number | null;
  w1_voltage: number | null;
  w2_voltage: string | null;
  active: number | null;
  photo: string | null;
  created_at: string;
  collected_by: string;
  collected_at: string;
}

export interface CollectedBay {
  m_rid: string;
  name: string | null;
  type: string | null;
  voltage: number | null;
  status: string | null;
  photo: string | null;
  created_at: string;
  busbar_m_rid: number | null;
  qrcode: string | null;
}

export interface CollectedSwitch {
  m_rid: string;
  name: string | null;
  type: string | null;
  phase: string | null;
  voltage: number | null;
  normal_open: number | null;
  created_at: string;
  bay_m_rid: number | null;
  qrcode: string | null;
}

export interface CollectedBTBoard {
  m_rid: string;
  type: string | null;
  capacite: string | null;
  photo: string | null;
  power_transformers_m_rid: number | null;
}

export interface CollectedArms {
  m_rid: string;
  type: string | null;
  count: string | null;
  status: string | null;
  pole_m_rid: number | null;
}

export interface CollectedSummary {
  substations: number;
  power_transformers: number;
  bays: number;
  switches: number;
  bt_boards: number;
  arms: number;
}

export interface CollectedData {
  feeder: CollectedFeeder;
  substations: CollectedSubstation[];
  power_transformers: CollectedTransformer[];
  bays: CollectedBay[];
  switches: CollectedSwitch[];
  bt_boards: CollectedBTBoard[];
  arms: CollectedArms[];
  summary: CollectedSummary;
}

// ── Feeder complet avec ses deux blocs ───────────────────────────────────────

export interface FeederComparison {
  feeder_id: string;
  reference: ReferenceData;
  collected: CollectedData;
}

export interface FeedersResponse {
  count: number;
  feeders: FeederComparison[];
}

// ── État de santé ────────────────────────────────────────────────────────────

export interface HealthResponse {
  status: string;
  service: string;
  postgresql: string;
  mysql: string;
}

// ── Erreur API ───────────────────────────────────────────────────────────────

export interface ApiError {
  detail: string;
}