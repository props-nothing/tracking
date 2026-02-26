import React from "react";

export function GlassCard({
  children,
  className = "",
  anim = "",
}: {
  children: React.ReactNode;
  className?: string;
  anim?: string;
}) {
  return (
    <div className={`glass-card rounded-2xl p-6 ${anim} ${className}`}>
      {children}
    </div>
  );
}

export function SectionHeader({
  icon,
  title,
  iconBg,
  iconColor,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  iconBg: string;
  iconColor: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="text-base font-bold text-slate-800 flex items-center">
        <div
          className={`w-7 h-7 rounded-lg ${iconBg} ${iconColor} flex items-center justify-center mr-3 text-sm shadow-sm`}
        >
          {icon}
        </div>
        {title}
      </h2>
      {action ? <div className="self-start sm:self-auto">{action}</div> : null}
    </div>
  );
}

export function KPICard({
  label,
  value,
  icon,
  iconBg,
  iconColor,
  gradientFrom,
  delay,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  gradientFrom: string;
  delay: string;
}) {
  return (
    <div
      className={`glass-card rounded-2xl p-6 anim-scale-up ${delay} relative overflow-hidden group`}
    >
      <div
        className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl ${gradientFrom} to-transparent rounded-bl-full opacity-50 group-hover:opacity-100 transition-opacity duration-500`}
      />
      <div className="flex justify-between items-start mb-2 relative z-10">
        <div>
          <p className="text-slate-500 text-[11px] font-bold mb-1.5 uppercase tracking-wider">
            {label}
          </p>
          <h3 className="text-2xl font-black text-slate-800">{value}</h3>
        </div>
        <div
          className={`w-10 h-10 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export function DeviceBar({
  icon,
  name,
  percentage,
  idx,
}: {
  icon: React.ReactNode;
  name: string;
  percentage: number;
  idx: number;
}) {
  return (
    <div>
      <div className="flex justify-between items-end mb-1.5">
        <span className="text-xs font-bold text-slate-700 flex items-center">
          <span className="text-slate-400 mr-2.5 w-4 flex justify-center">
            {icon}
          </span>
          {name}
        </span>
        <span className="text-xs text-slate-500">
          <span className="font-bold text-slate-800">{percentage}%</span>{" "}
          verkeer
        </span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2">
        <div
          className="bg-cyan-500 h-2 rounded-full bar-fill"
          style={{ width: `${percentage}%`, animationDelay: `${idx * 100}ms` }}
        />
      </div>
    </div>
  );
}

export function TabBar({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string }[];
  active: string;
  onChange: (k: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${active === t.key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
