// =============================================================================
// ComparisonService — Comparaison BD1 (référence) vs BD2 (collecte terrain)
//
// Détecte les 5 cas d'anomalie :
//   - duplicate  : enregistrement présent plusieurs fois dans BD2, identique à BD1
//   - divergence : présent dans les deux couches mais avec des champs différents
//   - new        : présent dans BD2 mais absent de BD1
//   - missing    : présent dans BD1 mais absent de BD2
//   - complex    : aucun des cas simples (ex: références cassées, orphelins)
// =============================================================================

import { layer1DB } from "@/data/layer1";
import { layer2DB } from "@/data/layer2";
import { AnomalyCase, AnomalyType, ComparisonResult, DivergentField, MRid, TableName } from "@/lib/types/eneo-assets";



// ─── Champs ignorés lors de la comparaison ────────────────────────────────
// Ces champs sont administratifs ou peuvent varier légitimement (ex: GPS saisi sur le terrain)
const IGNORED_FIELDS: Partial<Record<TableName, string[]>> = {
  substation:       ["created_date", "display_scada"],
  powertransformer: ["created_date", "display_scada"],
  busbar:           ["created_date", "display_scada"],
  bay:              ["created_date", "display_scada"],
  switch:           ["created_date", "display_scada"],
  wire:             ["created_date", "display_scada"],
  feeder:           ["created_date"],
  pole:             ["installation_date", "lastvisit_date"],
  node:             [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────

function getMrid(record: Record<string, unknown>): MRid {
  return record["m_rid"] as MRid;
}

function normalize(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function findDivergentFields(
  rec1: Record<string, unknown>,
  rec2: Record<string, unknown>,
  table: TableName
): DivergentField[] {
  const ignored = IGNORED_FIELDS[table] ?? [];
  const fields = new Set([...Object.keys(rec1), ...Object.keys(rec2)]);
  const divergent: DivergentField[] = [];

  for (const field of fields) {
    if (field === "m_rid" || ignored.includes(field)) continue;
    if (normalize(rec1[field]) !== normalize(rec2[field])) {
      divergent.push({
        field,
        layer1Value: rec1[field],
        layer2Value: rec2[field],
      });
    }
  }
  return divergent;
}

function areIdentical(
  rec1: Record<string, unknown>,
  rec2: Record<string, unknown>,
  table: TableName
): boolean {
  return findDivergentFields(rec1, rec2, table).length === 0;
}

// ─── Résolution d'un nom de feeder à partir de son id ────────────────────

function resolveFeederName(feederId: unknown): string {
  const f = layer1DB.feeder.find(
    (fd) => String(fd.m_rid) === String(feederId)
  );
  return f ? f.name : `Feeder ${feederId}`;
}

// ─── Analyse d'une table ──────────────────────────────────────────────────

function analyzeTable(
  table: TableName,
  layer1Records: Record<string, unknown>[],
  layer2Records: Record<string, unknown>[]
): AnomalyCase[] {
  const cases: AnomalyCase[] = [];

  // Index BD1 : m_rid → enregistrement
  const l1Index = new Map<string, Record<string, unknown>>();
  for (const rec of layer1Records) {
    l1Index.set(String(getMrid(rec)), rec);
  }

  // Index BD2 avec détection des doublons internes à BD2
  const l2Seen = new Map<string, Record<string, unknown>[]>();
  for (const rec of layer2Records) {
    const key = String(getMrid(rec));
    if (!l2Seen.has(key)) l2Seen.set(key, []);
    l2Seen.get(key)!.push(rec);
  }

  const l2ProcessedKeys = new Set<string>();

  // ── Parcours BD2 ──────────────────────────────────────────────────────
  for (const [key, occurrences] of l2Seen.entries()) {
    const l2Rec = occurrences[0]; // premier enregistrement
    const l1Rec = l1Index.get(key);

    l2ProcessedKeys.add(key);

    // 1. DUPLICATE interne BD2 (même m_rid saisi plusieurs fois)
    if (occurrences.length > 1) {
      // Vérifions si le doublon est aussi identique à BD1
      const caseType: AnomalyType = "duplicate";
      cases.push({
        id: `${table}-dup-${key}`,
        type: caseType,
        table,
        mrid: getMrid(l2Rec),
        layer1Record: l1Rec ?? null,
        layer2Record: l2Rec,
        duplicateOf: l1Rec ? getMrid(l1Rec) : undefined,
        feederName: resolveFeederName(l2Rec["feeder_id"] ?? l1Rec?.["feeder_id"]),
      });
      continue; // on ne double pas l'analyse
    }

    if (!l1Rec) {
      // 2. NEW — existe en BD2, absent de BD1
      // Vérification complexe : références cassées ?
      const isComplex = detectComplexCase(l2Rec, table);
      if (isComplex) {
        cases.push({
          id: `${table}-complex-${key}`,
          type: "complex",
          table,
          mrid: getMrid(l2Rec),
          layer1Record: null,
          layer2Record: l2Rec,
          complexReason: isComplex,
          feederName: resolveFeederName(l2Rec["feeder_id"]),
        });
      } else {
        cases.push({
          id: `${table}-new-${key}`,
          type: "new",
          table,
          mrid: getMrid(l2Rec),
          layer1Record: null,
          layer2Record: l2Rec,
          feederName: resolveFeederName(l2Rec["feeder_id"]),
        });
      }
    } else {
      // 3. Présent dans les deux → DIVERGENCE ou OK
      const divergent = findDivergentFields(l1Rec, l2Rec, table);
      if (divergent.length > 0) {
        cases.push({
          id: `${table}-div-${key}`,
          type: "divergence",
          table,
          mrid: getMrid(l2Rec),
          layer1Record: l1Rec,
          layer2Record: l2Rec,
          divergentFields: divergent,
          feederName: resolveFeederName(l1Rec["feeder_id"] ?? l2Rec["feeder_id"]),
        });
      }
      // Sinon : correspondance parfaite, pas d'anomalie
    }
  }

  // ── MISSING : présents en BD1 mais absents de BD2 ────────────────────
  for (const [key, l1Rec] of l1Index.entries()) {
    if (!l2ProcessedKeys.has(key)) {
      cases.push({
        id: `${table}-miss-${key}`,
        type: "missing",
        table,
        mrid: getMrid(l1Rec),
        layer1Record: l1Rec,
        layer2Record: null,
        feederName: resolveFeederName(l1Rec["feeder_id"]),
      });
    }
  }

  return cases;
}

// ─── Détection de cas complexe ────────────────────────────────────────────
// Un enregistrement est "complexe" si ses références internes pointent vers
// des entités qui n'existent ni en BD1 ni en BD2.

function detectComplexCase(
  rec: Record<string, unknown>,
  table: TableName
): string | null {
  // Cas : busbar avec substation_id orphelin
  if (table === "busbar") {
    const subId = String(rec["substation_id"] ?? "");
    const inL1 = layer1DB.substation.some((s) => String(s.m_rid) === subId);
    const inL2 = (layer2DB.substation ?? []).some((s) => String(s.m_rid) === subId);
    if (!inL1 && !inL2) {
      return `substation_id (${subId}) introuvable dans BD1 et BD2 — jeu de barres orphelin`;
    }
  }

  // Cas : powertransformer avec substation_id orphelin
  if (table === "powertransformer") {
    const subId = String(rec["substation_id"] ?? "");
    const inL1 = layer1DB.substation.some((s) => String(s.m_rid) === subId);
    const inL2 = (layer2DB.substation ?? []).some((s) => String(s.m_rid) === subId);
    // Si la substation est nouvelle (dans BD2 uniquement) c'est OK, sinon complexe
    const inL2Only = !inL1 && inL2;
    if (!inL1 && !inL2) {
      return `substation_id (${subId}) totalement inconnu — transformateur orphelin`;
    }
  }

  return null;
}

// ─── Service principal ────────────────────────────────────────────────────

export class ComparisonService {
  /**
   * Lance la comparaison complète entre BD1 et BD2.
   * Retourne un ComparisonResult avec tous les cas d'anomalie classifiés.
   */
  static compare(): ComparisonResult {
    const tables: TableName[] = [
      "feeder",
      "substation",
      "powertransformer",
      "busbar",
      "bay",
      "switch",
      "wire",
      "pole",
      "node",
    ];

    const allCases: AnomalyCase[] = [];

    for (const table of tables) {
      const l1 = (layer1DB[table] as unknown as Record<string, unknown>[]) ?? [];
      const l2 = (layer2DB[table] as unknown as Record<string, unknown>[]) ?? [];
      const tableCases = analyzeTable(table, l1, l2);
      allCases.push(...tableCases);
    }

    const stats = {
      total: allCases.length,
      duplicate: allCases.filter((c) => c.type === "duplicate").length,
      divergence: allCases.filter((c) => c.type === "divergence").length,
      new: allCases.filter((c) => c.type === "new").length,
      missing: allCases.filter((c) => c.type === "missing").length,
      complex: allCases.filter((c) => c.type === "complex").length,
    };

    const layer1Summary = {} as ComparisonResult["layer1Summary"];
    const layer2Summary = {} as ComparisonResult["layer2Summary"];
    for (const table of tables) {
      layer1Summary[table] = (layer1DB[table] as unknown[]).length;
      layer2Summary[table] = ((layer2DB[table] as unknown[]) ?? []).length;
    }

    return {
      analyzedAt: new Date().toISOString(),
      layer1Summary,
      layer2Summary,
      cases: allCases,
      stats,
    };
  }

  // ── Accesseurs filtrés ──────────────────────────────────────────────────

  static getDuplicates(result: ComparisonResult): AnomalyCase[] {
    return result.cases.filter((c) => c.type === "duplicate");
  }

  static getDivergences(result: ComparisonResult): AnomalyCase[] {
    return result.cases.filter((c) => c.type === "divergence");
  }

  static getNew(result: ComparisonResult): AnomalyCase[] {
    return result.cases.filter((c) => c.type === "new");
  }

  static getMissing(result: ComparisonResult): AnomalyCase[] {
    return result.cases.filter((c) => c.type === "missing");
  }

  static getComplex(result: ComparisonResult): AnomalyCase[] {
    return result.cases.filter((c) => c.type === "complex");
  }

  /** Filtre les cas par table */
  static byTable(result: ComparisonResult, table: TableName): AnomalyCase[] {
    return result.cases.filter((c) => c.table === table);
  }

  /** Filtre les cas par départ (feeder) */
  static byFeeder(result: ComparisonResult, feederName: string): AnomalyCase[] {
    return result.cases.filter((c) =>
      c.feederName?.toLowerCase().includes(feederName.toLowerCase())
    );
  }

  /**
   * Retourne un résumé humain des cas détectés, utile pour debug ou logs.
   */
  static summarize(result: ComparisonResult): string {
    const { stats } = result;
    const lines = [
      `=== Rapport de comparaison BD1 ↔ BD2 ===`,
      `Analysé le : ${new Date(result.analyzedAt).toLocaleString("fr-FR")}`,
      ``,
      `Total anomalies : ${stats.total}`,
      `  • Doublons     : ${stats.duplicate}`,
      `  • Divergences  : ${stats.divergence}`,
      `  • Nouveaux     : ${stats.new}`,
      `  • Manquants    : ${stats.missing}`,
      `  • Cas complexes: ${stats.complex}`,
      ``,
      `Détail par table :`,
    ];

    const tables: TableName[] = [
      "feeder", "substation", "powertransformer", "busbar",
      "bay", "switch", "wire", "pole", "node",
    ];

    for (const table of tables) {
      const tableCases = result.cases.filter((c) => c.table === table);
      if (tableCases.length === 0) continue;
      lines.push(`  [${table}] ${tableCases.length} cas`);
      for (const c of tableCases) {
        const label = c.type.toUpperCase().padEnd(10);
        const fields =
          c.divergentFields
            ? ` — champs: ${c.divergentFields.map((d) => d.field).join(", ")}`
            : "";
        const reason = c.complexReason ? ` — ${c.complexReason}` : "";
        lines.push(`    ${label} m_rid=${c.mrid}${fields}${reason}`);
      }
    }

    return lines.join("\n");
  }
}

// ─── Export pratique ──────────────────────────────────────────────────────

/** Lance la comparaison et retourne directement le résultat */
export function runComparison(): ComparisonResult {
  return ComparisonService.compare();
}