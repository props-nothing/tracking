"use client";

import { use, useState, Fragment } from "react";
import { TimeSeries } from "@/components/charts/time-series";
import {
  Globe,
  ChartLine,
  ChartPie,
  FileText,
  Link2,
  Layers,
  X,
  Calendar,
  DollarSign,
} from "lucide-react";

import { LeadRow } from "@/types/report";
import {
  GoogleIcon,
  FacebookIcon,
  sourceIcon,
} from "@/components/report/icons";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const DATE_RANGES = [
  { value: "today", label: "Vandaag" },
  { value: "last_7_days", label: "Laatste 7 dagen" },
  { value: "last_30_days", label: "Laatste 30 dagen" },
  { value: "last_90_days", label: "Laatste 90 dagen" },
  { value: "last_365_days", label: "Laatste 12 maanden" },
  { value: "this_month", label: "Deze maand" },
  { value: "last_month", label: "Vorige maand" },
] as const;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function formatNumber(val: number) {
  return new Intl.NumberFormat("nl-NL").format(val);
}

/** Convert ISO-2 country code to flag emoji */
function countryFlag(code: string) {
  if (!code || code.length !== 2) return "🌍";
  const upper = code.toUpperCase();
  const offset = 0x1f1e6 - 65;
  return String.fromCodePoint(
    upper.charCodeAt(0) + offset,
    upper.charCodeAt(1) + offset,
  );
}

/* ------------------------------------------------------------------ */
/*  Inline styles for glass effects & animations                       */
/* ------------------------------------------------------------------ */
const REPORT_STYLES = `
  .rpt .glass-card {
    background: rgba(255, 255, 255, 0.99);
    border: 1px solid rgba(226, 232, 240, 0.8);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
    transform: translateZ(0);
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
      box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1),
      border-color 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }
  @media (min-width: 768px) {
    .rpt .glass-card {
      -webkit-backdrop-filter: blur(10px);
      backdrop-filter: blur(10px);
      background: rgba(255, 255, 255, 0.95);
    }
  }
  @media (hover: hover) and (pointer: fine) {
    .rpt .glass-card:hover {
      transform: translate3d(0, -4px, 0);
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02);
      border-color: rgba(203, 213, 225, 1);
    }
  }
  @keyframes rptSlideUp {
    0% { opacity: 0; transform: translateY(30px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes rptScaleUp {
    0% { opacity: 0; transform: scale(0.95) translateY(10px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes rptSlideRight {
    0% { opacity: 0; transform: translateX(30px); }
    100% { opacity: 1; transform: translateX(0); }
  }
  @keyframes rptFillBar {
    from { width: 0; }
  }
  .rpt .anim-slide-up {
    animation: rptSlideUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  .rpt .anim-scale-up {
    animation: rptScaleUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }
  .rpt .anim-slide-right {
    animation: rptSlideRight 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  .rpt .bar-fill {
    animation: rptFillBar 1.2s cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  .rpt .d100 { animation-delay: 100ms; }
  .rpt .d150 { animation-delay: 150ms; }
  .rpt .d200 { animation-delay: 200ms; }
  .rpt .d250 { animation-delay: 250ms; }
  .rpt .d300 { animation-delay: 300ms; }
  .rpt .d400 { animation-delay: 400ms; }
  .rpt .d500 { animation-delay: 500ms; }
  .rpt .d600 { animation-delay: 600ms; }
  .rpt .scroll-hide { scrollbar-width: none; }
  .rpt .scroll-hide::-webkit-scrollbar { display: none; }
`;

import { GlassCard, SectionHeader, TabBar } from "@/components/report/ui";

import { useSharedReport } from "@/hooks/use-shared-report";

import { WebsiteKPIs } from "@/components/report/sections/website-kpis";
import { AdsKPIs } from "@/components/report/sections/ads-kpis";
import { EcommerceKPIs } from "@/components/report/sections/ecommerce-kpis";

import { DevicesSection } from "@/components/report/sections/devices-section";
import { UTMCampaigns } from "@/components/report/sections/utm-campaigns";
import { AdsCampaignDetail } from "@/components/report/sections/ads-campaign-detail";
import { EcommerceDetail } from "@/components/report/sections/ecommerce-detail";
import { LeadsSection } from "@/components/report/sections/leads-section";

