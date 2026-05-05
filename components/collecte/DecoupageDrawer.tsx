import React from 'react'
import { Drawer } from '../ui/drawer';
import { Building2, Zap, LayoutGrid, Box, Power } from 'lucide-react';
import { DecoupageStats } from '@/lib/types/collecte';
import { pctCol } from './structure';

export default function DecoupageDrawer({
    drawerOpen,
    setDrawerOpen,
    selectedDecoupage,
  }: {
    drawerOpen: boolean;
    setDrawerOpen: (open: boolean) => void;
    selectedDecoupage: DecoupageStats | null;
}) {
  return (
    <div>
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        {selectedDecoupage && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold mb-4">{`Détail - ${selectedDecoupage?.decoupage || "Direction régionale"}`}</h2>
            <div className="flex gap-2">
              {[
                {
                  label: "Postes collectés",
                  val: selectedDecoupage.postes_collectes.collectes,
                  attendus: selectedDecoupage.postes_collectes.attendus,
                  color: "#1D9E75",
                },
                {
                  label: "Feeder collectés",
                  val: selectedDecoupage.feeders.collectes,
                  attendus: selectedDecoupage.feeders.attendus,
                  color: "#185FA5",
                },
                {
                  label: "Taux global",
                  val: `${selectedDecoupage.postes_collectes.taux || 0}%`,
                  color: "#BA7517",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex-1 rounded-xl border border-[#E5EAF2] bg-[#F8FAFE] p-3 text-center"
                >
                  <p className="text-[9px] uppercase tracking-widest text-[#9CA3AF]">
                    {item.label}
                  </p>
                  <p
                    className="mt-1 text-[22px] font-bold"
                    style={{ color: item.color }}
                  >
                    {item.val}
                    {item.attendus !== undefined && item.attendus !== null && (
                      <span className="ml-1 text-xs opacity-40">
                        {" "}
                        / {item.attendus}
                      </span>
                    )}
                  </p>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-[#9CA3AF]">
                Détail par équipement
              </p>
              {[
                {
                  label: "Postes source",
                  data: selectedDecoupage.postes_source,
                  icon: Building2,
                },
                { label: "H59", data: selectedDecoupage.h59, icon: Zap },
                { label: "H61", data: selectedDecoupage.h61, icon: Zap },
                {
                  label: "Jeu de barres",
                  data: selectedDecoupage.busbars,
                  icon: LayoutGrid,
                },
                { label: "Cellules", data: selectedDecoupage.bays, icon: Box },
                {
                  label: "Transformateurs",
                  data: selectedDecoupage.transformers,
                  icon: Power,
                },
              ].map((item) => {
                if (!item.data) return null;
                const taux = item.data.taux || 0;
                const c = pctCol(taux);
                return (
                  <div
                    key={item.label}
                    className="rounded-xl border border-[#E5EAF2] bg-white p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <item.icon
                          className="h-3.5 w-3.5"
                          style={{ color: c.fill }}
                        />
                        <span className="text-[11px] font-medium text-[#374151]">
                          {item.label}
                        </span>
                      </div>
                      <span
                        className="text-[11px] font-bold"
                        style={{ color: c.fill }}
                      >
                        {taux}%
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div
                        className="flex-1 overflow-hidden rounded-full bg-[#EEF1F7]"
                        style={{ height: 5 }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${taux}%`, background: c.fill }}
                        />
                      </div>
                      <span className="text-[10px] text-[#9CA3AF]">
                        {item.data.collectes}/{item.data.attendus || 0}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}