import React, { Fragment, useState } from "react";
import { LeadRow } from "@/types/report";
import { GlassCard, SectionHeader } from "@/components/report/ui";
import { sourceIcon, utmIcon } from "@/components/report/icons";
import {
  Users,
  UserPlus,
  Send,
  Megaphone,
  Mail,
  Tag,
  Calendar,
  Phone,
  Building2,
  Target,
  Search,
  FileText,
  Globe,
  MapPin,
  Smartphone,
} from "lucide-react";

function countryFlag(code: string) {
  if (!code || code === "Unknown") return "🌍";
  const codePoints = code
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

interface LeadsSectionProps {
  showWebsite: boolean;
  filteredLeads: LeadRow[];
  filteredLeadSources: any[];
  filteredLeadMediums: any[];
  filteredLeadCampaigns: any[];
}

export function LeadsSection({
  showWebsite,
  filteredLeads,
  filteredLeadSources,
  filteredLeadMediums,
  filteredLeadCampaigns,
}: LeadsSectionProps) {
  const [expandedLead, setExpandedLead] = useState<number | null>(null);

  if (!showWebsite || filteredLeads.length === 0) {
    return null;
  }

  return (
    <>
      {(filteredLeadSources.length > 0 ||
        filteredLeadMediums.length > 0 ||
        filteredLeadCampaigns.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {filteredLeadSources.length > 0 && (
            <GlassCard anim="anim-slide-up d400">
              <SectionHeader
                icon={<UserPlus className="w-4 h-4" />}
                title="Leadbronnen"
                iconBg="bg-orange-50"
                iconColor="text-orange-600"
              />
              <div className="space-y-1.5">
                {filteredLeadSources.slice(0, 8).map((s) => {
                  const si = sourceIcon(s.source);
                  const maxCount = Math.max(
                    ...filteredLeadSources.map((x) => x.count),
                  );
                  const pct =
                    maxCount > 0 ? Math.round((s.count / maxCount) * 100) : 0;
                  return (
                    <div
                      key={s.source}
                      className="relative overflow-hidden rounded-lg p-2.5 border border-transparent hover:border-slate-200 group transition-colors"
                    >
                      <div
                        className="absolute top-0 bottom-0 left-0 bg-orange-100 opacity-50 -z-10 bar-fill"
                        style={{ width: `${pct}%` }}
                      />
                      <div className="flex justify-between items-center text-[13px]">
                        <div className="flex items-center truncate pr-2 w-3/4">
                          <div
                            className={`w-6 h-6 rounded-md flex items-center justify-center mr-2.5 ${si.bg} ${si.color} shrink-0`}
                          >
                            {si.icon}
                          </div>
                          <span className="font-semibold text-slate-700 truncate group-hover:text-slate-900 transition-colors">
                            {s.source}
                          </span>
                        </div>
                        <span className="font-bold text-slate-900 shrink-0">
                          {s.count}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          )}
          {filteredLeadMediums.length > 0 && (
            <GlassCard anim="anim-slide-up d500">
              <SectionHeader
                icon={<Send className="w-4 h-4" />}
                title="Lead-media"
                iconBg="bg-pink-50"
                iconColor="text-pink-600"
              />
              <div className="space-y-1.5">
                {filteredLeadMediums.slice(0, 8).map((md) => {
                  const mi = utmIcon(md.medium);
                  const maxCount = Math.max(
                    ...filteredLeadMediums.map((x) => x.count),
                  );
                  const pct =
                    maxCount > 0 ? Math.round((md.count / maxCount) * 100) : 0;
                  return (
                    <div
                      key={md.medium}
                      className="relative overflow-hidden rounded-lg p-2.5 border border-transparent hover:border-slate-200 group transition-colors"
                    >
                      <div
                        className="absolute top-0 bottom-0 left-0 bg-pink-100 opacity-50 -z-10 bar-fill"
                        style={{ width: `${pct}%` }}
                      />
                      <div className="flex justify-between items-center text-[13px]">
                        <div className="flex items-center truncate pr-2 w-3/4">
                          <div
                            className={`w-6 h-6 rounded-md flex items-center justify-center mr-2.5 ${mi.bg} ${mi.color} shrink-0`}
                          >
                            {mi.icon}
                          </div>
                          <span className="font-semibold text-slate-700 truncate group-hover:text-slate-900 transition-colors">
                            {md.medium}
                          </span>
                        </div>
                        <span className="font-bold text-slate-900 shrink-0">
                          {md.count}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          )}
          {filteredLeadCampaigns.length > 0 && (
            <GlassCard anim="anim-slide-up d600">
              <SectionHeader
                icon={<Megaphone className="w-4 h-4" />}
                title="Leadcampagnes"
                iconBg="bg-sky-50"
                iconColor="text-sky-600"
              />
              <div className="space-y-1.5">
                {filteredLeadCampaigns.slice(0, 8).map((c) => {
                  const ci = utmIcon(c.campaign);
                  const maxCount = Math.max(
                    ...filteredLeadCampaigns.map((x) => x.count),
                  );
                  const pct =
                    maxCount > 0 ? Math.round((c.count / maxCount) * 100) : 0;
                  return (
                    <div
                      key={c.campaign}
                      className="relative overflow-hidden rounded-lg p-2.5 border border-transparent hover:border-slate-200 group transition-colors"
                    >
                      <div
                        className="absolute top-0 bottom-0 left-0 bg-sky-100 opacity-50 -z-10 bar-fill"
                        style={{ width: `${pct}%` }}
                      />
                      <div className="flex justify-between items-center text-[13px]">
                        <div className="flex items-center truncate pr-2 w-3/4">
                          <div
                            className={`w-6 h-6 rounded-md flex items-center justify-center mr-2.5 ${ci.bg} ${ci.color} shrink-0`}
                          >
                            {ci.icon}
                          </div>
                          <span className="font-semibold text-slate-700 truncate group-hover:text-slate-900 transition-colors">
                            {c.campaign}
                          </span>
                        </div>
                        <span className="font-bold text-slate-900 shrink-0">
                          {c.count}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          )}
        </div>
      )}

      {/* Leads table */}
      <GlassCard className="mb-6" anim="anim-slide-up d500">
        <SectionHeader
          icon={<Users className="w-4 h-4" />}
          title={`Leads (${filteredLeads.length})`}
          iconBg="bg-orange-50"
          iconColor="text-orange-600"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="pb-2 pl-2">Naam</th>
                <th className="pb-2">E-mail</th>
                <th className="pb-2">Bron</th>
                <th className="pb-2">Campagne</th>
                <th className="pb-2">Status</th>
                <th className="pb-2 text-right">Datum</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {filteredLeads.map((lead) => {
                const srcLbl = lead.utm_source
                  ? [lead.utm_source, lead.utm_medium]
                      .filter(Boolean)
                      .join(" / ")
                  : lead.referrer_hostname || "Direct";
                const sk = (
                  lead.utm_source ||
                  lead.referrer_hostname ||
                  ""
                ).toLowerCase();
                const srcBdg = sk.includes("google")
                  ? "bg-blue-50 text-blue-700 border-blue-100"
                  : sk.includes("facebook") ||
                      sk.includes("meta") ||
                      sk.includes("instagram")
                    ? "bg-violet-50 text-violet-700 border-violet-100"
                    : sk.includes("linkedin")
                      ? "bg-sky-50 text-sky-700 border-sky-100"
                      : "bg-slate-50 text-slate-700 border-slate-100";
                const stS: Record<string, string> = {
                  new: "bg-blue-50 text-blue-600 border-blue-100",
                  contacted: "bg-amber-50 text-amber-600 border-amber-100",
                  qualified: "bg-purple-50 text-purple-600 border-purple-100",
                  converted:
                    "bg-emerald-50 text-emerald-600 border-emerald-100",
                  archived: "bg-slate-100 text-slate-500 border-slate-200",
                };
                const ds = new Date(lead.created_at).toLocaleDateString(
                  "nl-NL",
                  { day: "numeric", month: "short", year: "numeric" },
                );
                const isExpanded = expandedLead === lead.id;

                return (
                  <Fragment key={lead.id}>
                    <tr
                      className="border-b border-slate-50 last:border-0 hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      onClick={() =>
                        setExpandedLead(isExpanded ? null : lead.id)
                      }
                    >
                      <td className="py-3 pl-2 font-semibold text-slate-700 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="w-3 h-3 text-slate-400" />
                          {lead.lead_name || (
                            <span className="text-slate-400 italic">—</span>
                          )}
                        </span>
                      </td>
                      <td className="py-3 text-slate-500 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-slate-300" />
                          {lead.lead_email || "—"}
                        </span>
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold border shadow-sm ${srcBdg}`}
                        >
                          {(() => {
                            const si = sourceIcon(sk || srcLbl);
                            return <span className={si.color}>{si.icon}</span>;
                          })()}
                          {srcLbl}
                        </span>
                      </td>
                      <td className="py-3 text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Tag className="w-3 h-3 text-slate-300" />
                          {lead.utm_campaign || "—"}
                        </span>
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold border shadow-sm ${stS[lead.status] || ""}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              lead.status === "new"
                                ? "bg-blue-500 animate-pulse"
                                : lead.status === "contacted"
                                  ? "bg-amber-500"
                                  : lead.status === "qualified"
                                    ? "bg-purple-500"
                                    : lead.status === "converted"
                                      ? "bg-emerald-500"
                                      : "bg-slate-400"
                            }`}
                          />
                          {lead.status.charAt(0).toUpperCase() +
                            lead.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-3 text-right text-slate-500 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-slate-300" />
                          {ds}
                        </span>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-b border-slate-100 bg-slate-50/50">
                        <td colSpan={6} className="px-4 py-4">
                          <div className="grid gap-4 sm:grid-cols-3 text-sm">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <Users className="w-3 h-3" /> Contactgegevens
                              </p>
                              {lead.lead_name && (
                                <p className="text-xs flex items-center gap-1.5">
                                  <Users className="w-3 h-3 text-slate-400" />
                                  <span className="text-slate-500">
                                    Naam:
                                  </span>{" "}
                                  <span className="font-medium text-slate-700">
                                    {lead.lead_name}
                                  </span>
                                </p>
                              )}
                              {lead.lead_email && (
                                <p className="text-xs flex items-center gap-1.5">
                                  <Mail className="w-3 h-3 text-slate-400" />
                                  <span className="text-slate-500">
                                    E-mail:
                                  </span>{" "}
                                  <span className="font-medium text-slate-700">
                                    {lead.lead_email}
                                  </span>
                                </p>
                              )}
                              {lead.lead_phone && (
                                <p className="text-xs flex items-center gap-1.5">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  <span className="text-slate-500">
                                    Tel:
                                  </span>{" "}
                                  <span className="font-medium text-slate-700">
                                    {lead.lead_phone}
                                  </span>
                                </p>
                              )}
                              {lead.lead_company && (
                                <p className="text-xs flex items-center gap-1.5">
                                  <Building2 className="w-3 h-3 text-slate-400" />
                                  <span className="text-slate-500">
                                    Bedrijf:
                                  </span>{" "}
                                  <span className="font-medium text-slate-700">
                                    {lead.lead_company}
                                  </span>
                                </p>
                              )}
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <Target className="w-3 h-3" /> Attributie
                              </p>
                              <p className="text-xs flex items-center gap-1.5">
                                <Search className="w-3 h-3 text-slate-400" />
                                <span className="text-slate-500">
                                  Bron:
                                </span>{" "}
                                <span className="font-medium text-slate-700">
                                  {lead.utm_source ||
                                    lead.referrer_hostname ||
                                    "Direct"}
                                </span>
                              </p>
                              {lead.utm_medium && (
                                <p className="text-xs flex items-center gap-1.5">
                                  <Send className="w-3 h-3 text-slate-400" />
                                  <span className="text-slate-500">
                                    Medium:
                                  </span>{" "}
                                  <span className="font-medium text-slate-700">
                                    {lead.utm_medium}
                                  </span>
                                </p>
                              )}
                              {lead.utm_campaign && (
                                <p className="text-xs flex items-center gap-1.5">
                                  <Megaphone className="w-3 h-3 text-slate-400" />
                                  <span className="text-slate-500">
                                    Campagne:
                                  </span>{" "}
                                  <span className="font-medium text-slate-700">
                                    {lead.utm_campaign}
                                  </span>
                                </p>
                              )}
                              {lead.page_path && (
                                <p className="text-xs flex items-center gap-1.5">
                                  <FileText className="w-3 h-3 text-slate-400" />
                                  <span className="text-slate-500">
                                    Pagina:
                                  </span>{" "}
                                  <span className="font-medium text-slate-700">
                                    {lead.page_path}
                                  </span>
                                </p>
                              )}
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <Globe className="w-3 h-3" /> Context
                              </p>
                              {lead.country_code && (
                                <p className="text-xs flex items-center gap-1.5">
                                  <MapPin className="w-3 h-3 text-slate-400" />
                                  <span className="text-slate-500">
                                    Locatie:
                                  </span>{" "}
                                  <span className="mr-1">
                                    {countryFlag(lead.country_code)}
                                  </span>
                                  <span className="font-medium text-slate-700">
                                    {lead.city ? `${lead.city}, ` : ""}
                                    {lead.country_code}
                                  </span>
                                </p>
                              )}
                              {lead.device_type && (
                                <p className="text-xs flex items-center gap-1.5">
                                  <Smartphone className="w-3 h-3 text-slate-400" />
                                  <span className="text-slate-500">
                                    Apparaat:
                                  </span>{" "}
                                  <span className="font-medium text-slate-700">
                                    {lead.device_type}
                                  </span>
                                </p>
                              )}
                              {lead.lead_message && (
                                <div className="mt-2">
                                  <p className="text-slate-500 text-xs">
                                    Bericht:
                                  </p>
                                  <p className="mt-0.5 rounded-lg bg-white p-2 text-xs whitespace-pre-wrap border border-slate-200">
                                    {lead.lead_message}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                          {lead.lead_data &&
                            typeof lead.lead_data === "object" &&
                            Object.keys(lead.lead_data).length > 0 && (
                              <div className="mt-4 border-t border-slate-200 pt-3">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                                  Alle formulierdata
                                </p>
                                <div className="rounded-lg border bg-white overflow-hidden">
                                  <table className="w-full text-xs">
                                    <tbody>
                                      {Object.entries(lead.lead_data).map(
                                        ([k, v]) => (
                                          <tr
                                            key={k}
                                            className="border-b border-slate-100 last:border-0"
                                          >
                                            <td className="px-3 py-1.5 text-slate-500 font-medium whitespace-nowrap align-top w-1/3">
                                              {k}
                                            </td>
                                            <td className="px-3 py-1.5 text-slate-700 whitespace-pre-wrap break-words">
                                              {v as string}
                                            </td>
                                          </tr>
                                        ),
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </>
  );
}
