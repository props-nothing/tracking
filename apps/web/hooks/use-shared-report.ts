import { useState, useCallback, useEffect } from "react";
import { ReportData, ReportFilter } from "@/types/report";

export function useSharedReport(token: string) {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [savedPassword, setSavedPassword] = useState("");
  const [error, setError] = useState("");
  const [range, setRange] = useState("last_30_days");
  const [filters, setFilters] = useState<ReportFilter[]>([]);

  const fetchReport = useCallback(
    (pw?: string) => {
      setLoading(true);
      setError("");
      const qs = new URLSearchParams();
      if (pw) qs.set("password", pw);
      qs.set("range", range);
      filters.forEach((f) => qs.set(f.key, f.value));

      fetch(`/api/reports/shared/${token}/data?${qs.toString()}`)
        .then(async (res) => {
          if (res.status === 401) {
            setNeedsPassword(true);
            setLoading(false);
            return;
          }
          if (res.status === 403) {
            setNeedsPassword(true);
            setError("Onjuist wachtwoord");
            setLoading(false);
            return;
          }
          if (!res.ok) {
            setError("Rapport laden mislukt");
            setLoading(false);
            return;
          }
          const d = await res.json();
          setData({
            site_name: d.site_name ?? "",
            site_domain: d.site_domain ?? "",
            report_name: d.report_name ?? "",
            description: d.description ?? "",
            logo_url: d.logo_url,
            brand_color: d.brand_color,
            date_from: d.date_from ?? "",
            date_to: d.date_to ?? "",
            metrics: {
              visitors: d.metrics?.visitors ?? 0,
              pageviews: d.metrics?.pageviews ?? 0,
              sessions: d.metrics?.sessions ?? 0,
              bounce_rate: d.metrics?.bounce_rate ?? 0,
              views_per_session: d.metrics?.views_per_session ?? 0,
              avg_duration: d.metrics?.avg_duration ?? 0,
              total_revenue: d.metrics?.total_revenue ?? 0,
              purchases: d.metrics?.purchases ?? 0,
              ecommerce_conversion_rate:
                d.metrics?.ecommerce_conversion_rate ?? 0,
              avg_scroll_depth: d.metrics?.avg_scroll_depth ?? 0,
              avg_active_time: d.metrics?.avg_active_time ?? 0,
              returning_visitors: d.metrics?.returning_visitors ?? 0,
              returning_percentage: d.metrics?.returning_percentage ?? 0,
            },
            timeseries: d.timeseries ?? [],
            top_pages: d.top_pages ?? [],
            top_referrers: d.top_referrers ?? [],
            browsers: d.browsers ?? [],
            operating_systems: d.operating_systems ?? [],
            device_types: d.device_types ?? [],
            countries: d.countries ?? [],
            entry_pages: d.entry_pages ?? [],
            exit_pages: d.exit_pages ?? [],
            utm_sources: d.utm_sources ?? [],
            utm_mediums: d.utm_mediums ?? [],
            utm_campaigns: d.utm_campaigns ?? [],
            ecommerce_sources: d.ecommerce_sources ?? [],
            ecommerce_campaigns: d.ecommerce_campaigns ?? [],
            top_products: d.top_products ?? [],
            revenue_timeseries: d.revenue_timeseries ?? [],
            leads: d.leads ?? [],
            lead_sources: d.lead_sources ?? [],
            lead_mediums: d.lead_mediums ?? [],
            lead_campaigns: d.lead_campaigns ?? [],
            campaign_data: d.campaign_data ?? [],
            campaign_summary: d.campaign_summary ?? {},
            ai_analysis: d.ai_analysis ?? undefined,
          });
          setNeedsPassword(false);
          setLoading(false);
        })
        .catch(() => {
          setError("Rapport laden mislukt");
          setLoading(false);
        });
    },
    [token, range, filters],
  );

  useEffect(() => {
    fetchReport(savedPassword || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchReport, savedPassword]);

  const addFilter = (key: string, label: string, value: string) => {
    if (filters.some((f) => f.key === key && f.value === value)) return;
    setFilters((prev) => [
      ...prev.filter((f) => f.key !== key),
      { key, label, value },
    ]);
  };

  const removeFilter = (key: string) =>
    setFilters((prev) => prev.filter((f) => f.key !== key));

  return {
    data,
    loading,
    needsPassword,
    password,
    setPassword,
    savedPassword,
    setSavedPassword,
    error,
    range,
    setRange,
    filters,
    setFilters,
    addFilter,
    removeFilter,
  };
}
