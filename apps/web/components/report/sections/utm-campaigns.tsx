import React, { useState } from "react";
import { ReportData } from "@/types/report";
import { GlassCard, SectionHeader, TabBar } from "@/components/report/ui";
import { utmIcon } from "@/components/report/icons";
import { Megaphone } from "lucide-react";

function formatNumber(val: number) {
  return new Intl.NumberFormat("nl-NL").format(val);
}

interface UTMCampaignsProps {
  data: ReportData;
  addFilter: (key: string, label: string, value: string) => void;
}

export function UTMCampaigns({ data, addFilter }: UTMCampaignsProps) {
  const [utmTab, setUtmTab] = useState<"sources" | "mediums" | "campaigns">(
    "sources",
  );
  const met = data.metrics;

  const utmData =
    utmTab === "sources"
      ? data.utm_sources
      : utmTab === "mediums"
        ? data.utm_mediums
        : data.utm_campaigns;

  if (
    data.utm_sources.length === 0 &&
    data.utm_mediums.length === 0 &&
    data.utm_campaigns.length === 0
  ) {
    return null;
  }

  return (
    <GlassCard className="mb-6" anim="anim-slide-up d400">
      <SectionHeader
        icon={<Megaphone className="w-4 h-4" />}
        title="Campagnetracking (UTM)"
        iconBg="bg-emerald-50"
        iconColor="text-emerald-600"
        action={
          <TabBar
            tabs={[
              { key: "sources", label: "Bronnen" },
              { key: "mediums", label: "Media" },
              { key: "campaigns", label: "Campagnes" },
            ]}
            active={utmTab}
            onChange={(k) => setUtmTab(k as typeof utmTab)}
          />
        }
      />
      <div className="flex-grow flex flex-col gap-2.5">
        {utmData.slice(0, 10).map((item) => {
          const pct =
            met.visitors > 0
              ? Math.round((item.visitors / met.visitors) * 100)
              : 0;
          return (
            <button
              key={item.name}
              onClick={() => {
                const k =
                  utmTab === "sources"
                    ? "utm_source"
                    : utmTab === "mediums"
                      ? "utm_medium"
                      : "utm_campaign";
                const l =
                  utmTab === "sources"
                    ? "UTM Source"
                    : utmTab === "mediums"
                      ? "UTM Medium"
                      : "UTM Campaign";
                addFilter(k, l, item.name);
              }}
              className="relative overflow-hidden rounded-lg p-2.5 border border-transparent hover:border-slate-200 group transition-colors text-left w-full"
            >
              <div
                className="absolute top-0 bottom-0 left-0 bg-emerald-100 opacity-50 -z-10 bar-fill"
                style={{ width: `${pct}%` }}
              />
              <div className="flex justify-between items-center text-[13px]">
                <div className="flex items-center truncate pr-2 w-3/4">
                  {(() => {
                    const ui = utmIcon(item.name);
                    return (
                      <span
                        className={`w-6 h-6 rounded-md flex items-center justify-center mr-2.5 ${ui.bg} ${ui.color} shadow-sm shrink-0`}
                      >
                        {ui.icon}
                      </span>
                    );
                  })()}
                  <span className="font-semibold text-slate-700 truncate group-hover:text-slate-900 transition-colors">
                    {item.name}
                  </span>
                </div>
                <span className="font-bold text-slate-900 shrink-0">
                  {formatNumber(item.visitors)}
                </span>
              </div>
            </button>
          );
        })}
        {utmData.length === 0 && (
          <div className="py-8 text-center text-slate-400 text-xs">
            Geen data
          </div>
        )}
      </div>
    </GlassCard>
  );
}
