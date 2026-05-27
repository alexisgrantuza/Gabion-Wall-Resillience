"use client";

import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  ArrowDownToLine,
  CloudRain,
  Cuboid,
  Gauge,
  Droplets,
  GaugeCircle,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  ShieldX,
  Waves,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { WallDisasterScene } from "@/components/simulations/wall-disaster-scene";

type Scenario = {
  id: string;
  label: string;
  rain: number;
  drainage: number;
  quake: number;
  note: string;
  event: string;
  water: string;
  wall: string;
  response: string;
  severity: "low" | "medium" | "high";
};

type ViewMode = "perspective" | "front" | "side";

const scenarios: Scenario[] = [
  {
    id: "service",
    label: "Service Rain",
    rain: 24,
    drainage: 12,
    quake: 2.4,
    note: "Drainage is clear and lateral pressure stays low",
    event: "Normal rainy day",
    water: "Pipe drains seepage at base",
    wall: "Baskets stay seated with no visible bulging",
    response: "Stable retaining action",
    severity: "low",
  },
  {
    id: "storm",
    label: "Heavy Rain",
    rain: 68,
    drainage: 38,
    quake: 3.8,
    note: "Backfill saturates and drainage carries more flow",
    event: "Long storm cell over site",
    water: "Water gathers behind geotextile before draining",
    wall: "Face shows minor outward pressure movement",
    response: "Monitor drainage outlet",
    severity: "medium",
  },
  {
    id: "carina",
    label: "Carina Event",
    rain: 100,
    drainage: 34,
    quake: 3.8,
    note: "Carina-level rainfall; gabion remains retained while concrete comparison fails",
    event: "Super Typhoon Carina-enhanced Habagat reference",
    water: "High inflow passes through the gabion and drain path",
    wall: "Gabion baskets deform slightly but remain interlocked",
    response: "Show permeability advantage versus concrete wall",
    severity: "high",
  },
  {
    id: "failure",
    label: "Beyond Carina",
    rain: 150,
    drainage: 100,
    quake: 7.8,
    note: "Beyond-design disaster load; drainage is destroyed and the gabion wall fully breaks apart",
    event: "Extreme water volume above the Carina presentation threshold",
    water: "Broken outlet and flooded trench trap water at the toe",
    wall: "Baskets overturn, mesh tears, and stone fill spills across the floor",
    response: "Full collapse animation: pipe failure, flooding, fallen baskets, and rock debris field",
    severity: "high",
  },
  {
    id: "seismic",
    label: "Seismic",
    rain: 42,
    drainage: 35,
    quake: 7.1,
    note: "Conceptual shaking over the checked retaining wall geometry",
    event: "Strong ground motion after rainfall",
    water: "Damp backfill adds lateral demand",
    wall: "Mass wall shakes, then settles back to alignment",
    response: "Inspect baskets, ties, and base movement",
    severity: "high",
  },
];

const severityClass: Record<Scenario["severity"], string> = {
  low: "border-emerald-200 bg-emerald-50 text-emerald-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  high: "border-rose-200 bg-rose-50 text-rose-700",
};

const modelLayers = [
  { label: "Gabion mesh", value: "PVC-coated wire baskets", color: "bg-[#3a6432]" },
  { label: "Stone fill", value: "Varied quarry rock inside cages", color: "bg-stone-500" },
  { label: "Granular backfill", value: "Free-draining material behind wall", color: "bg-slate-300" },
  { label: "Geotextile cloth", value: "Filter layer against retained soil", color: "bg-slate-950" },
  { label: "Native soil", value: "Existing retained earth mass", color: "bg-[#7c5828]" },
  { label: "Aggregate base", value: "Compacted foundation course", color: "bg-neutral-400" },
  { label: "Drainage pipe", value: "150 mm perforated HDPE outlet", color: "bg-orange-600" },
  { label: "Floodwater", value: "Seepage, overflow, and ponding", color: "bg-cyan-400" },
];

