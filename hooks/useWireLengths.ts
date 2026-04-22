// hooks/useWireLengths.ts
import { useMemo, useRef, useEffect } from "react";

// Calcul de distance Haversine en kilomètres
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Calculer la longueur totale d'un wire à partir de ses segments
function calculateWireLength(wire: any): number {
  let totalLength = 0;
  const segments = wire.segments ?? [];
  
  for (const segment of segments) {
    const coords = segment.coordinates ?? [];
    for (let i = 0; i < coords.length - 1; i++) {
      const [lng1, lat1] = coords[i];
      const [lng2, lat2] = coords[i+1];
      totalLength += haversineDistance(lat1, lng1, lat2, lng2);
    }
  }
  
  return totalLength;
}

// Cache pour les longueurs des wires
const lengthCache = new Map<number, number>();

interface WireLengthsResult {
  totalLengthAll: number;      // Longueur totale de tous les wires (km)
  totalLengthFiltered: number; // Longueur totale des wires filtrés (km)
  getWireLength: (wireId: number, wire?: any) => number; // Obtenir la longueur d'un wire spécifique
  refreshCache: () => void;    // Vider le cache
}

export function useWireLengths(wires: any[], filteredWires: any[]): WireLengthsResult {
  const refreshTrigger = useRef(0);
  
  // Calculer ou récupérer du cache la longueur d'un wire
  const getWireLength = (wireId: number, wire?: any): number => {
    if (lengthCache.has(wireId)) {
      return lengthCache.get(wireId)!;
    }
    
    if (wire) {
      const length = calculateWireLength(wire);
      lengthCache.set(wireId, length);
      return length;
    }
    
    return 0;
  };
  
  // Pré-calculer toutes les longueurs des wires
  useEffect(() => {
    for (const wire of wires) {
      const wireId = wire.id;
      if (!lengthCache.has(wireId)) {
        const length = calculateWireLength(wire);
        lengthCache.set(wireId, length);
      }
    }
  }, [wires, refreshTrigger.current]);
  
  // Longueur totale de tous les wires
  const totalLengthAll = useMemo(() => {
    let total = 0;
    for (const wire of wires) {
      total += getWireLength(wire.id, wire);
    }
    return total;
  }, [wires, refreshTrigger.current]);
  
  // Longueur totale des wires filtrés
  const totalLengthFiltered = useMemo(() => {
    let total = 0;
    for (const wire of filteredWires) {
      total += getWireLength(wire.id, wire);
    }
    return total;
  }, [filteredWires, refreshTrigger.current]);
  
  // Fonction pour vider le cache (appelée par le bouton Actualiser)
  const refreshCache = () => {
    lengthCache.clear();
    refreshTrigger.current++;
  };
  
  return {
    totalLengthAll,
    totalLengthFiltered,
    getWireLength,
    refreshCache,
  };
}