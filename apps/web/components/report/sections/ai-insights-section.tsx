import { Sparkles } from "lucide-react";
import { AIReportCard } from "@/components/ai-report-card";

interface AIInsightsSectionProps {
  aiAnalysis: any;
  dateFrom: string;
  dateTo: string;
}

export function AIInsightsSection({
  aiAnalysis,
  dateFrom,
  dateTo,
}: AIInsightsSectionProps) {
  if (!aiAnalysis) return null;

  return (
    <div className="glass-card rounded-2xl p-6 anim-slide-up d600 mb-8 border-l-4 border-l-purple-500 relative overflow-hidden">
      <div className="absolute top-[-50%] right-[-10%] w-[40%] h-[200%] bg-purple-400/5 blur-[80px] -z-10 pointer-events-none" />
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-bold text-slate-800 flex items-center">
          <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mr-3 text-sm shadow-sm border border-purple-100">
            <Sparkles className="w-4 h-4" />
          </div>
          Smart AI Inzichten
        </h2>
        <span className="px-2.5 py-1 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-[10px] font-bold rounded-full shadow-md flex items-center">
          <span className="w-1.5 h-1.5 bg-white rounded-full mr-1.5 animate-pulse" />
          Analyse
        </span>
      </div>
      <AIReportCard
        analysis={aiAnalysis}
        periodStart={dateFrom}
        periodEnd={dateTo}
        compact
      />
    </div>
  );
}
