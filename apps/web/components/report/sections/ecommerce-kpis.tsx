import React from "react";
import { ReportData } from "@/types/report";
import { KPICard } from "@/components/report/ui";
import { DollarSign, Target, Activity, ChartLine } from "lucide-react";

function formatNumber(val: number) {
  return new Intl.NumberFormat("nl-NL").format(val);
}

function formatCurrency(val: number, currency = "EUR") {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(val);
}

export function EcommerceKPIs({ data }: { data: ReportData }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
      <KPICard
        label="Totale Omzet"
        value={formatCurrency(data.metrics.total_revenue || 0)}
        icon={<DollarSign className="w-5 h-5" />}
        iconBg="bg-emerald-50"
        iconColor="text-emerald-600"
        gradientFrom="from-emerald-100"
        delay="d100"
      />
      <KPICard
        label="Aankopen"
        value={formatNumber(data.metrics.purchases || 0)}
        icon={<Target className="w-5 h-5" />}
        iconBg="bg-blue-50"
        iconColor="text-blue-600"
        gradientFrom="from-blue-100"
        delay="d150"
      />
      <KPICard
        label="Conversiepercentage"
        value={`${data.metrics.ecommerce_conversion_rate || 0}%`}
        icon={<Activity className="w-5 h-5" />}
        iconBg="bg-violet-50"
        iconColor="text-violet-600"
        gradientFrom="from-violet-100"
        delay="d200"
      />
      <KPICard
        label="Gem. Bestelwaarde"
        value={formatCurrency(
          (data.metrics.total_revenue || 0) / (data.metrics.purchases || 1),
        )}
        icon={<ChartLine className="w-5 h-5" />}
        iconBg="bg-purple-50"
        iconColor="text-purple-600"
        gradientFrom="from-purple-100"
        delay="d200"
      />
    </div>
  );
}
