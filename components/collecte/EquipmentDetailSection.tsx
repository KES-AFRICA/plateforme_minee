"use client";
import { LayoutGrid } from "lucide-react";
import { EquipIcon, pctCol, SpeedGauge } from "./structure";
import { useState } from "react";

// Composant amélioré pour Détail par équipement
const EquipmentDetailSection = ({
  equipementList,
}: {
  equipementList: any[];
}) => {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [expandedView, setExpandedView] = useState(false);

  // Configuration des couleurs par équipement (gradients)
  const getEquipmentGradient = (nom: string, taux: number) => {
    const gradients = {
      "Postes source": { from: "#185FA5", to: "#2B7BCB", icon: "🏭" },
      H59: { from: "#1D9E75", to: "#2BCB92", icon: "⚡" },
      H61: { from: "#1D9E75", to: "#2BCB92", icon: "⚡" },
      "Jeu de barres": { from: "#BA7517", to: "#E89B30", icon: "📊" },
      Cellules: { from: "#7C3AED", to: "#9B6BFF", icon: "📦" },
      Transformateurs: { from: "#DC2626", to: "#F05252", icon: "⚙️" },
    };
    return (
      gradients[nom as keyof typeof gradients] || {
        from: "#6B7280",
        to: "#9CA3AF",
        icon: "📈",
      }
    );
  };

  return (
    <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-white via-white to-blue-50/30 border border-blue-100/50 shadow-xl shadow-blue-100/20">
      {/* Détail par équipement - Version épurée & améliorée */}
      <div className="overflow-hidden rounded-xl sm:rounded-2xl border border-[#E5EAF2] bg-white shadow-sm">
        {/* Header épuré */}
        <div className="flex items-center gap-3 border-b border-[#EEF1F7] px-5 py-4 bg-white">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#185FA5]/10">
            <LayoutGrid className="h-4 w-4 text-[#185FA5]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#111827]">
              Détail par équipement
            </p>
            <p className="text-[10px] text-[#94A3B8]">
              Taux de collecte — référentiel inclus
            </p>
          </div>
        </div>

        {/* Grille équipements */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5 bg-[#F8FAFE]">
          {equipementList.map((eq) => {
            const col = pctCol(eq.taux);
            return (
              <div
                key={eq.nom}
                className="group rounded-xl bg-white border border-[#E8EDF5] p-4 transition-all duration-200 hover:border-[#185FA5]/30 hover:shadow-md"
              >
                {/* En-tête équipement */}
                <div className="flex items-center gap-2.5 mb-3">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                    style={{ backgroundColor: `${col.fill}15` }}
                  >
                    <EquipIcon
                      nom={eq.nom}
                      className="h-4 w-4"
                    />
                  </div>
                  <span className="text-sm font-semibold text-[#1E293B]">
                    {eq.nom}
                  </span>
                </div>

                {/* SpeedGauge conservé */}
                <SpeedGauge pct={eq.taux} color={col.fill} />

                {/* Compteur */}
                <div className="mt-3 text-center">
                  <span className="text-xs font-medium text-[#64748B]">
                    <span className="text-base font-bold text-[#1E293B]">
                      {eq.collectes}
                    </span>
                    {" / "}
                    <span className="text-[#94A3B8]">{eq.attendus}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
export default EquipmentDetailSection;
