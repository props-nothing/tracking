import React from "react";
import { ReportData } from "@/types/report";
import { GlassCard, SectionHeader, DeviceBar } from "@/components/report/ui";
import { browserIcon, osIcon } from "@/components/report/icons";
import { Monitor, Smartphone, Tablet, UserCheck } from "lucide-react";

function formatNumber(val: number) {
  return new Intl.NumberFormat("nl-NL").format(val);
}

export function DevicesSection({ data }: { data: ReportData }) {
  const met = data.metrics;
  const totalDev = data.device_types.reduce((a, d) => a + d.value, 0);
  const devPcts = data.device_types.map((d) => ({
    name: d.name,
    pct: totalDev > 0 ? Math.round((d.value / totalDev) * 100) : 0,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <GlassCard anim="anim-slide-up d500" className="flex flex-col">
        <SectionHeader
          icon={<Smartphone className="w-4 h-4" />}
          title="Apparaten"
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
        />
        <div className="space-y-4 flex-grow">
          {devPcts.map((d, i) => {
            const ic =
              d.name.toLowerCase() === "desktop" ? (
                <Monitor className="w-3.5 h-3.5" />
              ) : d.name.toLowerCase() === "mobile" ? (
                <Smartphone className="w-3.5 h-3.5" />
              ) : (
                <Tablet className="w-3.5 h-3.5" />
              );
            return (
              <DeviceBar
                key={d.name}
                icon={ic}
                name={d.name}
                percentage={d.pct}
                idx={i}
              />
            );
          })}
        </div>

        {/* Retention */}
        <div className="mt-auto pt-6 border-t border-slate-100">
          <div className="flex justify-between items-end mb-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Terugkerende bezoekers
            </span>
            <div className="text-right">
              <span className="text-lg font-black text-slate-800">
                {met.returning_percentage || 0}%
              </span>
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 mb-1.5 shadow-inner">
            <div
              className="bg-indigo-500 h-2.5 rounded-full transition-all duration-1000 bar-fill relative"
              style={{ width: `${met.returning_percentage || 0}%` }}
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-white/30 rounded-full"></div>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-medium flex items-center">
            <UserCheck className="w-3 h-3 mr-1.5" />
            <span>{formatNumber(met.returning_visitors || 0)}</span> bezoekers
          </p>
        </div>
      </GlassCard>

      <GlassCard anim="anim-slide-up d600">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center mb-4">
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mr-3 text-sm shadow-sm">
                <Monitor className="w-4 h-4" />
              </div>
              <p className="text-sm font-bold text-slate-800">Browsers</p>
            </div>
            <div className="space-y-1.5">
              {data.browsers.slice(0, 5).map((b) => {
                const tot = data.browsers.reduce((a, x) => a + x.value, 0);
                const pct = tot > 0 ? Math.round((b.value / tot) * 100) : 0;
                return (
                  <div
                    key={b.name}
                    className="relative overflow-hidden rounded-lg p-2.5 border border-transparent hover:border-slate-200 group transition-colors"
                  >
                    <div
                      className="absolute top-0 bottom-0 left-0 bg-purple-100 opacity-50 -z-10 bar-fill"
                      style={{ width: `${pct}%` }}
                    />
                    <div className="flex justify-between items-center text-[13px]">
                      <div className="flex items-center truncate pr-2 w-3/4">
                        <span className="w-5 flex justify-center mr-2 shrink-0">
                          {browserIcon(b.name)}
                        </span>
                        <span className="font-semibold text-slate-700 truncate group-hover:text-slate-900 transition-colors">
                          {b.name}
                        </span>
                      </div>
                      <span className="font-bold text-slate-900 shrink-0">
                        {formatNumber(b.value)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <div className="flex items-center mb-4">
              <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center mr-3 text-sm shadow-sm">
                <Monitor className="w-4 h-4" />
              </div>
              <p className="text-sm font-bold text-slate-800">
                Besturingssystemen
              </p>
            </div>
            <div className="space-y-1.5">
              {data.operating_systems.slice(0, 5).map((os) => {
                const tot = data.operating_systems.reduce(
                  (a, x) => a + x.value,
                  0,
                );
                const pct = tot > 0 ? Math.round((os.value / tot) * 100) : 0;
                return (
                  <div
                    key={os.name}
                    className="relative overflow-hidden rounded-lg p-2.5 border border-transparent hover:border-slate-200 group transition-colors"
                  >
                    <div
                      className="absolute top-0 bottom-0 left-0 bg-slate-200 opacity-50 -z-10 bar-fill"
                      style={{ width: `${pct}%` }}
                    />
                    <div className="flex justify-between items-center text-[13px]">
                      <div className="flex items-center truncate pr-2 w-3/4">
                        <span className="w-5 flex justify-center mr-2 shrink-0">
                          {osIcon(os.name)}
                        </span>
                        <span className="font-semibold text-slate-700 truncate group-hover:text-slate-900 transition-colors">
                          {os.name}
                        </span>
                      </div>
                      <span className="font-bold text-slate-900 shrink-0">
                        {formatNumber(os.value)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
