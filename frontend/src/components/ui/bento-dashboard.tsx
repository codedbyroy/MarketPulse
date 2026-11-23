"use client";

import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  BarChart3,
  Radar,
  PieChart as PieChartIcon,
  Activity,
  Zap,
  ShieldCheck,
  Cpu,
  Layers,
  TrendingUp,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";

// =========================================
// 1. UPGRADED NEO-BRUTALIST BAR CHART
// =========================================
const BAR_DATA = [
  { label: "MON", value: 40, color: "bg-rose-500", glow: "shadow-rose-500/20" },
  { label: "TUE", value: 65, color: "bg-sky-500", glow: "shadow-sky-500/20" },
  { label: "WED", value: 35, color: "bg-emerald-500", glow: "shadow-emerald-500/20" },
  { label: "THU", value: 85, color: "bg-amber-400", glow: "shadow-amber-400/20" },
  { label: "FRI", value: 70, color: "bg-violet-500", glow: "shadow-violet-500/20" },
];

export const BrutalistBarChart = () => {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="w-full h-full bg-white dark:bg-zinc-950 border-[3px] border-black dark:border-zinc-800 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.08)] relative flex flex-col p-6 transition-all duration-200 rounded-xl overflow-hidden group">
      {/* Background Accent Gradient */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-rose-500/5 to-transparent pointer-events-none rounded-bl-full" />

      {/* Header */}
      <div className="flex items-center justify-between border-b-[3px] border-black dark:border-zinc-800 pb-3 mb-6 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-black dark:bg-white flex items-center justify-center text-white dark:text-black">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-black uppercase tracking-tight text-lg text-black dark:text-white leading-none">
              Weekly Traffic
            </h3>
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-semibold">
              Live Ingestion Volume
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-bold">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>+24.8%</span>
        </div>
      </div>

      {/* Bars Container */}
      <div className="flex justify-between items-end flex-1 gap-3 sm:gap-4 min-h-[160px] z-10 pt-4">
        {BAR_DATA.map((item, i) => (
          <div key={i} className="relative flex-1 h-full flex flex-col justify-end items-center group/bar">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${item.value}%` }}
              transition={{
                type: "spring",
                stiffness: 220,
                damping: 22,
                delay: i * 0.08,
              }}
              onHoverStart={() => setHovered(i)}
              onHoverEnd={() => setHovered(null)}
              className={cn(
                "w-full border-[2.5px] border-black dark:border-zinc-800 relative z-10 cursor-pointer origin-bottom flex items-center justify-center overflow-hidden rounded-t-md transition-shadow",
                item.color,
                hovered === i && "shadow-lg"
              )}
              whileHover={{ scaleY: 1.05, scaleX: 1.04 }}
              whileTap={{ scaleY: 0.96 }}
            >
              {/* Pattern Texture Overlay */}
              <div className="absolute inset-0 opacity-25 pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] dark:bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:4px_4px]" />
              
              <span className="relative z-20 font-black text-[11px] font-mono text-black/90 group-hover/bar:text-black transition-colors">
                {item.label}
              </span>
            </motion.div>

            {/* Hover Tooltip */}
            <AnimatePresence>
              {hovered === i && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.9 }}
                  className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black dark:bg-white text-white dark:text-black px-2.5 py-1 text-xs font-black whitespace-nowrap border-2 border-black dark:border-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.2)] rounded z-30 pointer-events-none flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-amber-400 dark:text-amber-600" />
                  <span>{item.value}k req/s</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// 2. UPGRADED NEO-BRUTALIST RADAR CHART
// ==========================================
const RADAR_DATA = [
  { label: "SPEED", value: 85, color: "#f43f5e", icon: Zap },
  { label: "UPTIME", value: 98, color: "#10b981", icon: ShieldCheck },
  { label: "SECURE", value: 92, color: "#0ea5e9", icon: Activity },
  { label: "UX", value: 75, color: "#f59e0b", icon: Sparkles },
  { label: "SEO", value: 88, color: "#8b5cf6", icon: Layers },
];

const NUM_AXES = RADAR_DATA.length;
const RADAR_SIZE = 220;
const CENTER = RADAR_SIZE / 2;
const RADIUS = 85;

const angleToRad = (angle: number) => (Math.PI / 180) * angle;
const getCoords = (value: number, index: number) => {
  const angle = angleToRad((360 / NUM_AXES) * index - 90);
  const r = (value / 100) * RADIUS;
  return {
    x: CENTER + r * Math.cos(angle),
    y: CENTER + r * Math.sin(angle),
  };
};

export const BrutalistRadarChart = () => {
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);

  const pathData =
    RADAR_DATA.map((d, i) => {
      const coords = getCoords(d.value, i);
      return `${i === 0 ? "M" : "L"} ${coords.x} ${coords.y}`;
    }).join(" ") + " Z";

  const gridLevels = [100, 75, 50, 25];

  return (
    <div className="w-full h-full bg-white dark:bg-zinc-950 border-[3px] border-black dark:border-zinc-800 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.08)] p-6 flex flex-col sm:flex-row gap-6 relative overflow-hidden transition-all duration-200 rounded-xl">
      {/* Background Subtle Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] dark:opacity-[0.05]">
        <span className="text-9xl font-black uppercase text-black dark:text-white select-none">
          RADAR
        </span>
      </div>

      {/* LEFT: CHART AREA */}
      <div className="flex-1 flex items-center justify-center relative min-h-[240px]">
        <svg
          viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}
          className="w-full h-full max-w-[240px] overflow-visible"
        >
          {/* Radial Grid Circles / Polygons */}
          {gridLevels.map((level, lvlIdx) => (
            <path
              key={lvlIdx}
              d={
                RADAR_DATA.map((_, i) => {
                  const c = getCoords(level, i);
                  return `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`;
                }).join(" ") + " Z"
              }
              fill="none"
              className="stroke-black/15 dark:stroke-white/10"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
          ))}

          {/* Axes Lines */}
          {RADAR_DATA.map((_, i) => {
            const outer = getCoords(100, i);
            return (
              <line
                key={i}
                x1={CENTER}
                y1={CENTER}
                x2={outer.x}
                y2={outer.y}
                className="stroke-black/15 dark:stroke-white/10"
                strokeWidth="1.5"
              />
            );
          })}

          {/* The Data Polygon with Gradient Fill */}
          <motion.path
            d={pathData}
            fill="rgba(139, 92, 246, 0.35)"
            className="stroke-purple-600 dark:stroke-purple-400"
            strokeWidth="3.5"
            strokeLinejoin="round"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 180,
              damping: 20,
              delay: 0.15,
            }}
            style={{ originX: "50%", originY: "50%" }}
          />

          {/* Interactive Points */}
          {RADAR_DATA.map((d, i) => {
            const coords = getCoords(d.value, i);
            const isHovered = hoveredMetric === d.label;

            return (
              <g
                key={i}
                onMouseEnter={() => setHoveredMetric(d.label)}
                onMouseLeave={() => setHoveredMetric(null)}
                className="cursor-pointer"
              >
                <circle cx={coords.x} cy={coords.y} r="18" fill="transparent" />
                <motion.circle
                  cx={coords.x}
                  cy={coords.y}
                  r="5"
                  fill={isHovered ? d.color : "#ffffff"}
                  className="stroke-black dark:stroke-white"
                  strokeWidth="2.5"
                  animate={{
                    scale: isHovered ? 2.2 : 1,
                    strokeWidth: isHovered ? 3.5 : 2.5,
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* RIGHT: STATS LIST */}
      <div className="w-full sm:w-44 flex flex-col justify-center gap-2 z-10">
        <div className="flex items-center gap-2 border-b-[3px] border-black dark:border-zinc-800 pb-2 mb-2">
          <Radar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <h3 className="font-black uppercase tracking-tight text-base text-black dark:text-white">
            System Health
          </h3>
        </div>
        {RADAR_DATA.map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={i}
              onMouseEnter={() => setHoveredMetric(item.label)}
              onMouseLeave={() => setHoveredMetric(null)}
              className={cn(
                "flex items-center justify-between p-2 rounded-lg border-2 transition-all cursor-pointer",
                hoveredMetric === item.label
                  ? "border-black dark:border-white bg-black/5 dark:bg-white/10 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)]"
                  : "border-transparent hover:border-black/30 dark:hover:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/60"
              )}
              animate={{
                x: hoveredMetric === item.label ? 6 : 0,
              }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full border border-black dark:border-white"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200">
                  {item.label}
                </span>
              </div>
              <span className="font-black text-xs font-mono text-black dark:text-white">
                {item.value}%
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

// =========================================
// 3. UPGRADED NEO-BRUTALIST DONUT CHART
// =========================================
const PIE_DATA = [
  { label: "CPU", value: 35, color: "#f43f5e", icon: Cpu, desc: "Compute threads" },
  { label: "RAM", value: 25, color: "#10b981", icon: Layers, desc: "Dynamic memory" },
  { label: "I/O", value: 25, color: "#0ea5e9", icon: Zap, desc: "Disk throughput" },
  { label: "LATENCY", value: 15, color: "#f59e0b", icon: Activity, desc: "Network roundtrip" },
];

const springConfig = { type: "spring" as const, stiffness: 300, damping: 22 };
const getPieCoords = (percent: number) => {
  const x = Math.cos(2 * Math.PI * percent);
  const y = Math.sin(2 * Math.PI * percent);
  return [x, y];
};

export const BrutalistDonut = () => {
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);
  let cumulativePercent = 0;

  return (
    <div className="w-full h-full bg-white dark:bg-zinc-950 border-[3px] border-black dark:border-zinc-800 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.08)] p-6 flex flex-col items-center justify-between overflow-hidden relative transition-all duration-200 rounded-xl">
      {/* Background Dot Texture */}
      <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.08] pointer-events-none z-0 bg-[radial-gradient(#000_1.5px,transparent_1.5px)] dark:bg-[radial-gradient(#fff_1.5px,transparent_1.5px)] [background-size:12px_12px]" />

      {/* Header */}
      <div className="w-full flex items-center justify-between border-b-[3px] border-black dark:border-zinc-800 pb-3 mb-6 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-black dark:bg-white flex items-center justify-center text-white dark:text-black">
            <PieChartIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-black uppercase tracking-tight text-lg text-black dark:text-white leading-none">
              System Load
            </h3>
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-semibold">
              Resource Distribution
            </span>
          </div>
        </div>
        <span className="text-xs font-mono font-bold px-2 py-1 bg-black/5 dark:bg-white/10 rounded border border-black/10 dark:border-white/10 text-zinc-700 dark:text-zinc-300">
          Core-8
        </span>
      </div>

      <div className="z-10 flex flex-col items-center w-full h-full justify-center">
        {/* SVG Donut */}
        <div className="relative w-56 h-56 sm:w-64 sm:h-64 md:w-72 md:h-72">
          <motion.svg
            viewBox="-1.25 -1.25 2.5 2.5"
            className="-rotate-90 overflow-visible w-full h-full"
            initial={{ rotate: -180, scale: 0 }}
            animate={{ rotate: -90, scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 120,
              damping: 20,
              delay: 0.1,
            }}
          >
            {PIE_DATA.map((slice) => {
              const startPercent = cumulativePercent;
              const endPercent = cumulativePercent + slice.value / 100;
              cumulativePercent = endPercent;
              const [startX, startY] = getPieCoords(startPercent);
              const [endX, endY] = getPieCoords(endPercent);
              const largeArcFlag = slice.value / 100 > 0.5 ? 1 : 0;
              const pathData = [
                `M ${startX} ${startY}`,
                `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
                `L 0 0`,
              ].join(" ");
              const isHovered = hoveredSlice === slice.label;
              const isDimmed = hoveredSlice !== null && !isHovered;

              return (
                <motion.path
                  key={slice.label}
                  d={pathData}
                  fill={slice.color}
                  className="stroke-black dark:stroke-zinc-900 cursor-pointer"
                  strokeWidth="0.04"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  animate={{
                    translateX: isHovered ? (startX + endX) * 0.08 : 0,
                    translateY: isHovered ? (startY + endY) * 0.08 : 0,
                    scale: isHovered ? 1.04 : 1,
                    opacity: isDimmed ? 0.35 : 1,
                    filter: isDimmed ? "grayscale(70%)" : "grayscale(0%)",
                  }}
                  transition={springConfig}
                  onMouseEnter={() => setHoveredSlice(slice.label)}
                  onMouseLeave={() => setHoveredSlice(null)}
                />
              );
            })}
            <motion.circle
              cx="0"
              cy="0"
              r="0.58"
              className="fill-white dark:fill-zinc-950 stroke-black dark:stroke-zinc-800"
              strokeWidth="0.04"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, ...springConfig }}
            />
          </motion.svg>

          {/* Central Donut Readout */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <AnimatePresence mode="popLayout">
              {hoveredSlice ? (
                <motion.div
                  key="hover-content"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  className="flex flex-col items-center"
                >
                  <span className="text-3xl font-black font-mono leading-none text-black dark:text-white">
                    {PIE_DATA.find((d) => d.label === hoveredSlice)?.value}%
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-black dark:bg-white text-white dark:text-black px-2 py-0.5 mt-1 rounded font-mono">
                    {hoveredSlice}
                  </span>
                </motion.div>
              ) : (
                <motion.div
                  key="default-content"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  className="flex flex-col items-center"
                >
                  <span className="text-3xl font-black font-mono leading-none text-black dark:text-white">
                    100%
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 font-mono">
                    TOTAL ALLOC
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Legend Grid */}
        <div className="w-full mt-6 grid grid-cols-2 gap-2.5">
          {PIE_DATA.map((item) => {
            const Icon = item.icon;
            const isHovered = hoveredSlice === item.label;
            return (
              <motion.div
                key={item.label}
                onMouseEnter={() => setHoveredSlice(item.label)}
                onMouseLeave={() => setHoveredSlice(null)}
                animate={{
                  opacity: hoveredSlice && !isHovered ? 0.35 : 1,
                  scale: isHovered ? 1.02 : 1,
                }}
                className={cn(
                  "flex items-center gap-2.5 p-2.5 rounded-lg border-2 transition-all cursor-pointer",
                  isHovered
                    ? "border-black dark:border-white bg-black/5 dark:bg-white/10 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)]"
                    : "border-transparent bg-zinc-50 dark:bg-zinc-900/60 hover:border-black/20 dark:hover:border-zinc-700"
                )}
              >
                <div
                  className="w-3.5 h-3.5 rounded border border-black dark:border-white shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-black uppercase text-black dark:text-white font-mono leading-none">
                    {item.label}
                  </span>
                  <span className="text-[10px] text-zinc-500 truncate mt-0.5">
                    {item.desc}
                  </span>
                </div>
                <span className="ml-auto text-xs font-mono font-black text-black dark:text-white">
                  {item.value}%
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// =========================================
// 4. MAIN BENTO LAYOUT (THE UPGRADED DASHBOARD)
// =========================================
export default function BentoDashboard() {
  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-[#070C18] text-slate-900 dark:text-slate-100 p-4 md:p-10 font-sans selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black flex flex-col transition-colors duration-200 relative overflow-hidden">
      {/* Texture Background Layer with subtle stock hero watermark */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.06] bg-[radial-gradient(#000_1px,transparent_1px)] dark:bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]" />
      
      {/* Ambient gradient glow */}
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-purple-500/10 dark:bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-40 -right-40 w-96 h-96 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl w-full mx-auto relative z-10 flex flex-col flex-1">
        {/* Header */}
        <header className="mb-8 md:mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b-2 border-black/10 dark:border-zinc-800 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/5 dark:bg-white/10 text-xs font-mono font-bold tracking-widest uppercase mb-2 border border-black/10 dark:border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Neo-Bento v2.0 • Financial Engine</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-black dark:text-white">
              System Analytics
            </h1>
            <p className="font-mono text-zinc-500 dark:text-zinc-400 text-xs md:text-sm mt-1">
              High-frequency metrics &amp; operational telemetry
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>LIVE FEED ACTIVE</span>
            </div>
          </div>
        </header>

        {/* MAIN BENTO GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 auto-rows-[minmax(0,1fr)]">
          {/* COLUMN 1 (LEFT): STACKED BAR + RADAR */}
          <div className="flex flex-col gap-6">
            <div className="w-full min-h-[380px]">
              <BrutalistBarChart />
            </div>
            <div className="w-full min-h-[380px]">
              <BrutalistRadarChart />
            </div>
          </div>

          {/* COLUMN 2 (RIGHT): FULL HEIGHT DONUT */}
          <div className="h-full min-h-[480px] lg:h-auto flex">
            <div className="w-full h-full">
              <BrutalistDonut />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
