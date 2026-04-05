// lib/api/services/dashboardStatsService.ts
import { runComparison } from "@/lib/api/services/comparison.service";
import { eneoRegions, getCollectionStats, getGlobalMissingStats } from "@/lib/api/eneo-data";
import { layer2DB } from "@/data/layer2";
import { TableName, AnomalyCase } from "@/lib/types/eneo-assets";

export interface FeederStats {
  id: string;
  name: string;
  code: string;
  expected: number;
  collected: number;
  remaining: number;
  progress: number;
  anomalies: {
    duplicate: number;
    divergence: number;
    new: number;
    missing: number;
    complex: number;
  };
}

export interface EquipmentTypeStats {
  type: TableName;
  label: string;
  expected: number;
  collected: number;
  anomalies: {
    duplicate: number;
    divergence: number;
    new: number;
    missing: number;
    complex: number;
  };
}

export interface DailyProgress {
  date: string;
  collected: number;
  anomalies: number;
}

export interface GlobalStats {
  totalFeeders: number;
  totalExpected: number;
  totalCollected: number;
  totalRemaining: number;
  globalProgress: number;
  anomalies: {
    total: number;
    duplicate: number;
    divergence: number;
    new: number;
    missing: number;
    complex: number;
  };
  processingRate: number;   // taux de collecte = totalCollected / totalExpected
  validationRate: number;   // taux de conformité = (collectés sans anomalie) / totalCollected
}

class DashboardStatsService {
  private comparisonResult: ReturnType<typeof runComparison> | null = null;

  private getComparison() {
    if (!this.comparisonResult) {
      this.comparisonResult = runComparison();
    }
    return this.comparisonResult;
  }

  getGlobalStats(): GlobalStats {
    const comp = this.getComparison();
    const globalMissing = getGlobalMissingStats();
    const totalExpected = globalMissing.totalAttendu;
    const totalCollected = globalMissing.totalCollectes;
    const totalRemaining = globalMissing.manquantsRestants;

    // Calcul du nombre d'équipements collectés sans anomalie
    const cases = comp?.cases ?? [];
    const anomalyCount = cases.length;
    const collectedOk = totalCollected - anomalyCount;
    const processingRate = totalExpected ? (totalCollected / totalExpected) * 100 : 0;
    const validationRate = totalCollected ? (collectedOk / totalCollected) * 100 : 0;

    return {
      totalFeeders: eneoRegions.reduce((acc, r) => acc + r.zones.reduce((a, z) => a + z.departures.length, 0), 0),
      totalExpected,
      totalCollected,
      totalRemaining,
      globalProgress: processingRate,
      anomalies: {
        total: anomalyCount,
        duplicate: comp?.stats.duplicate ?? 0,
        divergence: comp?.stats.divergence ?? 0,
        new: comp?.stats.new ?? 0,
        missing: comp?.stats.missing ?? 0,
        complex: comp?.stats.complex ?? 0,
      },
      processingRate,
      validationRate,
    };
  }

  getFeedersStats(): FeederStats[] {
    const feeders: FeederStats[] = [];
    for (const region of eneoRegions) {
      for (const zone of region.zones) {
        for (const dep of zone.departures) {
          if (dep.id === "orphan") continue;
          const stats = getCollectionStats(dep.feederId);
          feeders.push({
            id: dep.id,
            name: dep.name,
            code: dep.code,
            expected: stats.totalAttendu,
            collected: stats.collectes,
            remaining: stats.manquantsRestants,
            progress: stats.tauxProgression,
            anomalies: dep.anomalyCounts,
          });
        }
      }
    }
    return feeders;
  }

  getEquipmentTypeStats(): EquipmentTypeStats[] {
    const comp = this.getComparison();
    const tables: TableName[] = [
      "substation",
      "powertransformer",
      "busbar",
      "bay",
      "switch",
      "wire",
      "pole",
      "node",
    ];
    const labels: Record<TableName, string> = {
      feeder: "Départs",
      substation: "Postes sources",
      powertransformer: "Transformateurs",
      busbar: "Jeux de barres",
      bay: "Cellules",
      switch: "Appareils de coupure",
      wire: "Câbles",
      pole: "Poteaux",
      node: "Nœuds",
    };

    return tables.map((table) => {
      const expected = comp?.layer1Summary[table] ?? 0;
      const collected = comp?.layer2Summary[table] ?? 0;
      const tableCases = comp?.cases.filter((c: AnomalyCase) => c.table === table) ?? [];
      const anomalies = {
        duplicate: tableCases.filter((c) => c.type === "duplicate").length,
        divergence: tableCases.filter((c) => c.type === "divergence").length,
        new: tableCases.filter((c) => c.type === "new").length,
        missing: tableCases.filter((c) => c.type === "missing").length,
        complex: tableCases.filter((c) => c.type === "complex").length,
      };
      return { type: table, label: labels[table] || table, expected, collected, anomalies };
    });
  }

  getDailyProgress(startDate: Date, endDate: Date): DailyProgress[] {
    const dateMap = new Map<string, { collected: number; anomalies: number }>();
    const tables: TableName[] = [
      "substation",
      "powertransformer",
      "busbar",
      "bay",
      "switch",
      "wire",
      "pole",
      "node",
    ];

    for (const table of tables) {
      const records = (layer2DB[table] as any[]) ?? [];
      for (const rec of records) {
        const dateStr = rec.created_date;
        if (!dateStr || typeof dateStr !== "string") continue;
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) continue;
        if (date < startDate || date > endDate) continue;

        const key = date.toISOString().split("T")[0];
        const entry = dateMap.get(key) || { collected: 0, anomalies: 0 };
        entry.collected++;

        const hasAnomaly = this.getComparison()?.cases.some(
          (c: AnomalyCase) => String(c.mrid) === String(rec.m_rid) && c.type !== "new" && c.type !== "missing"
        ) ?? false;
        if (hasAnomaly) entry.anomalies++;

        dateMap.set(key, entry);
      }
    }

    // Générer tous les jours de la plage
    const result: DailyProgress[] = [];
    let current = new Date(startDate);
    while (current <= endDate) {
      const key = current.toISOString().split("T")[0];
      const entry = dateMap.get(key) || { collected: 0, anomalies: 0 };
      result.push({ date: key, collected: entry.collected, anomalies: entry.anomalies });
      current.setDate(current.getDate() + 1);
    }
    return result;
  }
}

export const dashboardStatsService = new DashboardStatsService();