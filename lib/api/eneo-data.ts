// =============================================================================
// lib/api/eneo-data-real.ts
// Adaptateur : connecte le ComparisonService aux structures attendues
// par les pages duplicates, divergences, new-data et missing-records.
//
// Remplace les données mock aléatoires par les vraies anomalies détectées.
// =============================================================================

import { AnomalyCase, TableName } from "../types/eneo-assets";
import { runComparison } from "./services/comparison.service";
import { layer1DB } from "@/data/layer1";

// ─── Structure de navigation DRD-O (Douala Ouest) ────────────────────────
// Découpage : DRD > DRD-O > Bonaberi > D11 / D12
// Adapté à votre BD qui ne couvre que Douala Ouest

export interface EneoDeparture {
  id: string;
  code: string;
  name: string;
  feederId: number | string;
  equipmentCount: number;          // nombre d'équipements BD1
  anomalyCounts: {
    duplicate: number;
    divergence: number;
    new: number;
    missing: number;
    complex: number;
  };
}

export interface EneoZone {
  id: string;
  code: string;
  name: string;
  departures: EneoDeparture[];
}

export interface EneoRegion {
  id: string;
  code: string;
  name: string;
  fullName: string;
  zones: EneoZone[];
}

// ─── Singleton : comparaison lancée une seule fois ────────────────────────
let _comparisonCache: ReturnType<typeof runComparison> | null = null;

function getComparison() {
  if (!_comparisonCache) {
    _comparisonCache = runComparison();
  }
  return _comparisonCache;
}

// ─── Construction de la hiérarchie depuis les données réelles ─────────────

function buildDeparture(feederId: number | string, feederName: string): EneoDeparture {
  const result = getComparison();
  const feederStr = String(feederId);

  // Anomalies relatives à ce départ
  const feederCases = result.cases.filter(
    (c) =>
      String((c.layer1Record?.["feeder_id"] ?? c.layer2Record?.["feeder_id"] ?? "")) === feederStr
  );

  // Nombre total d'équipements BD1 pour ce départ (toutes tables)
  const tables: TableName[] = ["substation", "powertransformer", "busbar", "bay", "switch", "wire", "pole", "node"];
  let equipmentCount = 0;
  for (const table of tables) {
    equipmentCount += (layer1DB[table] as Array<{ feeder_id?: unknown }>)
      .filter((r) => String(r.feeder_id) === feederStr).length;
  }

  return {
    id: feederStr,
    code: feederName.split(" ")[0].replace("BON.", "D").replace("BON.D", "D") || feederStr,
    name: feederName,
    feederId,
    equipmentCount,
    anomalyCounts: {
      duplicate: feederCases.filter((c) => c.type === "duplicate").length,
      divergence: feederCases.filter((c) => c.type === "divergence").length,
      new: feederCases.filter((c) => c.type === "new").length,
      missing: feederCases.filter((c) => c.type === "missing").length,
      complex: feederCases.filter((c) => c.type === "complex").length,
    },
  };
}

// ─── Hiérarchie statique DRD-O avec données réelles ──────────────────────

// Récupérer les feeders depuis layer1DB
const feeders = layer1DB.feeder;

export const eneoRegions: EneoRegion[] = [
  {
    id: "DRD",
    code: "DRD",
    name: "Direction Régionale Douala",
    fullName: "Direction Régionale Douala",
    zones: [
      {
        id: "DRD-O",
        code: "DRD-O",
        name: "Douala Ouest",
        departures: feeders.map((feeder) => buildDeparture(feeder.m_rid, feeder.name)),
      },
    ],
  },
];

// ─── Accesseurs des anomalies par départ ─────────────────────────────────

export function getAnomaliesByFeeder(feederId: string | number, type?: AnomalyCase["type"]): AnomalyCase[] {
  const result = getComparison();
  return result.cases.filter((c) => {
    const fid = String(c.layer1Record?.["feeder_id"] ?? c.layer2Record?.["feeder_id"] ?? "");
    const matchFeeder = fid === String(feederId);
    const matchType = type ? c.type === type : true;
    return matchFeeder && matchType;
  });
}

export function getAllAnomalies(type?: AnomalyCase["type"]): AnomalyCase[] {
  const result = getComparison();
  return type ? result.cases.filter((c) => c.type === type) : result.cases;
}

export function getComparisonStats() {
  return getComparison().stats;
}

// ─── Compatibilité avec les fonctions getRegionStats / getZoneStats ───────

export function getRegionStats(regionId: string) {
  const result = getComparison();
  return {
    total: result.stats.total,
    pending: result.stats.missing + result.stats.new,
    inProgress: result.stats.duplicate + result.stats.divergence + result.stats.complex,
    completed: 0, // aucun cas résolu automatiquement
  };
}

export function getZoneStats(zoneId: string) {
  // Pour l'instant une seule zone DRD-O → même stats
  return getRegionStats(zoneId);
}

// ─── Types ré-exportés pour compatibilité ────────────────────────────────
export type { AnomalyCase, TableName };