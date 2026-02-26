import React, { Fragment, useState } from "react";
import { ReportData } from "@/types/report";
import { GlassCard, SectionHeader, TabBar } from "@/components/report/ui";
import { utmIcon } from "@/components/report/icons";
import { TimeSeries } from "@/components/charts/time-series";
import {
  ChartLine,
  FilterIcon,
  Users,
  Target,
  Activity,
  DollarSign,
  TrendingUp,
} from "lucide-react";

function formatNumber(val: number) {
  return new Intl.NumberFormat("nl-NL").format(val);
}

function formatCurrency(val: number, currency: string = "EUR") {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: currency,
  }).format(val);
}

interface EcommerceDetailProps {
  showEcommerce: boolean;
  data: ReportData;
  range: string;
}

export function EcommerceDetail({
  showEcommerce,
  data,
  range,
}: EcommerceDetailProps) {
  const [ecomTab, setEcomTab] = useState<"sources" | "campaigns">("sources");

  if (!showEcommerce || (data.metrics.total_revenue || 0) <= 0) {
    return null;
  }

  return (
    <>
      {data.revenue_timeseries && data.revenue_timeseries.length > 0 && (
        <GlassCard className="mb-6" anim="anim-slide-up d300">
          <SectionHeader
            icon={<ChartLine className="w-4 h-4" />}
            title="Omzet Ontwikkeling"
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
          />
          <div className="flex-grow relative" style={{ minHeight: 280 }}>
            <TimeSeries
              data={data.revenue_timeseries.map((d) => {
                const tsData = data.timeseries.find((t) => t.date === d.date);
                return {
                  date: d.date,
                  pageviews: tsData?.pageviews || 0,
                  visitors: tsData?.visitors || 0,
                  revenue: d.revenue,
                };
              })}
              period={range}
              isRevenue
            />
          </div>
        </GlassCard>
      )}

      {data.ecommerce_funnel && (
        <GlassCard className="mb-6" anim="anim-slide-up d350">
          <SectionHeader
            icon={<FilterIcon className="w-4 h-4" />}
            title="Winkelwagen Funnel"
            iconBg="bg-indigo-50"
            iconColor="text-indigo-600"
          />
          <div className="relative w-full mt-4">
            {[
              {
                id: "sessies",
                label: "Sessies",
                value: data.ecommerce_funnel.sessions,
                icon: <Users className="w-4 h-4" />,
                bgLight: "bg-blue-50",
                textIcon: "text-blue-600",
                borderClass: "border-blue-100",
                bgFill: "bg-blue-50",
              },
              {
                id: "cart",
                label: "Toegevoegd aan winkelwagen",
                value: data.ecommerce_funnel.add_to_cart,
                icon: <Target className="w-4 h-4" />,
                bgLight: "bg-indigo-50",
                textIcon: "text-indigo-600",
                borderClass: "border-indigo-100",
                bgFill: "bg-indigo-50",
              },
              {
                id: "checkout",
                label: "Afrekenen gestart",
                value: data.ecommerce_funnel.begin_checkout,
                icon: <Activity className="w-4 h-4" />,
                bgLight: "bg-purple-50",
                textIcon: "text-purple-600",
                borderClass: "border-purple-100",
                bgFill: "bg-purple-50",
              },
              {
                id: "purchase",
                label: "Aankopen",
                value: data.ecommerce_funnel.purchases,
                icon: <DollarSign className="w-4 h-4" />,
                bgLight: "bg-emerald-50",
                textIcon: "text-emerald-600",
                borderClass: "border-emerald-100",
                bgFill: "bg-emerald-50",
              },
            ].map((step, index, steps) => {
              let convHtml = null;
              if (index > 0) {
                const prevValue = steps[index - 1].value;
                const convRate =
                  prevValue > 0
                    ? ((step.value / prevValue) * 100).toFixed(1)
                    : "0.0";
                const dropRate =
                  prevValue > 0
                    ? (100 - parseFloat(convRate)).toFixed(1)
                    : "0.0";

                convHtml = (
                  <div
                    key={`conv-${index}`}
                    className="flex items-center py-2 relative group"
                  >
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200 -z-10 group-hover:bg-blue-300 transition-colors"></div>
                    <div className="ml-12 w-full flex items-center justify-between pr-2">
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="bg-emerald-50 text-emerald-600 font-bold px-2 py-0.5 rounded border border-emerald-100 shadow-sm flex items-center">
                          <TrendingUp className="w-3 h-3 mr-1" /> {convRate}%
                        </span>
                        <span className="text-slate-500 font-medium hidden sm:inline">
                          gaat door
                        </span>
                      </div>
                      <div className="text-rose-500 font-medium text-[9px] bg-rose-50 px-2 py-0.5 rounded border border-rose-100 shadow-sm">
                        -{dropRate}% afhakers
                      </div>
                    </div>
                  </div>
                );
              }
              const relativeWidth =
                steps[0].value > 0
                  ? Math.max((step.value / steps[0].value) * 100, 2)
                  : 0;
              return (
                <Fragment key={step.id}>
                  {convHtml}
                  <div className="relative bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-300 z-10 overflow-hidden group hover:border-slate-300 hover:-translate-y-0.5">
                    <div
                      className={`absolute top-0 bottom-0 left-0 ${step.bgFill} opacity-40 -z-10 bar-fill`}
                      style={{ width: `${relativeWidth}%` }}
                    ></div>
                    <div
                      className={`absolute top-0 bottom-0 left-0 w-1 ${step.bgLight} brightness-90`}
                    ></div>
                    <div className="flex items-center justify-between pl-1">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg ${step.bgLight} ${step.textIcon} flex items-center justify-center text-sm shadow-inner border ${step.borderClass} group-hover:scale-110 transition-transform`}
                        >
                          {step.icon}
                        </div>
                        <div>
                          <h4 className="text-[13px] font-bold text-slate-800">
                            {step.label}
                          </h4>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                            Stap {index + 1}
                          </p>
                        </div>
                      </div>
                      <span className="text-base font-black text-slate-800">
                        {formatNumber(step.value)}
                      </span>
                    </div>
                  </div>
                </Fragment>
              );
            })}
          </div>
          <div className="mt-4 flex justify-between items-center border-t border-slate-100 pt-4">
            <div className="text-sm text-slate-600">
              Verlaten winkelwagen percentage:{" "}
              <span className="font-bold text-rose-500">
                {data.ecommerce_funnel.abandoned_rate}%
              </span>
            </div>
            <div className="text-sm text-slate-600">
              Verloren omzet:{" "}
              <span className="font-bold text-rose-500">
                {formatCurrency(data.ecommerce_funnel.abandoned_value)}
              </span>
            </div>
          </div>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <GlassCard anim="anim-slide-up d400">
          <SectionHeader
            icon={<DollarSign className="w-4 h-4" />}
            title="E-commerce Prestaties"
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            action={
              <TabBar
                tabs={[
                  { key: "sources", label: "Bronnen" },
                  { key: "campaigns", label: "Campagnes" },
                ]}
                active={ecomTab}
                onChange={(k) => setEcomTab(k as typeof ecomTab)}
              />
            }
          />
          {ecomTab === "sources" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-2">Bron</th>
                    <th className="pb-2 text-right">Aankopen</th>
                    <th className="pb-2 text-right">Omzet</th>
                    <th className="pb-2 text-right w-32">% van Totaal</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {(data.ecommerce_sources || []).slice(0, 10).map((item) => {
                    const totalSourceRevenue = (
                      data.ecommerce_sources || []
                    ).reduce((acc, source) => acc + source.revenue, 0);
                    const pct =
                      totalSourceRevenue > 0
                        ? Math.round((item.revenue / totalSourceRevenue) * 100)
                        : 0;
                    return (
                      <tr
                        key={item.name}
                        className="border-b border-slate-50 last:border-0 hover:bg-slate-50/80 transition-colors group"
                      >
                        <td className="py-3 pr-2 font-medium text-slate-700 group-hover:text-blue-600 transition-colors">
                          <span className="truncate inline-block max-w-[220px] align-middle">
                            {item.name}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right text-slate-800 font-bold tabular-nums">
                          {formatNumber(item.purchases)}
                        </td>
                        <td className="py-3 px-2 text-right text-emerald-600 font-bold tabular-nums">
                          {formatCurrency(item.revenue)}
                        </td>
                        <td className="py-3 pl-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-emerald-500 bar-fill"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="w-8 text-[11px] tabular-nums text-slate-500 font-semibold">
                              {pct}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!data.ecommerce_sources?.length && (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-8 text-center text-slate-400"
                      >
                        Geen data
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-2">Campagne</th>
                    <th className="pb-2 text-right">Aankopen</th>
                    <th className="pb-2 text-right">Omzet</th>
                    <th className="pb-2 text-right w-32">% van Totaal</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {data.ecommerce_campaigns?.slice(0, 10).map((item) => {
                    const pct =
                      (data.metrics.total_revenue || 0) > 0
                        ? Math.round(
                            (item.revenue / (data.metrics.total_revenue || 1)) *
                              100,
                          )
                        : 0;
                    return (
                      <tr
                        key={item.name}
                        className="border-b border-slate-50 last:border-0 hover:bg-slate-50/80 transition-colors group"
                      >
                        <td className="py-3 pr-2 font-medium text-slate-700 group-hover:text-blue-600 transition-colors">
                          <span className="inline-flex items-center gap-2">
                            {(() => {
                              const ui = utmIcon(item.name);
                              return (
                                <span
                                  className={`w-5 h-5 rounded flex items-center justify-center ${ui.bg} ${ui.color}`}
                                >
                                  {ui.icon}
                                </span>
                              );
                            })()}
                            {item.name}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right text-slate-800 font-bold tabular-nums">
                          {formatNumber(item.purchases)}
                        </td>
                        <td className="py-3 px-2 text-right text-emerald-600 font-bold tabular-nums">
                          {formatCurrency(item.revenue)}
                        </td>
                        <td className="py-3 pl-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-emerald-500 bar-fill"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="w-8 text-[11px] tabular-nums text-slate-500 font-semibold">
                              {pct}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!data.ecommerce_campaigns?.length && (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-8 text-center text-slate-400"
                      >
                        Geen data
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>

        {data.top_products && data.top_products.length > 0 && (
          <GlassCard anim="anim-slide-up d500">
            <SectionHeader
              icon={<Target className="w-4 h-4" />}
              title="Top Producten"
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
            />
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-2">Product</th>
                    <th className="pb-2 text-right">Aantal</th>
                    <th className="pb-2 text-right">Omzet</th>
                    <th className="pb-2 text-right">Verlaten in winkelwagen</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {data.top_products.slice(0, 10).map((p) => (
                    <tr
                      key={p.name}
                      className="border-b border-slate-50 last:border-0 hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="py-3 pr-2 font-medium text-slate-700 group-hover:text-blue-600 transition-colors truncate max-w-[200px]">
                        {p.name}
                      </td>
                      <td className="py-3 px-2 text-right text-slate-800 font-bold tabular-nums">
                        {formatNumber(p.quantity)}
                      </td>
                      <td className="py-3 px-2 text-right text-emerald-600 font-bold tabular-nums">
                        {formatCurrency(p.revenue)}
                      </td>
                      <td className="py-3 pl-2 text-right whitespace-nowrap">
                        {p.abandoned && p.abandoned > 0 ? (
                          <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-100 shadow-sm">
                            <Target className="w-3 h-3 mr-1" /> {p.abandoned}x (
                            {formatCurrency(p.abandoned_value || 0)})
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )}
      </div>
    </>
  );
}
