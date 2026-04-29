import {
  Zap,
  BarChart3,
  Users,
  Building2,
  ChevronRight,
  Clock,
} from "lucide-react";

export default function KpiCards({
  feedersCollectes,
  feedersAttendus,
  feedersTaux,
  equipesActives,
  totalEquipes,
  totalCollectes,
  totalAttendus,
  totalTaux,
  derniereSoumission,
}: {
  feedersCollectes: number;
  feedersAttendus: number;
  feedersTaux: number;
  equipesActives: number;
  totalEquipes: number;
  totalCollectes: number;
  totalAttendus: number;
  totalTaux: number;
  derniereSoumission: string;
}) {
  const formatDerniereSoumission = (dateStr?: string) => {
    if (!dateStr) return "Aucune soumission";
    const date = new Date(dateStr);
    const now = new Date();
    const diffHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60),
    );

    if (diffHours < 1) {
      return "À l'instant";
    } else if (diffHours < 24) {
      return `Il y a ${diffHours} heure${diffHours > 1 ? "s" : ""}`;
    } else {
      return date.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  };
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {/* Départs en cours (Feeders) */}
      <div className="group relative overflow-hidden rounded-2xl border border-[#B5D4F4] bg-[#EBF3FC] p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#185FA5]">
          <Zap className="h-5 w-5 text-white" />
        </div>
        <p className="mt-3.5 text-[10px] font-bold uppercase tracking-widest text-[#185FA5]">
          Départs en cours
        </p>
        <p className="mt-1 text-[30px] font-bold leading-none text-[#0C447C]">
          {feedersCollectes}
        </p>
        <div className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-[#C8DFF5]">
          <div
            className="h-full rounded-full bg-[#185FA5] transition-all duration-700"
            style={{ width: `${feedersTaux}%` }}
          />
        </div>
      </div>

      <div className="group relative overflow-hidden rounded-2xl border border-[#9FE1CB] bg-[#EAF5F0] p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-start justify-between">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1D9E75]">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <span className="rounded-full bg-[#C0F0DC] px-2.5 py-0.5 text-[10px] font-bold text-[#0F6E56]">
            {feedersTaux}%
          </span>
        </div>
        <p className="mt-3.5 text-[10px] font-bold uppercase tracking-widest text-[#1D9E75]">
          Dernière collecte
        </p>
        <p className="mt-1 text-[30px] font-bold leading-none text-[#085041]">
          {feedersCollectes}
          <span className="ml-1 text-sm font-medium opacity-40">
            / {feedersAttendus}
          </span>
        </p>

        {/* Affichage de la dernière soumission */}
        <div className="mt-2 flex items-center gap-1.5 text-[10px] font-medium text-[#1D9E75]">
          <Clock className="h-3 w-3" />
          <span>{formatDerniereSoumission(derniereSoumission)}</span>
        </div>

        <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-[#C0EEDD]">
          <div
            className="h-full rounded-full bg-[#1D9E75] transition-all duration-700"
            style={{ width: `${feedersTaux}%` }}
          />
        </div>
      </div>

      {/* Départs collectés (Feeders collectés) */}
      {/* <div className="group relative overflow-hidden rounded-2xl border border-[#9FE1CB] bg-[#EAF5F0] p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-start justify-between">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1D9E75]">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <span className="rounded-full bg-[#C0F0DC] px-2.5 py-0.5 text-[10px] font-bold text-[#0F6E56]">
            {feedersTaux}%
          </span>
        </div>
        <p className="mt-3.5 text-[10px] font-bold uppercase tracking-widest text-[#1D9E75]">
          Départs collectés
        </p>
        <p className="mt-1 text-[30px] font-bold leading-none text-[#085041]">

          {feedersCollectes}
          <span className="ml-1 text-sm font-medium opacity-40">
            {" "}
            / {feedersAttendus}
          </span>
        </p>
        <div className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-[#C0EEDD]">
          <div
            className="h-full rounded-full bg-[#1D9E75] transition-all duration-700"
            style={{ width: `${feedersTaux}%` }}
          />
        </div>
      </div> */}

      {/* Équipes actifs */}
      <div className="group relative overflow-hidden rounded-2xl border border-[#CECBF6] bg-[#F4EEFE] p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7F77DD]">
          <Users className="h-5 w-5 text-white" />
        </div>
        <p className="mt-3.5 text-[10px] font-bold uppercase tracking-widest text-[#7F77DD]">
          Équipes actives
        </p>
        <p className="mt-1 text-[30px] font-bold leading-none text-[#3C3489]">
          {equipesActives}
          <span className="ml-1 text-sm font-medium opacity-40">
            {" "}
            / {totalEquipes}
          </span>
        </p>
        <p className="mt-2.5 text-[10px] font-medium text-[#534AB7]">
          {totalEquipes} équipes au total
        </p>
      </div>

      {/* Postes collectés */}
      <div className="group relative cursor-pointer overflow-hidden rounded-2xl border border-[#FAC775] bg-[#FEF6E7] p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-start justify-between">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#BA7517]">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <span className="rounded-full bg-[#FDE8B0] px-2.5 py-0.5 text-[10px] font-bold text-[#633806]">
            {totalTaux}%
          </span>
        </div>
        <p className="mt-3.5 text-[10px] font-bold uppercase tracking-widest text-[#BA7517]">
          Postes collectés
        </p>
        <p className="mt-1 text-[30px] font-bold leading-none text-[#412402]">
          {totalCollectes}
          <span className="ml-1 text-sm font-medium opacity-40">
            {" "}
            / {totalAttendus}
          </span>
        </p>
        <div className="mt-2.5 flex items-center gap-1 text-[11px] font-semibold text-[#BA7517] transition-all group-hover:gap-2">
          Détails{" "}
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </div>
  );
}
