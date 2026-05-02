"use client";
import {
  Building2,
  Zap,
  LayoutGrid,
  Box,
  Power,
  Shield,
  Cable,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { useRef, useEffect } from "react";
import { DecoupageStats, ErreursStats, PctColors } from "@/lib/types/collecte";

export function pctCol(p: number): PctColors {
  if (p >= 76) return { fill: "#1D9E75", light: "#EAF5F0", text: "#085041" };
  if (p >= 51) return { fill: "#60A908", light: "#EAF3DE", text: "#27500A" };
  if (p >= 26) return { fill: "#D88106", light: "#FEF6E7", text: "#412402" };
  return { fill: "#B50A0A", light: "#F0C0C0", text: "#501313" };
}

export function EquipIcon({
  nom,
  className = "",
}: {
  nom: string;
  className?: string;
}) {
  const p = {
    className,
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const normalizedNom = nom.toLowerCase();

  if (normalizedNom.includes("poste source")) return <Building2 {...p} />;
  if (normalizedNom.includes("h59")) return <Zap {...p} />;
  if (normalizedNom.includes("h61")) return <Zap {...p} />;
  if (
    normalizedNom.includes("jeu de barres") ||
    normalizedNom.includes("busbar")
  )
    return <LayoutGrid {...p} />;
  if (normalizedNom.includes("cellule") || normalizedNom.includes("bay"))
    return <Box {...p} />;
  if (normalizedNom.includes("transformateur")) return <Power {...p} />;
  if (normalizedNom.includes("tableau bt")) return <Shield {...p} />;
  if (normalizedNom.includes("appareillage")) return <Cable {...p} />;
  if (normalizedNom.includes("support")) return <TrendingUp {...p} />;
  return <BarChart3 {...p} />;
}

// ─── Donut chart (SVG, no lib) ───────────────────────────────────────────────
export function DonutChart({
  segments,
  size = 160,
}: {
  segments: { value: number; color: string }[];
  size?: number;
}) {
  const cx = size / 2,
    cy = size / 2;
  const r = size * 0.36,
    thick = size * 0.13;
  const tot = segments.reduce((s, g) => s + g.value, 0);
  let cumul = 0;

  const paths = segments.map((seg) => {
    const s1 = (cumul / tot) * 2 * Math.PI - Math.PI / 2;
    cumul += seg.value;
    const s2 = (cumul / tot) * 2 * Math.PI - Math.PI / 2;
    const lg = s2 - s1 > Math.PI ? 1 : 0;
    const ri = r - thick;
    const x1 = cx + r * Math.cos(s1),
      y1 = cy + r * Math.sin(s1);
    const x2 = cx + r * Math.cos(s2),
      y2 = cy + r * Math.sin(s2);
    const xi1 = cx + ri * Math.cos(s2),
      yi1 = cy + ri * Math.sin(s2);
    const xi2 = cx + ri * Math.cos(s1),
      yi2 = cy + ri * Math.sin(s1);
    return {
      d: `M${x1} ${y1} A${r} ${r} 0 ${lg} 1 ${x2} ${y2} L${xi1} ${yi1} A${ri} ${ri} 0 ${lg} 0 ${xi2} ${yi2} Z`,
      color: seg.color,
    };
  });

  const main = segments.reduce((a, b) => (a.value > b.value ? a : b));

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-label="Donut chart avancement global"
    >
      {paths.map((p, i) => (
        <path key={i} d={p.d} fill={p.color} />
      ))}
      <text
        x={cx}
        y={cy - 7}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={Math.round(size * 0.14)}
        fontWeight="700"
        fill={main.color}
      >
        {main.value}%
      </text>
      <text
        x={cx}
        y={cy + 13}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={Math.round(size * 0.08)}
        fill="#9CA3AF"
      >
        collectés
      </text>
    </svg>
  );
}

// ─── Speedometer gauge (canvas) ─────────────────────────────────────────────
// export function SpeedGauge({
//   pct,
//   color,
//   width = 160,
//   height = 98,
// }: {
//   pct: number;
//   color: string;
//   width?: number;
//   height?: number;
// }) {
//   const ref = useRef<HTMLCanvasElement>(null);
//   const raf = useRef<number>(0);

//   useEffect(() => {
//     const cv = ref.current;
//     if (!cv) return;
//     const dpr = window.devicePixelRatio || 1;
//     const W = width,
//       H = height;
//     cv.width = W * dpr;
//     cv.height = H * dpr;
//     cv.style.width = `${W}px`;
//     cv.style.height = `${H}px`;
//     const ctx = cv.getContext("2d")!;
//     ctx.scale(dpr, dpr);
//     const cx = W / 2;
//       r = W * 0.34,
//       sw = W * 0.07;
//     const cy = H - sw - 4;
//     const sA = Math.PI,
//       eA = Math.PI * 2;
//     const target = Math.min(pct, 100) / 100;
//     let p = 0;

//     const bgSegs = [
//       { f: 0, t: 0.25, c: "#FCEBEB" },
//       { f: 0.25, t: 0.5, c: "#FEF6E7" },
//       { f: 0.5, t: 0.75, c: "#EAF3DE" },
//       { f: 0.75, t: 1, c: "#EAF5F0" },
//     ];
//     const fillSegs = [
//       { f: 0, t: 0.25, c: "#E24B4A" },
//       { f: 0.25, t: 0.5, c: "#EF9F27" },
//       { f: 0.5, t: 0.75, c: "#639922" },
//       { f: 0.75, t: 1, c: "#1D9E75" },
//     ];

//     function frame() {
//       ctx.setTransform(1, 0, 0, 1, 0, 0);
//       ctx.scale(dpr, dpr);
//       ctx.clearRect(0, 0, W, H);
//       bgSegs.forEach((s) => {
//         ctx.beginPath();
//         ctx.arc(cx, cy, r, sA + (eA - sA) * s.f, sA + (eA - sA) * s.t);
//         ctx.strokeStyle = s.c;
//         ctx.lineWidth = sw;
//         ctx.lineCap = "butt";
//         ctx.stroke();
//       });
//       if (p > 0) {
//         fillSegs
//           .filter((s) => s.f < p)
//           .forEach((s) => {
//             const t = Math.min(s.t, p);
//             ctx.beginPath();
//             ctx.arc(cx, cy, r, sA + (eA - sA) * s.f, sA + (eA - sA) * t);
//             ctx.strokeStyle = s.c;
//             ctx.lineWidth = sw;
//             ctx.lineCap = t === p ? "round" : "butt";
//             ctx.stroke();
//           });
//       }
//       for (let i = 0; i <= 10; i++) {
//         const a = sA + (eA - sA) * (i / 10),
//           isMaj = i % 5 === 0;
//         const r1 = r - sw / 2 - 2,
//           r2 = r + sw / 2 + (isMaj ? 5 : 2);
//         ctx.beginPath();
//         ctx.moveTo(cx + r1 * Math.cos(a), cy + r1 * Math.sin(a));
//         ctx.lineTo(cx + r2 * Math.cos(a), cy + r2 * Math.sin(a));
//         ctx.strokeStyle = isMaj ? "rgba(0,0,0,.18)" : "rgba(0,0,0,.07)";
//         ctx.lineWidth = isMaj ? 1.5 : 0.7;
//         ctx.lineCap = "square";
//         ctx.stroke();
//       }
//       const nA = sA + (eA - sA) * p,
//         nLen = r - sw / 2 - 5;
//       ctx.save();
//       ctx.beginPath();
//       ctx.moveTo(cx, cy);
//       ctx.lineTo(cx + nLen * Math.cos(nA), cy + nLen * Math.sin(nA));
//       ctx.strokeStyle = "#374151";
//       ctx.lineWidth = 2;
//       ctx.lineCap = "round";
//       ctx.stroke();
//       ctx.beginPath();
//       ctx.arc(cx, cy, 5, 0, Math.PI * 2);
//       ctx.fillStyle = color;
//       ctx.fill();
//       ctx.beginPath();
//       ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
//       ctx.fillStyle = "#fff";
//       ctx.fill();
//       ctx.restore();
//       ctx.font = `700 ${Math.round(W * 0.12)}px 'DM Sans',sans-serif`;
//       ctx.fillStyle = color;
//       ctx.textAlign = "center";
//       ctx.textBaseline = "middle";
//       ctx.fillText(`${Math.round(p * 100)}%`, cx, cy - r * 0.33);
//       if (p < target) {
//         p = Math.min(target, p + target / 45);
//         raf.current = requestAnimationFrame(frame);
//       }
//     }
//     cancelAnimationFrame(raf.current);
//     requestAnimationFrame(frame);
//     return () => cancelAnimationFrame(raf.current);
//   }, [pct, color]);

//   return <canvas ref={ref} style={{ display: "block" }} />;
// }

export function SpeedGauge({
  pct,
  color,
  width = 160,
  height = 98,
}: {
  pct: number;
  color: string;
  width?: number;
  height?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const raf = useRef<number>(0);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    const W = width;
    // H = height;
    const r = W * 0.34;
    const sw = W * 0.07;
    const H = Math.round(r + sw * 1.5 + sw + 8);
    const cy = H - sw - 4;
    cv.width = W * dpr;
    cv.height = H * dpr;
    cv.style.width = `${W}px`;
    cv.style.height = `${H}px`;
    const ctx = cv.getContext("2d")!;
    ctx.scale(dpr, dpr);
    const cx = W / 2;

    const sA = Math.PI,
      eA = Math.PI * 2;
    const target = Math.min(pct, 100) / 100;
    let p = 0;

    const bgSegs = [
      { f: 0, t: 0.25, c: "#FCEBEB" },
      { f: 0.25, t: 0.5, c: "#FEF6E7" },
      { f: 0.5, t: 0.75, c: "#EAF3DE" },
      { f: 0.75, t: 1, c: "#EAF5F0" },
    ];
    const fillSegs = [
      { f: 0, t: 0.25, c: "#E24B4A" },
      { f: 0.25, t: 0.5, c: "#EF9F27" },
      { f: 0.5, t: 0.75, c: "#639922" },
      { f: 0.75, t: 1, c: "#1D9E75" },
    ];

    function frame() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, W, H);
      bgSegs.forEach((s) => {
        ctx.beginPath();
        ctx.arc(cx, cy, r, sA + (eA - sA) * s.f, sA + (eA - sA) * s.t);
        ctx.strokeStyle = s.c;
        ctx.lineWidth = sw;
        ctx.lineCap = "butt";
        ctx.stroke();
      });
      if (p > 0) {
        fillSegs
          .filter((s) => s.f < p)
          .forEach((s) => {
            const t = Math.min(s.t, p);
            ctx.beginPath();
            ctx.arc(cx, cy, r, sA + (eA - sA) * s.f, sA + (eA - sA) * t);
            ctx.strokeStyle = s.c;
            ctx.lineWidth = sw;
            ctx.lineCap = t === p ? "round" : "butt";
            ctx.stroke();
          });
      }
      for (let i = 0; i <= 10; i++) {
        const a = sA + (eA - sA) * (i / 10),
          isMaj = i % 5 === 0;
        const r1 = r - sw / 2 - 2,
          r2 = r + sw / 2 + (isMaj ? 5 : 2);
        ctx.beginPath();
        ctx.moveTo(cx + r1 * Math.cos(a), cy + r1 * Math.sin(a));
        ctx.lineTo(cx + r2 * Math.cos(a), cy + r2 * Math.sin(a));
        ctx.strokeStyle = isMaj ? "rgba(0,0,0,.18)" : "rgba(0,0,0,.07)";
        ctx.lineWidth = isMaj ? 1.5 : 0.7;
        ctx.lineCap = "square";
        ctx.stroke();
      }
      const nA = sA + (eA - sA) * p,
        nLen = r - sw / 2 - 5;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + nLen * Math.cos(nA), cy + nLen * Math.sin(nA));
      ctx.strokeStyle = "#374151";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.restore();
      ctx.font = `700 ${Math.round(W * 0.12)}px 'DM Sans',sans-serif`;
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${Math.round(p * 100)}%`, cx, cy - r * 0.33);
      if (p < target) {
        p = Math.min(target, p + target / 45);
        raf.current = requestAnimationFrame(frame);
      }
    }
    cancelAnimationFrame(raf.current);
    requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf.current);
  }, [pct, color, width, height]);

  return (
    <canvas
      ref={ref}
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        maxWidth: `${width}px`,
        margin: "0 auto",
      }}
    />
  );
}

// ─── Line chart (canvas) ─────────────────────────────────────────────────────
export function LineChart({
  series,
  labels,
}: {
  series: { nom: string; color: string; dash: number[]; data: number[] }[];
  labels: string[];
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    const W = cv.offsetWidth || 700,
      H = 220;
    cv.width = W * dpr;
    cv.height = H * dpr;
    const ctx = cv.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const pad = { top: 20, right: 52, bottom: 36, left: 44 };
    const cW = W - pad.left - pad.right,
      cH = H - pad.top - pad.bottom;
    const maxVal = Math.max(...series.flatMap((s) => s.data)) * 1.1;
    const xOf = (i: number) => pad.left + (i / (labels.length - 1)) * cW;
    const yOf = (v: number) => pad.top + cH - (v / maxVal) * cH;

    for (let s = 0; s <= 4; s++) {
      const y = pad.top + (s / 4) * cH;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + cW, y);
      ctx.strokeStyle = "#F3F4F6";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.font = "10px 'DM Sans',sans-serif";
      ctx.fillStyle = "#9CA3AF";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(
        String(Math.round(maxVal - (maxVal / 4) * s)),
        pad.left - 6,
        y,
      );
    }
    labels.forEach((lbl, i) => {
      ctx.font = "10px 'DM Sans',sans-serif";
      ctx.fillStyle = "#9CA3AF";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(lbl, xOf(i), pad.top + cH + 8);
    });
    series.forEach((s) => {
      const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + cH);
      grad.addColorStop(0, s.color + "28");
      grad.addColorStop(1, s.color + "04");
      ctx.beginPath();
      ctx.moveTo(xOf(0), yOf(s.data[0]));
      s.data.forEach((v, i) => {
        if (i > 0) ctx.lineTo(xOf(i), yOf(v));
      });
      ctx.lineTo(xOf(s.data.length - 1), pad.top + cH);
      ctx.lineTo(xOf(0), pad.top + cH);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(xOf(0), yOf(s.data[0]));
      s.data.forEach((v, i) => {
        if (i > 0) ctx.lineTo(xOf(i), yOf(v));
      });
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2;
      ctx.setLineDash(s.dash);
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.setLineDash([]);
      const lx = xOf(s.data.length - 1),
        ly = yOf(s.data[s.data.length - 1]);
      ctx.beginPath();
      ctx.arc(lx, ly, 4, 0, Math.PI * 2);
      ctx.fillStyle = s.color;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(lx, ly, 2, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.font = "700 11px 'DM Sans',sans-serif";
      ctx.fillStyle = s.color;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(String(s.data[s.data.length - 1]), lx + 7, ly);
    });
  }, [series, labels]);

  return (
    <canvas
      ref={ref}
      style={{ display: "block", width: "100%", height: "auto" }}
    />
  );
}

export function generateAnomaliesFromData(
  decoupage: DecoupageStats[],
): ErreursStats {
  const lowPerformingZones = decoupage.filter(
    (d) => d.postes_collectes.taux !== null && d.postes_collectes.taux < 10,
  );

  return {
    manquants: lowPerformingZones.map((d) => ({
      nom: d.decoupage,
      val: Math.round(100 - (d.postes_collectes.taux || 0)),
    })),
    nouveaux: [],
    doublons: [],
  };
}
