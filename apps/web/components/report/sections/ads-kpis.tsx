import React from "react";
import { ReportData } from "@/types/report";
import { KPICard } from "@/components/report/ui";
import { FacebookIcon, GoogleIcon } from "@/components/report/icons";
import { MousePointerClick, BadgeEuro, UserPlus, Target } from "lucide-react";

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

export function AdsKPIs({
  data,
  mainTab,
}: {
  data: ReportData;
  mainTab: "all" | "website" | "meta" | "google" | "ecommerce";
}) {
  const metaSummary = data.campaign_summary?.meta_ads;
  const googleSummary = data.campaign_summary?.google_ads;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 mb-8">
      {(mainTab === "all" || mainTab === "meta") && metaSummary && (
        <>
          <KPICard
            label="Meta Impressies"
            value={formatNumber(metaSummary.impressions)}
            icon={<FacebookIcon className="w-5 h-5" />}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            gradientFrom="from-blue-100"
            delay="d100"
          />
          <KPICard
            label="Meta Kliks"
            value={formatNumber(metaSummary.clicks)}
            icon={<MousePointerClick className="w-5 h-5" />}
            iconBg="bg-indigo-50"
            iconColor="text-indigo-600"
            gradientFrom="from-indigo-100"
            delay="d150"
          />
          <KPICard
            label="Meta Uitgaven"
            value={formatCurrency(metaSummary.cost)}
            icon={<BadgeEuro className="w-5 h-5" />}
            iconBg="bg-rose-50"
            iconColor="text-rose-600"
            gradientFrom="from-rose-100"
            delay="d200"
          />
          <KPICard
            label="Meta Resultaten"
            value={formatNumber(metaSummary.results)}
            icon={<UserPlus className="w-5 h-5" />}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            gradientFrom="from-emerald-100"
            delay="d250"
          />
          {metaSummary.results > 0 && metaSummary.cost > 0 && (
            <KPICard
              label="Meta CPR"
              value={formatCurrency(metaSummary.cost / metaSummary.results)}
              icon={<Target className="w-5 h-5" />}
              iconBg="bg-teal-50"
              iconColor="text-teal-600"
              gradientFrom="from-teal-100"
              delay="d300"
            />
          )}
        </>
      )}
      {(mainTab === "all" || mainTab === "google") && googleSummary && (
        <>
          <KPICard
            label="Google Impressies"
            value={formatNumber(googleSummary.impressions)}
            icon={<GoogleIcon className="w-5 h-5" />}
            iconBg="bg-white"
            iconColor="text-blue-600"
            gradientFrom="from-blue-100"
            delay="d100"
          />
          <KPICard
            label="Google Kliks"
            value={formatNumber(googleSummary.clicks)}
            icon={<MousePointerClick className="w-5 h-5" />}
            iconBg="bg-sky-50"
            iconColor="text-sky-600"
            gradientFrom="from-sky-100"
            delay="d150"
          />
          <KPICard
            label="Google Uitgaven"
            value={formatCurrency(googleSummary.cost)}
            icon={<BadgeEuro className="w-5 h-5" />}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
            gradientFrom="from-amber-100"
            delay="d200"
          />
          <KPICard
            label="Google Resultaten"
            value={formatNumber(googleSummary.results)}
            icon={<UserPlus className="w-5 h-5" />}
            iconBg="bg-teal-50"
            iconColor="text-teal-600"
            gradientFrom="from-teal-100"
            delay="d250"
          />
          {googleSummary.results > 0 && googleSummary.cost > 0 && (
            <KPICard
              label="Google CPR"
              value={formatCurrency(googleSummary.cost / googleSummary.results)}
              icon={<Target className="w-5 h-5" />}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
              gradientFrom="from-emerald-100"
              delay="d300"
            />
          )}
        </>
      )}
    </div>
  );
}