import { AIInsightsSection } from "@/components/report/sections/ai-insights-section";

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export default function PublicReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const {
    data,
    loading,
    needsPassword,
    password,
    setPassword,
    setSavedPassword,
    error,
    range,
    setRange,
    filters,
    setFilters,
    addFilter,
    removeFilter,
  } = useSharedReport(token);

  const [activeTab, setActiveTab] = useState<"pages" | "entry" | "exit">(
    "pages",
  );
  const [mainTab, setMainTab] = useState<
    "all" | "website" | "meta" | "google" | "ecommerce"
  >("all");

  /* ---- Loading state ---- */
  if (loading && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="text-sm text-slate-500">Rapport laden...</p>
        </div>
      </div>
    );
  }

  /* ---- Password gate ---- */
  if (needsPassword) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200 p-8 shadow-xl">
          <h1 className="text-lg font-bold text-slate-900">
            Wachtwoord beveiligd
          </h1>
          <p className="text-sm text-slate-500">
            Dit rapport vereist een wachtwoord.
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Wachtwoord invoeren"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setSavedPassword(password);
              }
            }}
            className="w-full rounded-xl border bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
          <button
            onClick={() => {
              setSavedPassword(password);
            }}
            className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 shadow-md shadow-blue-500/30 transition-colors"
          >
            Rapport bekijken
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <p className="text-sm text-red-600">
          {error || "Rapport niet gevonden"}
        </p>
      </div>
    );
  }

  /* ---- Derived data ---- */
  const met = data.metrics;
  const pagesData =
    activeTab === "pages"
      ? data.top_pages
      : activeTab === "entry"
        ? data.entry_pages
        : data.exit_pages;

  const metaCampaigns = data.campaign_data.filter(
    (c) => c.provider === "meta_ads",
  );
  const googleCampaigns = data.campaign_data.filter(
    (c) => c.provider === "google_ads",
  );
  const hasMetaCampaigns = metaCampaigns.length > 0;
  const hasGoogleCampaigns = googleCampaigns.length > 0;
  const hasAnyCampaigns = hasMetaCampaigns || hasGoogleCampaigns;

  // Which campaigns to show in the current tab
  const tabCampaigns =
    mainTab === "meta"
      ? metaCampaigns
      : mainTab === "google"
        ? googleCampaigns
        : data.campaign_data;

  // Show website sections? (all or website tab)
  const showWebsite = mainTab === "all" || mainTab === "website";
  // Show ads sections?
  const showAds =
    mainTab === "all" || mainTab === "meta" || mainTab === "google";
  // Show ecommerce sections?
  const showEcommerce = mainTab === "all" || mainTab === "ecommerce";

  // Source matching helpers for filtering leads by tab
  const isMetaSource = (s: string) => /facebook|\bfb\b|meta|instagram/i.test(s);
  const isGoogleSource = (s: string) => /google/i.test(s);
  const isPaidMedium = (m: string) =>
    /cpc|paid|ppc|cpm|retargeting|social_paid/i.test(m);
  const matchesTab = (lead: LeadRow) => {
    const src = (lead.utm_source || lead.referrer_hostname || "").toLowerCase();
    const medium = (lead.utm_medium || "").toLowerCase();
    if (mainTab === "meta") return isMetaSource(src) && isPaidMedium(medium);
    if (mainTab === "google")
      return isGoogleSource(src) && isPaidMedium(medium);
    return true;
  };

  // Filtered leads & aggregations per tab
  const filteredLeads =
    mainTab === "all" || mainTab === "website"
      ? data.leads
      : data.leads.filter(matchesTab);
  const filteredLeadSources = (() => {
    if (mainTab === "all" || mainTab === "website") return data.lead_sources;
    // Re-aggregate from filteredLeads so the paid-medium filter is respected
    const srcCounts: Record<string, number> = {};
    filteredLeads.forEach((l) => {
      const s = l.utm_source || l.referrer_hostname || "direct";
      srcCounts[s] = (srcCounts[s] || 0) + 1;
    });
    return Object.entries(srcCounts)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);
  })();
  const filteredLeadMediums = (() => {
    if (mainTab === "all" || mainTab === "website") return data.lead_mediums;
    const mediumCounts: Record<string, number> = {};
    filteredLeads.forEach((l) => {
      const m = l.utm_medium || "direct";
      mediumCounts[m] = (mediumCounts[m] || 0) + 1;
    });
    return Object.entries(mediumCounts)
      .map(([medium, count]) => ({ medium, count }))
      .sort((a, b) => b.count - a.count);
  })();
  const filteredLeadCampaigns = (() => {
    if (mainTab === "all" || mainTab === "website") return data.lead_campaigns;
    const campCounts: Record<string, number> = {};
    filteredLeads.forEach((l) => {
      const c = l.utm_campaign;
      if (c) campCounts[c] = (campCounts[c] || 0) + 1;
    });
    return Object.entries(campCounts)
      .map(([campaign, count]) => ({ campaign, count }))
      .sort((a, b) => b.count - a.count);
  })();

  // Available main tabs
  const mainTabs: {
    key: typeof mainTab;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      key: "all",
      label: "Overzicht",
      icon: <Layers className="w-3.5 h-3.5" />,
    },
    {
      key: "website",
      label: "Website",
      icon: <Globe className="w-3.5 h-3.5" />,
    },
    ...(hasMetaCampaigns
      ? [
          {
            key: "meta" as const,
            label: "Meta Ads",
            icon: <FacebookIcon className="w-3.5 h-3.5" />,
          },
        ]
      : []),
    ...(hasGoogleCampaigns
      ? [
          {
            key: "google" as const,
            label: "Google Ads",
            icon: <GoogleIcon className="w-3.5 h-3.5" />,
          },
        ]
      : []),
    ...((data.metrics.total_revenue || 0) > 0
      ? [
          {
            key: "ecommerce" as const,
            label: "E-commerce",
            icon: <DollarSign className="w-3.5 h-3.5" />,
          },
        ]
      : []),
  ];

  /* ---- Dashboard ---- */
  return (
    <div className="rpt text-slate-800 antialiased min-h-screen relative overflow-hidden bg-[#f8fafc]">
      <style dangerouslySetInnerHTML={{ __html: REPORT_STYLES }} />

      {/* Background blobs */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-50/50 to-transparent -z-10 pointer-events-none" />
      <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-400/10 rounded-full blur-[100px] -z-10 pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-emerald-400/10 rounded-full blur-[100px] -z-10 pointer-events-none" />

      <div className="max-w-[1440px] mx-auto p-4 sm:p-6 lg:p-8">
        {/* ═══════════════════ Header ═══════════════════ */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 anim-slide-up">
          <div className="flex items-center gap-4">
            {data.logo_url && (
              <img
                src={data.logo_url}
                alt=""
                className="h-10 w-10 rounded-xl object-contain border border-slate-200 shadow-sm"
              />
            )}
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-1">
                {data.report_name}
              </h1>
              <p className="text-slate-500 text-xs font-medium flex items-center">
                <span className="relative flex h-2.5 w-2.5 mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                {data.site_name}
                {data.site_domain ? ` · ${data.site_domain}` : ""}
              </p>
            </div>
          </div>

          <div
            className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-1 overflow-x-auto w-full md:w-auto scroll-hide"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <Calendar className="w-4 h-4 text-slate-400 ml-1.5 mr-0.5 shrink-0" />
            {DATE_RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs font-semibold transition-all duration-300 whitespace-nowrap shrink-0 ${
                  range === r.value
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {r.label}
              </button>
            ))}
            {loading && (
              <div className="ml-1.5 h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            )}
          </div>
        </header>

        {/* ═══════════════════ Active Filters ═══════════════════ */}
        {filters.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6 anim-slide-up">
            {filters.map((f) => (
              <span
                key={f.key}
                className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-700"
              >
                {f.label}: {f.value}
                <button
                  onClick={() => removeFilter(f.key)}
                  className="hover:text-blue-500 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <button
              onClick={() => setFilters([])}
              className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors"
            >
              Alles wissen
            </button>
          </div>
        )}

        {/* ═══════════════════ Main Tabs ═══════════════════ */}
        {(hasAnyCampaigns || (data.metrics.total_revenue || 0) > 0) && (
          <div
            className="flex border-b border-slate-200 mb-8 overflow-x-auto anim-slide-up d100 gap-1 sm:gap-2 scroll-hide"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {mainTabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setMainTab(t.key)}
                className={`pb-3 px-3 sm:px-4 text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 shrink-0 ${
                  mainTab === t.key
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-slate-500 hover:text-slate-800 border-b-2 border-transparent"
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        )}

        {/* ═══════════════════ KPI Cards ═══════════════════ */}
        {showWebsite && <WebsiteKPIs data={data} />}

        {/* ═══════════════════ Ads KPIs (Meta/Google tab or Overzicht) ═══════════════════ */}
        {showAds && hasAnyCampaigns && (
          <AdsKPIs data={data} mainTab={mainTab} />
        )}

        {/* ═══════════════════ E-commerce KPIs ═══════════════════ */}
        {showEcommerce && (data.metrics.total_revenue || 0) > 0 && (
          <EcommerceKPIs data={data} />
        )}

        {/* ═══════════════════ Chart + Sources ═══════════════════ */}
        {showWebsite && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {data.timeseries.length > 0 && (
                <GlassCard
                  className="lg:col-span-2 flex flex-col"
                  anim="anim-slide-up d300"
                >
                  <SectionHeader
                    icon={<ChartLine className="w-4 h-4" />}
                    title="Bezoekers & Paginaweergaven"
                    iconBg="bg-blue-50"
                    iconColor="text-blue-600"
                  />
                  <div
                    className="flex-grow relative"
                    style={{ minHeight: 280 }}
                  >
                    <TimeSeries data={data.timeseries} period={range} />
                  </div>
                </GlassCard>
              )}

              {data.top_referrers.length > 0 && (
                <GlassCard
                  className="flex flex-col"
                  anim="anim-slide-right d400"
                >
                  <SectionHeader
                    icon={<ChartPie className="w-4 h-4" />}
                    title="Verkeersbronnen"
                    iconBg="bg-violet-50"
                    iconColor="text-violet-600"
                  />
                  <div className="flex-grow flex flex-col gap-2.5">
                    {data.top_referrers.slice(0, 8).map((ref) => {
                      const pct =
                        met.visitors > 0
                          ? Math.round((ref.visitors / met.visitors) * 100)
                          : 0;
                      const si = sourceIcon(ref.source);
                      return (
                        <button
                          key={ref.source}
                          onClick={() =>
                            addFilter("referrer", "Referrer", ref.source)
                          }
                          className="relative overflow-hidden rounded-lg p-2.5 border border-transparent hover:border-slate-200 group transition-colors text-left w-full"
                        >
                          <div
                            className="absolute top-0 bottom-0 left-0 bg-violet-100 opacity-50 -z-10 bar-fill"
                            style={{ width: `${pct}%` }}
                          />
                          <div className="flex justify-between items-center text-[13px]">
                            <div className="flex items-center truncate pr-2 w-3/4">
                              <div
                                className={`w-6 h-6 rounded-md flex items-center justify-center mr-2.5 ${si.bg} ${si.color} shadow-sm shrink-0`}
                              >
                                {si.icon}
                              </div>
                              <span className="font-semibold text-slate-700 truncate group-hover:text-slate-900 transition-colors">
                                {ref.source}
                              </span>
                            </div>
                            <span className="font-bold text-slate-900 shrink-0">
                              {formatNumber(ref.visitors)}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </GlassCard>
              )}
            </div>

            {/* ═══════════════════ Pages + Countries ═══════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <GlassCard anim="anim-slide-up d400">
                <SectionHeader
                  icon={<FileText className="w-4 h-4" />}
                  title={
                    activeTab === "pages"
                      ? "Meest Bekeken Pagina's"
                      : activeTab === "entry"
                        ? "Instappagina's"
                        : "Uitstappagina's"
                  }
                  iconBg="bg-teal-50"
                  iconColor="text-teal-600"
                  action={
                    <TabBar
                      tabs={[
                        { key: "pages", label: "Top" },
                        { key: "entry", label: "Instap" },
                        { key: "exit", label: "Uitstap" },
                      ]}
                      active={activeTab}
                      onChange={(k) => setActiveTab(k as typeof activeTab)}
                    />
                  }
                />
                <div className="flex-grow flex flex-col gap-2.5">
                  {pagesData.slice(0, 10).map((p) => {
                    const pct =
                      met.pageviews > 0
                        ? Math.round((p.views / met.pageviews) * 100)
                        : 0;
                    return (
                      <button
                        key={p.path}
                        onClick={() => addFilter("page", "Pagina", p.path)}
                        className="relative overflow-hidden rounded-lg p-2.5 border border-transparent hover:border-slate-200 group transition-colors text-left w-full"
                      >
                        <div
                          className="absolute top-0 bottom-0 left-0 bg-teal-100 opacity-50 -z-10 bar-fill"
                          style={{ width: `${pct}%` }}
                        />
                        <div className="flex justify-between items-center text-[13px]">
                          <div className="flex items-center truncate pr-2 w-3/4">
                            <Link2 className="inline w-4 h-4 text-teal-500 mr-2.5 shrink-0" />
                            <span className="font-semibold text-slate-700 truncate group-hover:text-slate-900 transition-colors">
                              {p.path}
                            </span>
                          </div>
                          <span className="font-bold text-slate-900 shrink-0">
                            {formatNumber(p.views)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                  {pagesData.length === 0 && (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      Geen data
                    </div>
                  )}
                </div>
              </GlassCard>

              {data.countries.length > 0 && (
                <GlassCard anim="anim-slide-up d500">
                  <SectionHeader
                    icon={<Globe className="w-4 h-4" />}
                    title="Landen"
                    iconBg="bg-indigo-50"
                    iconColor="text-indigo-600"
                  />
                  <div className="flex-grow flex flex-col gap-2.5">
                    {data.countries.slice(0, 10).map((c) => {
                      const pct =
                        met.visitors > 0
                          ? Math.round((c.visitors / met.visitors) * 100)
                          : 0;
                      return (
                        <button
                          key={c.code}
                          onClick={() => addFilter("country", "Land", c.code)}
                          className="relative overflow-hidden rounded-lg p-2.5 border border-transparent hover:border-slate-200 group transition-colors text-left w-full"
                        >
                          <div
                            className="absolute top-0 bottom-0 left-0 bg-indigo-100 opacity-50 -z-10 bar-fill"
                            style={{ width: `${pct}%` }}
                          />
                          <div className="flex justify-between items-center text-[13px]">
                            <div className="flex items-center truncate pr-2 w-3/4">
                              <span className="mr-2.5 text-base shrink-0">
                                {countryFlag(c.code)}
                              </span>
                              <span className="font-semibold text-slate-700 truncate group-hover:text-slate-900 transition-colors">
                                {c.name}
                              </span>
                            </div>
                            <span className="font-bold text-slate-900 shrink-0">
                              {formatNumber(c.visitors)}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </GlassCard>
              )}
            </div>

            {/* ═══════════════════ Devices + Browsers/OS ═══════════════════ */}
            <DevicesSection data={data} />

            {/* ═══════════════════ UTM Campaigns ═══════════════════ */}
            <UTMCampaigns data={data} addFilter={addFilter} />
          </>
        )}

        {/* ═══════════════════ Ads Campaign Detail ═══════════════════ */}
        <AdsCampaignDetail
          showAds={showAds}
          tabCampaigns={tabCampaigns}
          mainTab={mainTab}
        />

        {/* ═══════════════════ E-commerce Detail ═══════════════════ */}
        <EcommerceDetail
          showEcommerce={showEcommerce}
          data={data}
          range={range}
        />

        {/* ═══════════════════ Leads (only on Overzicht & Website tabs) ═══════════════════ */}
        <LeadsSection
          showWebsite={showWebsite}
          filteredLeads={filteredLeads}
          filteredLeadSources={filteredLeadSources}
          filteredLeadMediums={filteredLeadMediums}
          filteredLeadCampaigns={filteredLeadCampaigns}
        />

        {/* ═══════════════════ AI Insights ═══════════════════ */}
        <AIInsightsSection
          aiAnalysis={data.ai_analysis}
          dateFrom={data.date_from}
          dateTo={data.date_to}
        />

        {/* Footer */}
        <div className="text-center pb-8 anim-slide-up d600">
          <p className="text-[11px] text-slate-400 font-medium">
            Rapport gegenereerd voor periode {data.date_from} – {data.date_to}
          </p>
        </div>
      </div>
    </div>
  );
}
