// =============================================================================
// ENEO ASSETS — Types TypeScript
// Les identifiants (m_rid) peuvent être number ou string selon la table.
// =============================================================================

export type MRid = number | string;

// ─── Feeder (Départ) ─────────────────────────────────────────────────────────
export interface Feeder {
  m_rid: MRid;
  name: string;
  voltage: number;
  is_injection: boolean;
  created_date: string;
  local_name: string;
}

// ─── Substation (Poste HTA/BT) ───────────────────────────────────────────────
export interface Substation {
  m_rid: MRid;
  name: string;
  highest_voltage_level: number;
  second_substation_id: string;
  exploitation: string;
  latitude: number | null;
  longitude: number | null;
  localisation: string;
  regime: string;
  type: string;
  zone_type: string;
  security_zone_id: string;
  feeder_id: MRid;
  active: boolean;
  display_scada: boolean;
  created_date: string;
}

// ─── PowerTransformer (Transformateur) ───────────────────────────────────────
export interface PowerTransformer {
  m_rid: MRid;
  name: string;
  apparent_power: number;
  substation_id: MRid;
  t1: string;
  t2: string;
  w1_voltage: number;
  w2_voltage: number;
  active: boolean;
  display_scada: boolean;
  created_date: string;
}

// ─── Busbar (Jeu de barres) ───────────────────────────────────────────────────
export interface Busbar {
  m_rid: MRid;
  substation_id: MRid;
  name: string;
  voltage: number;
  phase: string;
  t1: string;
  is_injection: boolean;
  is_feederhead: boolean;
  active: boolean;
  display_scada: boolean;
  created_date: string;
}

// ─── Bay (Travée) ─────────────────────────────────────────────────────────────
export interface Bay {
  m_rid: MRid;
  name: string;
  type: string;
  voltage: number;
  busbar_id1: MRid;
  busbar_id2: MRid;
  substation_id: MRid;
  created_date: string;
  active: boolean;
  display_scada: boolean;
}

// ─── Switch (Appareillage de coupure) ────────────────────────────────────────
export interface Switch {
  m_rid: MRid;
  bay_mrid: MRid;
  nature: string;
  voltage: number;
  second_switch_id: string;
  pole_mrid: MRid;
  name: string;
  normal_open: boolean;
  phase: string;
  t1: string;
  t2: string;
  type: string;
  feeder_id: MRid;
  active: boolean;
  display_scada: boolean;
  created_date: string;
}

// ─── Wire (Conducteur) ───────────────────────────────────────────────────────
export interface Wire {
  m_rid: MRid;
  nature_conducteur: string;
  phase: string;
  section: string;
  type: string;
  t1: string;
  t2: string;
  feeder_id: MRid;
  active: boolean;
  display_scada: boolean;
  created_date: string;
}

// ─── Pole (Appui) ─────────────────────────────────────────────────────────────
export interface Pole {
  m_rid: MRid;
  feeder_id: MRid;
  height: number;
  longitude: string;
  lattitude: string;
  type: string;
  is_derivation: string;
  installation_date: string;
  lastvisit_date: string;
}

// ─── Node (Nœud réseau) ──────────────────────────────────────────────────────
export interface Node {
  m_rid: MRid;
  pole_id: MRid;
  code: string;
}

// ─── Base de données complète ────────────────────────────────────────────────
export interface EneoAssetsDB {
  feeder: Feeder[];
  substation: Substation[];
  powertransformer: PowerTransformer[];
  busbar: Busbar[];
  bay: Bay[];
  switch: Switch[];
  wire: Wire[];
  pole: Pole[];
  node: Node[];
}

// =============================================================================
// Types pour le service de comparaison
// =============================================================================

/** Les 5 types d'anomalie possibles */
export type AnomalyType =
  | "duplicate"    // Présent dans BD2 mais déjà dans BD1 → identique
  | "divergence"   // Présent dans les deux BD mais avec des différences de valeurs
  | "new"          // Présent dans BD2 mais absent de BD1
  | "missing"      // Présent dans BD1 mais absent de BD2
  | "complex";     // Aucun des cas simples ci-dessus

/** Tables concernées par la comparaison */
export type TableName = keyof EneoAssetsDB;

/** Champ divergent entre les deux couches */
export interface DivergentField {
  field: string;
  layer1Value: unknown;
  layer2Value: unknown;
}

/** Un cas d'anomalie détecté */
export interface AnomalyCase {
  id: string;                    // Identifiant unique du cas
  type: AnomalyType;
  table: TableName;
  mrid: MRid;                    // m_rid de l'enregistrement concerné
  layer1Record: Record<string, unknown> | null;  // Enregistrement BD1 (null si nouveau)
  layer2Record: Record<string, unknown> | null;  // Enregistrement BD2 (null si manquant)
  divergentFields?: DivergentField[];            // Champs différents (pour "divergence")
  duplicateOf?: MRid;                            // m_rid du doublon (pour "duplicate")
  complexReason?: string;                        // Explication (pour "complex")
  feederName?: string;                           // Nom du départ pour affichage

}

/** Résultat global de la comparaison */
export interface ComparisonResult {
  analyzedAt: string;
  layer1Summary: { [K in TableName]: number };
  layer2Summary: { [K in TableName]: number };
  cases: AnomalyCase[];
  stats: {
    total: number;
    duplicate: number;
    divergence: number;
    new: number;
    missing: number;
    complex: number;
  };
}