export interface AnomalyEntry {
  nom: string;
  val: number;
}

export interface ErreursStats {
  manquants: AnomalyEntry[];
  nouveaux: AnomalyEntry[];
  doublons: AnomalyEntry[];
}

// ─── Color helpers ───────────────────────────────────────────────────────────
export interface PctColors {
  fill: string;
  light: string;
  text: string;
}

export type Period = "today" | "week" | "custom";