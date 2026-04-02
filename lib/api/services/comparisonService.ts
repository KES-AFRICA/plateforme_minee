// lib/api/services/comparisonService.ts

import { 
  ComparisonResult, 
  FeedersResponse, 
  HealthResponse,
  ApiError 
} from "@/lib/types/comparison";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

// ── Helper fetch générique ────────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${BASE_URL}/comparison${path}`;
  
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  if (!res.ok) {
    let message = `Erreur HTTP ${res.status}`;
    try {
      const err: ApiError = await res.json();
      message = err.detail ?? message;
    } catch {
      // réponse non-JSON
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

// ── Endpoints ─────────────────────────────────────────────────────────────────

/**
 * GET /comparison/health
 * Vérifie l'état du service de comparaison
 */
export async function fetchComparisonHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>("/health");
}

/**
 * GET /comparison/compare
 * Compare toutes les données entre MySQL (référence) et PostGIS (collecte)
 */
export async function fetchComparison(): Promise<ComparisonResult> {
  return apiFetch<ComparisonResult>("/compare");
}

/**
 * GET /comparison/feeders
 * Liste tous les feeders collectés avec leurs données référence et collectées
 */
export async function fetchFeedersComparison(): Promise<FeedersResponse> {
  return apiFetch<FeedersResponse>("/feeders");
}

// ── Utilitaires ──────────────────────────────────────────────────────────────

/**
 * Calcule le taux de collecte pour un feeder
 */
export function getCollectionRate(feeder: FeedersResponse["feeders"][0]): number {
  const refCount = Object.values(feeder.reference).reduce((acc, val) => {
    if (Array.isArray(val)) return acc + val.length;
    return acc;
  }, 0);
  
  const collectedCount = feeder.collected.summary.substations + 
                         feeder.collected.summary.power_transformers +
                         feeder.collected.summary.bays +
                         feeder.collected.summary.switches +
                         feeder.collected.summary.bt_boards +
                         feeder.collected.summary.arms;
  
  return refCount > 0 ? (collectedCount / refCount) * 100 : 0;
}