const inspectionFocus = [
  ["Buried course", "One gabion box layer is shown below finished grade inside the excavation."],
  ["6° inclination", "The wall body leans back into the retained soil, matching the client update."],
  ["Drain path", "Water exits through gravel, perforated pipe, catch basin, and outlet trench."],
  ["Failure mode", "Beyond Carina adds pipe damage, flooding, torn mesh, falling stones, and progressive basket separation."],
];

function getStatus(stress: number) {
  if (stress < 46) {
    return {
      label: "Stable",
      color: "text-emerald-700",
      bg: "bg-emerald-500",
      border: "border-emerald-200 bg-emerald-50",
      Icon: ShieldCheck,
    };
  }

  if (stress < 72) {
    return {
      label: "Watch",
      color: "text-amber-700",
      bg: "bg-amber-500",
      border: "border-amber-200 bg-amber-50",
      Icon: Gauge,
    };
  }

  return {
    label: "Strain",
    color: "text-rose-700",
    bg: "bg-rose-500",
    border: "border-rose-200 bg-rose-50",
    Icon: AlertTriangle,
  };
}

export function WallResilienceSimulator() {
  const [selected, setSelected] = useState(scenarios[2]);
  const [rain, setRain] = useState(selected.rain);
  const [drainage, setDrainage] = useState(selected.drainage);
  const [quake, setQuake] = useState(selected.quake);
  const [playing, setPlaying] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("perspective");
  const [zoomCommand, setZoomCommand] = useState(0);

  const stress = useMemo(() => {
    const waterPressure = rain * (0.16 + drainage * 0.0038);
    const drainagePenalty = drainage * 0.28;
    const seismicLoad = Math.max(0, quake - 2) * 7.6;
    return Math.min(100, Math.round(waterPressure + drainagePenalty + seismicLoad));
  }, [drainage, quake, rain]);

  const failureLevel = useMemo(() => {
    const rainOverCarina = Math.max(0, rain - 112) / 38;
    const blockedOutlet = Math.max(0, drainage - 72) / 28;
    const seismicOverload = Math.max(0, quake - 7.2) / 1.3;
    return Math.min(1, rainOverCarina * 0.62 + blockedOutlet * 0.28 + seismicOverload * 0.32);
  }, [drainage, quake, rain]);

  const status = getStatus(stress);
  const StatusIcon = status.Icon;
  const isCarina = selected.id === "carina";
  const isBeyondCarina = selected.id === "failure";

  function applyScenario(scenario: Scenario) {
    setSelected(scenario);
    setRain(scenario.rain);
    setDrainage(scenario.drainage);
    setQuake(scenario.quake);
  }

  function resetScenario() {
    applyScenario(selected);
    setPlaying(true);
  }

  return (
    <div className="space-y-5">
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_22rem]">
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">3D Model View</p>
            <h2 className="mt-1 font-heading text-lg font-bold text-slate-950">30 m Gabion Retaining Wall Assembly</h2>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
            <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1">1 buried layer</span>
            <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1">6° inclined</span>
            <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1">Permeable face</span>
          </div>
        </div>
        <div className="relative">
          <WallDisasterScene
            rain={rain}
            drainage={drainage}
            quake={quake}
            stress={stress}
            failureLevel={failureLevel}
            playing={playing}
            viewMode={viewMode}
            zoomCommand={zoomCommand}
          />

          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            <div className={cn("inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold", status.border, status.color)}>
              <StatusIcon className="size-4" />
              {status.label}
            </div>
            <div className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white/85 px-3 py-2 text-sm font-semibold text-slate-700 backdrop-blur">
              <Activity className="size-4" />
              {stress}% load index
            </div>
            <div className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white/85 px-3 py-2 text-sm font-semibold text-slate-700 backdrop-blur">
              FSot 2.97 / FSsl 1.54
            </div>
            <div className={cn(
              "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold backdrop-blur",
              failureLevel > 0
                ? "border-rose-200 bg-rose-50/90 text-rose-700"
                : "border-emerald-200 bg-emerald-50/90 text-emerald-700",
            )}>
              {failureLevel > 0 ? `${Math.round(failureLevel * 100)}% failure progression` : "Gabion retained"}
            </div>
          </div>

          <div className="absolute bottom-4 left-4 flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white/85 p-2 shadow-sm backdrop-blur">
            {[
              ["perspective", "Perspective"],
              ["front", "Front"],
              ["side", "Side"],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setViewMode(id as ViewMode)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition",
                  viewMode === id
                    ? "bg-slate-950 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                <Cuboid className="size-3.5" />
                {label}
              </button>
            ))}
            <div className="mx-1 h-8 w-px bg-slate-200" />
            <button
              type="button"
              onClick={() => setZoomCommand((value) => value + 1)}
              className="inline-flex size-8 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              aria-label="Zoom in"
            >
              <ZoomIn className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoomCommand((value) => value - 1)}
              className="inline-flex size-8 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              aria-label="Zoom out"
            >
              <ZoomOut className="size-4" />
            </button>
          </div>
        </div>

        <div className="grid gap-3 border-t border-slate-200 bg-slate-50 p-4 md:grid-cols-4">
          {inspectionFocus.map(([label, value]) => (
            <div key={label} className="rounded-md border border-slate-200 bg-white p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
              <p className="mt-1 text-sm leading-snug text-slate-700">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <aside className="space-y-4">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Scenario</p>
              <h2 className="mt-1 font-heading text-xl font-bold text-slate-950">{selected.label}</h2>
              <p className="mt-1 text-sm text-slate-500">{selected.note}</p>
            </div>
            <span className={cn("rounded-md border px-2.5 py-1 text-xs font-bold uppercase", severityClass[selected.severity])}>
              {selected.severity}
            </span>
            <button
              type="button"
              onClick={() => setPlaying((value) => !value)}
              className="inline-flex size-10 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
              aria-label={playing ? "Pause simulation" : "Play simulation"}
            >
              {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {scenarios.map((scenario) => (
              <button
                key={scenario.id}
                type="button"
                onClick={() => applyScenario(scenario)}
                className={cn(
                  "rounded-md border px-3 py-2 text-left text-sm font-semibold transition",
                  selected.id === scenario.id
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                )}
              >
                <span className="block truncate">{scenario.label}</span>
                <span className={cn("mt-1 block h-1.5 rounded-full", scenario.severity === "low" ? "bg-emerald-400" : scenario.severity === "medium" ? "bg-amber-400" : "bg-rose-400")} />
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-2">
            {[
              { icon: CloudRain, label: "Event", value: selected.event },
              { icon: Droplets, label: "Water", value: selected.water },
              { icon: GaugeCircle, label: "Wall", value: selected.wall },
              { icon: ArrowDownToLine, label: "Response", value: selected.response },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.label} className="grid grid-cols-[1.5rem_4.25rem_minmax(0,1fr)] items-start gap-2 rounded-md border border-slate-200 bg-slate-50 p-2.5">
                  <Icon className="mt-0.5 size-4 text-slate-400" />
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-400">{item.label}</span>
                  <span className="text-sm leading-snug text-slate-700">{item.value}</span>
                </div>
              );
            })}
          </div>

          {(isCarina || isBeyondCarina) ? (
            <div
              className={cn(
                "mt-4 rounded-lg border p-3",
                isBeyondCarina
                  ? "border-rose-200 bg-rose-50"
                  : "border-emerald-200 bg-emerald-50",
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-md",
                    isBeyondCarina ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700",
                  )}
                >
                  {isBeyondCarina ? <ShieldX className="size-4" /> : <ShieldCheck className="size-4" />}
                </div>
                <div>
                  <p className={cn("text-sm font-bold", isBeyondCarina ? "text-rose-900" : "text-emerald-900")}>
                    {isBeyondCarina ? "Full wall destruction state" : "Carina retained state"}
                  </p>
                  <p className={cn("mt-1 text-xs leading-relaxed", isBeyondCarina ? "text-rose-700" : "text-emerald-700")}>
                    {isBeyondCarina
                      ? "Animation shows the drainage outlet destroyed, trench flooding, baskets overturning, wire tearing, falling rocks, and a debris field forming across the floor once the load exceeds Carina."
                      : "At Carina-level water volume, concrete comparison collapses while the gabion remains permeable and interlocked."}
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-md bg-white/70 p-2">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Concrete wall</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {isBeyondCarina ? "Failed earlier" : "Collapsed comparison"}
                  </p>
                </div>
                <div className="rounded-md bg-white/70 p-2">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Gabion wall</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {isBeyondCarina ? "Fully destroyed" : "Retained"}
                  </p>
                </div>
              </div>
              {isBeyondCarina ? (
                <div className="mt-3 rounded-md border border-rose-200 bg-white/80 p-2.5">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-rose-400">Visible effects</p>
                  <p className="mt-1 text-xs leading-relaxed text-rose-700">
                    Look for fallen front baskets, exposed stone core, scattered rocks on the ground, torn mesh lines, broken orange pipe, and floodwater around both drainage channels.
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Load Inputs</p>
            <button
              type="button"
              onClick={resetScenario}
              className="inline-flex size-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
              aria-label="Reset scenario"
            >
              <RotateCcw className="size-3.5" />
            </button>
          </div>

          <div className="mt-4 space-y-5">
            <Control icon={CloudRain} label="Water volume" value={rain} max={150} unit="% Carina" onChange={setRain} />
            <Control icon={Droplets} label="Drainage blockage" value={drainage} unit="%" onChange={setDrainage} />
            <Control
              icon={Waves}
              label="Seismic shaking"
              value={quake}
              min={1}
              max={8.5}
              step={0.1}
              unit="M"
              onChange={setQuake}
            />
          </div>
        </section>

      </aside>
    </div>


    <div className="grid gap-5 md:grid-cols-3">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Performance Envelope</p>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
          <div className={cn("h-full rounded-full transition-all duration-500", status.bg)} style={{ width: `${stress}%` }} />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-semibold text-slate-500">
          <span>Stable</span>
          <span>Watch</span>
          <span>Risk</span>
        </div>
        <p className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
          Carina marker uses PAGASA-reported rainfall references as a presentation benchmark. Gabion failure is intentionally set beyond that marker; final thresholds should be signed off by a structural engineer.
        </p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Model Layers</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {modelLayers.map((item) => (
            <div key={item.label} className="grid grid-cols-[0.9rem_minmax(0,1fr)] gap-2 rounded-md border border-slate-200 bg-slate-50 p-2.5">
              <span className={cn("mt-1 size-3 shrink-0 rounded-sm ring-1 ring-black/10", item.color)} />
              <div>
                <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                <p className="text-xs leading-snug text-slate-500">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Design Basis</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
          {[
            ["Actual length", "30 m"],
            ["PDF record", "28 m"],
            ["Exposed height", "4 m"],
            ["Embedded layer", "1 box"],
            ["Inclination", "6°"],
            ["Layers", "3m / 2m / 2m / 1m"],
            ["Drain pipe", "150 mm"],
            ["Carina 24h", "323.9 mm"],
            ["Storm total", "618.8 mm"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border border-slate-200 bg-slate-50 p-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
              <p className="mt-1 font-semibold text-slate-800">{value}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
    </div>
  );
}

function Control({
  icon: Icon,
  label,
  value,
  unit,
  min = 0,
  max = 100,
  step = 1,
  onChange,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  unit: string;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold text-slate-700">
        <span className="inline-flex min-w-0 items-center gap-2">
          <Icon className="size-4 shrink-0 text-slate-400" />
          <span className="truncate">{label}</span>
        </span>
        <span className="tabular-nums text-slate-950">
          {unit === "M" ? value.toFixed(1) : Math.round(value)}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full accent-slate-950"
      />
    </label>
  );
}
