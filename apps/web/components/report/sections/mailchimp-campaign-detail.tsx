import React from "react";
import { GlassCard, SectionHeader } from "@/components/report/ui";
import { MailchimpIcon } from "@/components/report/icons";
import { Mail } from "lucide-react";
import { CampaignRow } from "@/types/report";

function formatNumber(val: number) {
  return new Intl.NumberFormat("nl-NL").format(val);
}

interface MailchimpCampaignDetailProps {
  showMailchimp: boolean;
  campaigns: CampaignRow[];
}

export function MailchimpCampaignDetail({
  showMailchimp,
  campaigns,
}: MailchimpCampaignDetailProps) {
  if (!showMailchimp || campaigns.length === 0) {
    return null;
  }

  return (
    <GlassCard className="mb-6" anim="anim-slide-up d300">
      <SectionHeader
        icon={<Mail className="w-4 h-4" />}
        title="E-mailcampagne details"
        iconBg="bg-amber-50"
        iconColor="text-amber-600"
      />
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="pb-2">Campagne</th>
              <th className="pb-2 text-right">Verzonden</th>
              <th className="pb-2 text-right">Geopend</th>
              <th className="pb-2 text-right">Open rate</th>
              <th className="pb-2 text-right">Kliks</th>
              <th className="pb-2 text-right">Click rate</th>
              <th className="pb-2 text-right">Uitschrijvingen</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c, i) => {
              const em = c.extra_metrics || {};
              const sends = Number(em.sends) || 0;
              const uniqueOpens = Number(em.unique_opens) || 0;
              const openRate = Number(em.open_rate) || 0;
              const uniqueClicks = Number(em.unique_clicks) || 0;
              const clickRate = Number(em.click_rate) || 0;
              const unsubscribes = Number(em.unsubscribes) || 0;

              return (
                <tr
                  key={`mailchimp-${c.campaign_id}-${i}`}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 flex-shrink-0">
                        <MailchimpIcon className="w-5 h-5" />
                      </span>
                      <span className="text-[13px] font-medium text-slate-700 truncate max-w-[260px]">
                        {c.campaign_name}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 text-right text-[13px] text-slate-600">
                    {formatNumber(sends)}
                  </td>
                  <td className="py-2.5 text-right text-[13px] text-slate-600">
                    {formatNumber(uniqueOpens)}
                  </td>
                  <td className="py-2.5 text-right text-[13px] font-medium text-slate-700">
                    {(openRate * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 text-right text-[13px] text-slate-600">
                    {formatNumber(uniqueClicks)}
                  </td>
                  <td className="py-2.5 text-right text-[13px] font-medium text-slate-700">
                    {(clickRate * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 text-right text-[13px] text-slate-600">
                    {formatNumber(unsubscribes)}
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
