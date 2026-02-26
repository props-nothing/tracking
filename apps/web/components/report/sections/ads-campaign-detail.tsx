import React from "react";
import { GlassCard, SectionHeader } from "@/components/report/ui";
import { FacebookIcon, GoogleIcon } from "@/components/report/icons";
import { Crosshair } from "lucide-react";

function formatNumber(val: number) {
  return new Intl.NumberFormat("nl-NL").format(val);
}

function formatCurrency(val: number, currency: string = "EUR") {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: currency,
  }).format(val);
}

interface AdsCampaignDetailProps {
  showAds: boolean;
  tabCampaigns: any[];
  mainTab: string;
}

export function AdsCampaignDetail({
  showAds,
  tabCampaigns,
  mainTab,
}: AdsCampaignDetailProps) {
  if (!showAds || tabCampaigns.length === 0) {
    return null;
  }

  return (
    <GlassCard className="mb-6" anim="anim-slide-up d300">
      <SectionHeader
        icon={
          mainTab === "meta" ? (
            <span className="w-4 h-4">
              <FacebookIcon />
            </span>
          ) : mainTab === "google" ? (
            <span className="w-4 h-4">
              <GoogleIcon />
            </span>
          ) : (
            <Crosshair className="w-4 h-4" />
          )
        }
        title={
          mainTab === "meta"
            ? "Meta Ads Campagnes"
            : mainTab === "google"
              ? "Google Ads Campagnes"
              : "Alle Campagnes"
        }
        iconBg={
          mainTab === "meta"
            ? "bg-blue-50"
            : mainTab === "google"
              ? "bg-amber-50"
              : "bg-slate-50"
        }
        iconColor={
          mainTab === "meta"
            ? "text-blue-600"
            : mainTab === "google"
              ? "text-amber-600"
              : "text-slate-600"
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="pb-2">Campagne</th>
              <th className="pb-2">Status</th>
              <th className="pb-2 text-right">Impressies</th>
              <th className="pb-2 text-right">Kliks</th>
              <th className="pb-2 text-right">CTR</th>
              <th className="pb-2 text-right">Kosten</th>
              <th className="pb-2 text-right">CPC</th>
              <th className="pb-2 text-right">Resultaten</th>
              <th className="pb-2 text-right">CPR</th>
            </tr>
          </thead>
          <tbody>
            {tabCampaigns.map((c, i) => {
              const ctr =
                c.impressions > 0
                  ? ((c.clicks / c.impressions) * 100).toFixed(1)
                  : "0.0";
              const cpc = c.clicks > 0 ? c.cost / c.clicks : 0;
              const campResults = c.results || 0;
              const cpr = campResults > 0 ? c.cost / campResults : 0;
              const statusColor =
                c.campaign_status === "ENABLED" ||
                c.campaign_status === "ACTIVE"
                  ? "bg-emerald-100 text-emerald-700"
                  : c.campaign_status === "PAUSED"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-slate-100 text-slate-500";
              return (
                <tr
                  key={`${c.provider}-${c.campaign_id}-${i}`}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 flex-shrink-0">
                        {c.provider === "meta_ads" ? (
                          <FacebookIcon />
                        ) : (
                          <GoogleIcon />
                        )}
                      </span>
                      <span className="text-[13px] font-medium text-slate-700 truncate max-w-[200px]">
                        {c.campaign_name}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-4">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor}`}
                    >
                      {c.campaign_status}
                    </span>
                  </td>
                  <td className="py-2.5 text-right text-[13px] text-slate-600">
                    {formatNumber(c.impressions)}
                  </td>
                  <td className="py-2.5 text-right text-[13px] text-slate-600">
                    {formatNumber(c.clicks)}
                  </td>
                  <td className="py-2.5 text-right text-[13px] text-slate-600">
                    {ctr}%
                  </td>
                  <td className="py-2.5 text-right text-[13px] font-medium text-slate-700">
                    {formatCurrency(c.cost, c.currency)}
                  </td>
                  <td className="py-2.5 text-right text-[13px] text-slate-600">
                    {formatCurrency(cpc, c.currency)}
                  </td>
                  <td className="py-2.5 text-right text-[13px] font-bold text-emerald-600">
                    {formatNumber(campResults)}
                  </td>
                  <td className="py-2.5 text-right text-[13px] font-bold text-slate-800">
                    {campResults > 0 ? formatCurrency(cpr, c.currency) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}
