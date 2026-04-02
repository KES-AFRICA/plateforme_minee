// hooks/useComparison.ts

import { useState, useEffect, useCallback, useRef } from "react";
import { 
  fetchComparison, 
  fetchFeedersComparison,
  fetchComparisonHealth,
  getCollectionRate
} from "@/lib/api/services/comparisonService";
import { 
  ComparisonResult, 
  FeedersResponse,
  HealthResponse,
  AnomalyCase,
  AnomalyType,
  TableName,
  FeederComparison
} from "@/lib/types/comparison";

// ── État générique asynchrone ─────────────────────────────────────────────────

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook 1 : useComparison
// Charge les résultats de comparaison
// ─────────────────────────────────────────────────────────────────────────────

export function useComparison() {
  const [state, setState] = useState<AsyncState<ComparisonResult>>({
    data: null,
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const data = await fetchComparison();
      setState({ data, loading: false, error: null });
    } catch (err) {
      setState({
        data: null,
        loading: false,
        error: err instanceof Error ? err.message : "Erreur inconnue",
      });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Filtres
  const getByType = useCallback((type: AnomalyType): AnomalyCase[] => {
    if (!state.data) return [];
    return state.data.cases.filter(c => c.type === type);
  }, [state.data]);

  const getByTable = useCallback((table: TableName): AnomalyCase[] => {
    if (!state.data) return [];
    return state.data.cases.filter(c => c.table === table);
  }, [state.data]);

  return {
    result: state.data,
    summary: state.data?.summary,
    cases: state.data?.cases ?? [],
    loading: state.loading,
    error: state.error,
    refresh: load,
    getByType,
    getByTable,
    // Accès rapides
    duplicates: state.data ? state.data.cases.filter(c => c.type === "duplicate") : [],
    divergences: state.data ? state.data.cases.filter(c => c.type === "divergence") : [],
    new: state.data ? state.data.cases.filter(c => c.type === "new") : [],
    missing: state.data ? state.data.cases.filter(c => c.type === "missing") : [],
    complex: state.data ? state.data.cases.filter(c => c.type === "complex") : [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook 2 : useFeedersComparison
// Charge les feeders avec leurs données référence et collectées
// ─────────────────────────────────────────────────────────────────────────────

export function useFeedersComparison() {
  const [state, setState] = useState<AsyncState<FeedersResponse>>({
    data: null,
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const data = await fetchFeedersComparison();
      setState({ data, loading: false, error: null });
    } catch (err) {
      setState({
        data: null,
        loading: false,
        error: err instanceof Error ? err.message : "Erreur inconnue",
      });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Helper: trouver un feeder par son ID
  const getFeederById = useCallback((feederId: string): FeederComparison | null => {
    if (!state.data) return null;
    return state.data.feeders.find(f => f.feeder_id === feederId) || null;
  }, [state.data]);

  // Helper: calculer le taux de collecte
  const getCollectionRateForFeeder = useCallback((feeder: FeederComparison): number => {
    return getCollectionRate(feeder);
  }, []);

  return {
    feeders: state.data?.feeders ?? [],
    count: state.data?.count ?? 0,
    loading: state.loading,
    error: state.error,
    refresh: load,
    getFeederById,
    getCollectionRateForFeeder,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook 3 : useComparisonHealth
// Vérifie l'état du service
// ─────────────────────────────────────────────────────────────────────────────

export function useComparisonHealth() {
  const [state, setState] = useState<AsyncState<HealthResponse>>({
    data: null,
    loading: true,
    error: null,
  });

  const check = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const data = await fetchComparisonHealth();
      setState({ data, loading: false, error: null });
      return data;
    } catch (err) {
      setState({
        data: null,
        loading: false,
        error: err instanceof Error ? err.message : "Service indisponible",
      });
      return null;
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  return {
    health: state.data,
    isHealthy: state.data?.status === "ok",
    loading: state.loading,
    error: state.error,
    check,
  };
}