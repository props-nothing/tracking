import React from "react";
import { ReportData } from "@/types/report";
import { KPICard } from "@/components/report/ui";
import { Users, Eye, Activity, BarChart3, Layers, Clock } from "lucide-react";

function formatNumber(val: number) {
  return new Intl.NumberFormat("nl-NL").format(val);
}

function formatDuration(sec: number) {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

export function WebsiteKPIs({ data }: { data: ReportData }) {
  const met = data.metrics;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5 mb-8">
      <KPICard
        label="Bezoekers"
        value={formatNumber(met.visitors)}
        icon={<Users className="w-5 h-5" />}
        iconBg="bg-violet-50"
        iconColor="text-violet-600"
        gradientFrom="from-violet-100"
        delay="d100"
      />
      <KPICard
        label="Paginaweergaven"
        value={formatNumber(met.pageviews)}
        icon={<Eye className="w-5 h-5" />}
        iconBg="bg-blue-50"
        iconColor="text-blue-600"
        gradientFrom="from-blue-100"
        delay="d150"
      />
      <KPICard
        label="Sessies"
        value={formatNumber(met.sessions)}
        icon={<Activity className="w-5 h-5" />}
        iconBg="bg-emerald-50"
        iconColor="text-emerald-600"
        gradientFrom="from-emerald-100"
        delay="d200"
      />
      <KPICard
        label="Bouncepercentage"
        value={`${met.bounce_rate}%`}
        icon={<BarChart3 className="w-5 h-5" />}
        iconBg="bg-amber-50"
        iconColor="text-amber-600"
        gradientFrom="from-amber-100"
        delay="d250"
      />
      <KPICard
        label="Weergaven / sessie"
        value={met.views_per_session.toString()}
        icon={<Layers className="w-5 h-5" />}
        iconBg="bg-cyan-50"
        iconColor="text-cyan-600"
        gradientFrom="from-cyan-100"
        delay="d300"
      />
      <KPICard
        label="Gem. duur"
        value={formatDuration(met.avg_duration)}
        icon={<Clock className="w-5 h-5" />}
        iconBg="bg-rose-50"
        iconColor="text-rose-600"
        gradientFrom="from-rose-100"
        delay="d400"
      />
    </div>
  );
}
