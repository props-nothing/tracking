'use client';

import { use, useEffect, useState, useCallback, Fragment } from 'react';
import { TimeSeries } from '@/components/charts/time-series';
import { AIReportCard } from '@/components/ai-report-card';
import {
  Users,
  Eye,
  Activity,
  BarChart3,
  Clock,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  ChartLine,
  ChartPie,
  FileText,
  Link2,
  Search,
  Sparkles,
  Layers,
  Filter as FilterIcon,
  X,
  Chrome,
  Compass,
  Mail,
  MailOpen,
  MousePointer,
  Hash,
  Megaphone,
  TrendingUp,
  Calendar,
  Phone,
  Building2,
  MapPin,
  UserPlus,
  UserCheck,
  ExternalLink,
  Tag,
  Target,
  Send,
  CircleDot,
  DollarSign,
  MousePointerClick,
  BadgeEuro,
  Crosshair,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface NameValue { name: string; value: number }
interface NameVisitors { name: string; visitors: number }
interface PathViews { path: string; views: number }
interface SourceVisitors { source: string; visitors: number }
interface CountryRow { code: string; name: string; visitors: number }
interface LeadRow {
  id: number;
  lead_name: string | null;
  lead_email: string | null;
  lead_phone: string | null;
  lead_company: string | null;
  lead_message: string | null;
  lead_data: Record<string, string> | null;
  form_id: string | null;
  page_path: string | null;
  referrer_hostname: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  country_code: string | null;
  city: string | null;
  device_type: string | null;
  status: string;
  created_at: string;
}
interface SourceCount { source: string; count: number }

interface CampaignRow {
  provider: string;
  campaign_id: string;
  campaign_name: string;
  campaign_status: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversion_value: number;
  results: number;
  currency: string;
}

interface ProviderSummary {
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversion_value: number;
  results: number;
}

interface AIAnalysisData {
  summary: string;
  highlights: { type: string; title: string; detail: string; metric?: string; change_pct?: number }[];
  lead_insights: { top_sources: string; recommendations: string[]; quality_assessment: string };
  campaign_insights: { best_performing: string; worst_performing: string; budget_recommendations: string[]; new_ideas: string[] };
  traffic_insights: { trends: string; anomalies: string[]; opportunities: string[] };
  page_insights: { top_performers: string; underperformers: string; optimization_suggestions: string[] };
  comparison?: { summary: string; improvements: string[]; regressions: string[]; campaign_comparison: string };
  action_items: { priority: string; category: string; action: string; expected_impact: string }[];
  confidence_notes: string;
}

interface ReportData {
  site_name: string;
  site_domain: string;
  report_name: string;
  description?: string;
  logo_url?: string;
  brand_color?: string;
  date_from: string;
  date_to: string;
  metrics: {
    visitors: number;
    pageviews: number;
    sessions: number;
    bounce_rate: number;
    views_per_session: number;
    avg_duration: number;
  };
  timeseries: { date: string; visitors: number; pageviews: number }[];
  top_pages: PathViews[];
  top_referrers: SourceVisitors[];
  browsers: NameValue[];
  operating_systems: NameValue[];
  device_types: NameValue[];
  countries: CountryRow[];
  entry_pages: PathViews[];
  exit_pages: PathViews[];
  utm_sources: NameVisitors[];
  utm_mediums: NameVisitors[];
  utm_campaigns: NameVisitors[];
  leads: LeadRow[];
  lead_sources: SourceCount[];
  lead_mediums: { medium: string; count: number }[];
  lead_campaigns: { campaign: string; count: number }[];
  campaign_data: CampaignRow[];
  campaign_summary: Record<string, ProviderSummary>;
  ai_analysis?: AIAnalysisData;
}

interface ReportFilter { key: string; label: string; value: string }

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const DATE_RANGES = [
  { value: 'today', label: 'Vandaag' },
  { value: 'last_7_days', label: 'Laatste 7 dagen' },
  { value: 'last_30_days', label: 'Laatste 30 dagen' },
  { value: 'last_90_days', label: 'Laatste 90 dagen' },
  { value: 'last_365_days', label: 'Laatste 12 maanden' },
  { value: 'this_month', label: 'Deze maand' },
  { value: 'last_month', label: 'Vorige maand' },
] as const;

const SOURCE_COLORS = [
  { color: '#3b82f6', bg: 'bg-blue-500' },
  { color: '#8b5cf6', bg: 'bg-violet-500' },
  { color: '#10b981', bg: 'bg-emerald-500' },
  { color: '#f59e0b', bg: 'bg-amber-500' },
  { color: '#94a3b8', bg: 'bg-slate-400' },
  { color: '#ec4899', bg: 'bg-pink-500' },
  { color: '#06b6d4', bg: 'bg-cyan-500' },
  { color: '#f97316', bg: 'bg-orange-500' },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function formatDuration(sec: number) {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

function formatNumber(val: number) {
  return new Intl.NumberFormat('nl-NL').format(val);
}

function formatCurrency(val: number, currency = 'EUR') {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency, minimumFractionDigits: 2 }).format(val);
}

/** Convert ISO-2 country code to flag emoji */
function countryFlag(code: string) {
  if (!code || code.length !== 2) return '🌍';
  const upper = code.toUpperCase();
  const offset = 0x1F1E6 - 65;
  return String.fromCodePoint(upper.charCodeAt(0) + offset, upper.charCodeAt(1) + offset);
}

/* ---- Inline SVG brand icons ---- */
function GoogleIcon({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09A6.97 6.97 0 0 1 5.48 12c0-.72.13-1.43.36-2.09V7.07H2.18A11.96 11.96 0 0 0 0 12c0 1.93.46 3.77 1.28 5.4l3.56-2.77.01-.54z" fill="#FBBC05" />
      <path d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.09 14.97 0 12 0 7.7 0 3.99 2.47 2.18 6.07l3.66 2.84c.87-2.6 3.3-4.16 6.16-4.16z" fill="#EA4335" />
    </svg>
  );
}

function FacebookIcon({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.025 4.388 11.022 10.125 11.927v-8.437H7.078v-3.49h3.047V9.41c0-3.026 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.971H15.83c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796v8.437C19.612 23.095 24 18.098 24 12.073z" />
    </svg>
  );
}

function InstagramIcon({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <defs>
        <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFDC80" />
          <stop offset="25%" stopColor="#F77737" />
          <stop offset="50%" stopColor="#E1306C" />
          <stop offset="75%" stopColor="#C13584" />
          <stop offset="100%" stopColor="#833AB4" />
        </linearGradient>
      </defs>
      <path fill="url(#ig-grad)" d="M12 2.163c3.204 0 3.584.012 4.85.07 1.17.054 1.97.24 2.43.403a4.088 4.088 0 0 1 1.518.988c.464.464.8.952.987 1.518.164.46.35 1.26.404 2.43.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.054 1.17-.24 1.97-.404 2.43a4.088 4.088 0 0 1-.987 1.518 4.088 4.088 0 0 1-1.518.987c-.46.164-1.26.35-2.43.404-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.17-.054-1.97-.24-2.43-.404a4.088 4.088 0 0 1-1.518-.987 4.088 4.088 0 0 1-.987-1.518c-.164-.46-.35-1.26-.404-2.43C2.175 15.584 2.163 15.204 2.163 12s.012-3.584.07-4.85c.054-1.17.24-1.97.404-2.43A4.088 4.088 0 0 1 3.624 3.2a4.088 4.088 0 0 1 1.518-.988c.46-.164 1.26-.35 2.43-.404C8.838 1.75 9.218 1.738 12 1.738V2.163zM12 0C8.741 0 8.333.014 7.053.072 5.775.13 4.902.333 4.14.63a5.876 5.876 0 0 0-2.126 1.384A5.876 5.876 0 0 0 .63 4.14C.333 4.902.13 5.775.072 7.053.014 8.333 0 8.741 0 12s.014 3.668.072 4.948c.058 1.277.261 2.15.558 2.913a5.876 5.876 0 0 0 1.384 2.126A5.876 5.876 0 0 0 4.14 23.37c.763.297 1.636.5 2.913.558C8.333 23.986 8.741 24 12 24s3.668-.014 4.948-.072c1.277-.058 2.15-.261 2.913-.558a5.876 5.876 0 0 0 2.126-1.384 5.876 5.876 0 0 0 1.384-2.126c.297-.763.5-1.636.558-2.913.058-1.28.072-1.688.072-4.948s-.014-3.668-.072-4.948c-.058-1.277-.261-2.15-.558-2.913a5.876 5.876 0 0 0-1.384-2.126A5.876 5.876 0 0 0 19.86.63C19.098.333 18.225.13 16.948.072 15.668.014 15.26 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
    </svg>
  );
}

/** Return a contextual icon + color for a referrer source */
function sourceIcon(source: string): { icon: React.ReactNode; color: string; bg: string } {
  const s = source.toLowerCase();
  if (s.includes('google'))    return { icon: <GoogleIcon className="w-3.5 h-3.5" />,  color: 'text-blue-600',    bg: 'bg-white' };
  if (s.includes('facebook') || s.includes('meta') || /\bfb\b/.test(s))  return { icon: <FacebookIcon className="w-3.5 h-3.5" />, color: 'text-blue-600', bg: 'bg-blue-50' };
  if (s.includes('instagram')) return { icon: <InstagramIcon className="w-3.5 h-3.5" />, color: 'text-pink-600', bg: 'bg-pink-50' };
  if (s.includes('linkedin'))  return { icon: <UserCheck className="w-3 h-3" />,       color: 'text-sky-600',     bg: 'bg-sky-50' };
  if (s.includes('twitter') || s.includes('x.com')) return { icon: <Hash className="w-3 h-3" />, color: 'text-slate-700', bg: 'bg-slate-100' };
  if (s.includes('youtube'))   return { icon: <ExternalLink className="w-3 h-3" />,    color: 'text-red-600',     bg: 'bg-red-50' };
  if (s.includes('tiktok'))    return { icon: <Hash className="w-3 h-3" />,            color: 'text-fuchsia-600', bg: 'bg-fuchsia-50' };
  if (s.includes('mail') || s.includes('newsletter') || s.includes('email')) return { icon: <Mail className="w-3 h-3" />, color: 'text-amber-600', bg: 'bg-amber-50' };
  if (s.includes('direct') || s === '(direct)') return { icon: <MousePointer className="w-3 h-3" />, color: 'text-slate-500', bg: 'bg-slate-100' };
  if (s.includes('bing'))      return { icon: <Search className="w-3 h-3" />,          color: 'text-teal-600',    bg: 'bg-teal-50' };
  return { icon: <Link2 className="w-3 h-3" />, color: 'text-blue-500', bg: 'bg-blue-50' };
}

/** Return an icon for a browser name */
function browserIcon(name: string): React.ReactNode {
  const n = name.toLowerCase();
  if (n.includes('chrome'))  return <GoogleIcon className="w-3.5 h-3.5" />;
  if (n.includes('safari'))  return <Compass className="w-3.5 h-3.5 text-sky-500" />;
  if (n.includes('firefox')) return <Globe className="w-3.5 h-3.5 text-orange-500" />;
  if (n.includes('edge'))    return <Globe className="w-3.5 h-3.5 text-blue-600" />;
  if (n.includes('opera'))   return <Globe className="w-3.5 h-3.5 text-red-500" />;
  if (n.includes('samsung')) return <Smartphone className="w-3.5 h-3.5 text-violet-500" />;
  return <Globe className="w-3.5 h-3.5 text-slate-400" />;
}

/** Return an icon for an OS name */
function osIcon(name: string): React.ReactNode {
  const n = name.toLowerCase();
  if (n.includes('windows')) return <Monitor className="w-3.5 h-3.5 text-blue-500" />;
  if (n.includes('mac') || n.includes('ios')) return <Smartphone className="w-3.5 h-3.5 text-slate-700" />;
  if (n.includes('android')) return <Smartphone className="w-3.5 h-3.5 text-emerald-500" />;
  if (n.includes('linux'))   return <Monitor className="w-3.5 h-3.5 text-amber-600" />;
  if (n.includes('chrome'))  return <Chrome className="w-3.5 h-3.5 text-blue-500" />;
  return <Monitor className="w-3.5 h-3.5 text-slate-400" />;
}

/** Return an icon for a UTM source/medium/campaign name */
function utmIcon(name: string): { icon: React.ReactNode; color: string; bg: string } {
  const n = name.toLowerCase();
  if (n.includes('google'))    return { icon: <GoogleIcon className="w-3.5 h-3.5" />, color: 'text-blue-600',  bg: 'bg-white' };
  if (n.includes('facebook') || n.includes('meta') || /\bfb\b/.test(n)) return { icon: <FacebookIcon className="w-3.5 h-3.5" />, color: 'text-blue-600', bg: 'bg-blue-50' };
  if (n.includes('instagram')) return { icon: <InstagramIcon className="w-3.5 h-3.5" />, color: 'text-pink-600', bg: 'bg-pink-50' };
  if (n.includes('email') || n.includes('mail') || n.includes('newsletter')) return { icon: <Mail className="w-3 h-3" />, color: 'text-amber-600', bg: 'bg-amber-50' };
  if (n.includes('linkedin'))  return { icon: <UserCheck className="w-3 h-3" />,  color: 'text-sky-600',     bg: 'bg-sky-50' };
  if (n.includes('cpc') || n.includes('paid') || n.includes('ad'))   return { icon: <Megaphone className="w-3 h-3" />, color: 'text-orange-600', bg: 'bg-orange-50' };
  if (n.includes('social'))    return { icon: <Hash className="w-3 h-3" />,        color: 'text-pink-600',    bg: 'bg-pink-50' };
  if (n.includes('organic'))   return { icon: <Search className="w-3 h-3" />,      color: 'text-emerald-600', bg: 'bg-emerald-50' };
  if (n.includes('referral'))  return { icon: <Link2 className="w-3 h-3" />,       color: 'text-cyan-600',    bg: 'bg-cyan-50' };
  if (n.includes('direct'))    return { icon: <MousePointer className="w-3 h-3" />,color: 'text-slate-500',   bg: 'bg-slate-100' };
  return { icon: <Target className="w-3 h-3" />, color: 'text-slate-600', bg: 'bg-slate-100' };
}

/* ------------------------------------------------------------------ */
/*  Inline styles for glass effects & animations                       */
/* ------------------------------------------------------------------ */
const REPORT_STYLES = `
  .rpt .glass-card {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(226, 232, 240, 0.8);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .rpt .glass-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02);
    border-color: rgba(203, 213, 225, 1);
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
`;

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function GlassCard({ children, className = '', anim = '' }: { children: React.ReactNode; className?: string; anim?: string }) {
  return <div className={`glass-card rounded-2xl p-6 ${anim} ${className}`}>{children}</div>;
}

function SectionHeader({ icon, title, iconBg, iconColor, action }: {
  icon: React.ReactNode; title: string; iconBg: string; iconColor: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2 className="text-base font-bold text-slate-800 flex items-center">
        <div className={`w-7 h-7 rounded-lg ${iconBg} ${iconColor} flex items-center justify-center mr-3 text-sm shadow-sm`}>
          {icon}
        </div>
        {title}
      </h2>
      {action}
    </div>
  );
}

function KPICard({ label, value, icon, iconBg, iconColor, gradientFrom, delay }: {
  label: string; value: string; icon: React.ReactNode; iconBg: string; iconColor: string; gradientFrom: string; delay: string;
}) {
  return (
    <div className={`glass-card rounded-2xl p-6 anim-scale-up ${delay} relative overflow-hidden group`}>
      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl ${gradientFrom} to-transparent rounded-bl-full opacity-50 group-hover:opacity-100 transition-opacity duration-500`} />
      <div className="flex justify-between items-start mb-2 relative z-10">
        <div>
          <p className="text-slate-500 text-[11px] font-bold mb-1.5 uppercase tracking-wider">{label}</p>
          <h3 className="text-2xl font-black text-slate-800">{value}</h3>
        </div>
        <div className={`w-10 h-10 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function DeviceBar({ icon, name, percentage, idx }: { icon: React.ReactNode; name: string; percentage: number; idx: number }) {
  return (
    <div>
      <div className="flex justify-between items-end mb-1.5">
        <span className="text-xs font-bold text-slate-700 flex items-center">
          <span className="text-slate-400 mr-2.5 w-4 flex justify-center">{icon}</span>{name}
        </span>
        <span className="text-xs text-slate-500"><span className="font-bold text-slate-800">{percentage}%</span> verkeer</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2">
        <div className="bg-cyan-500 h-2 rounded-full bar-fill" style={{ width: `${percentage}%`, animationDelay: `${idx * 100}ms` }} />
      </div>
    </div>
  );
}

function TabBar({ tabs, active, onChange }: { tabs: { key: string; label: string }[]; active: string; onChange: (k: string) => void }) {
  return (
    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${active === t.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export default function PublicReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [savedPassword, setSavedPassword] = useState('');
  const [error, setError] = useState('');
  const [range, setRange] = useState('last_30_days');
  const [filters, setFilters] = useState<ReportFilter[]>([]);
  const [activeTab, setActiveTab] = useState<'pages' | 'entry' | 'exit'>('pages');
  const [utmTab, setUtmTab] = useState<'sources' | 'mediums' | 'campaigns'>('sources');
  const [expandedLead, setExpandedLead] = useState<number | null>(null);
  const [mainTab, setMainTab] = useState<'all' | 'website' | 'meta' | 'google'>('all');

  /* ---- Data fetching ---- */
  const fetchReport = useCallback((pw?: string) => {
    setLoading(true);
    setError('');
    const qs = new URLSearchParams();
    if (pw) qs.set('password', pw);
    qs.set('range', range);
    filters.forEach((f) => qs.set(f.key, f.value));

    fetch(`/api/reports/shared/${token}/data?${qs.toString()}`)
      .then(async (res) => {
        if (res.status === 401) { setNeedsPassword(true); setLoading(false); return; }
        if (res.status === 403) { setNeedsPassword(true); setError('Onjuist wachtwoord'); setLoading(false); return; }
        if (!res.ok) { setError('Rapport laden mislukt'); setLoading(false); return; }
        const d = await res.json();
        setData({
          site_name: d.site_name ?? '', site_domain: d.site_domain ?? '',
          report_name: d.report_name ?? '', description: d.description ?? '',
          logo_url: d.logo_url, brand_color: d.brand_color,
          date_from: d.date_from ?? '', date_to: d.date_to ?? '',
          metrics: {
            visitors: d.metrics?.visitors ?? 0, pageviews: d.metrics?.pageviews ?? 0,
            sessions: d.metrics?.sessions ?? 0, bounce_rate: d.metrics?.bounce_rate ?? 0,
            views_per_session: d.metrics?.views_per_session ?? 0, avg_duration: d.metrics?.avg_duration ?? 0,
          },
          timeseries: d.timeseries ?? [], top_pages: d.top_pages ?? [],
          top_referrers: d.top_referrers ?? [], browsers: d.browsers ?? [],
          operating_systems: d.operating_systems ?? [], device_types: d.device_types ?? [],
          countries: d.countries ?? [], entry_pages: d.entry_pages ?? [],
          exit_pages: d.exit_pages ?? [], utm_sources: d.utm_sources ?? [],
          utm_mediums: d.utm_mediums ?? [], utm_campaigns: d.utm_campaigns ?? [],
          leads: d.leads ?? [], lead_sources: d.lead_sources ?? [],
          lead_mediums: d.lead_mediums ?? [], lead_campaigns: d.lead_campaigns ?? [],
          campaign_data: d.campaign_data ?? [],
          campaign_summary: d.campaign_summary ?? {},
          ai_analysis: d.ai_analysis ?? undefined,
        });
        setNeedsPassword(false);
        setLoading(false);
      })
      .catch(() => { setError('Rapport laden mislukt'); setLoading(false); });
  }, [token, range, filters]);

  useEffect(() => { fetchReport(savedPassword || undefined); }, [fetchReport, savedPassword]);

  const addFilter = (key: string, label: string, value: string) => {
    if (filters.some((f) => f.key === key && f.value === value)) return;
    setFilters((prev) => [...prev.filter((f) => f.key !== key), { key, label, value }]);
  };

  const removeFilter = (key: string) => setFilters((prev) => prev.filter((f) => f.key !== key));

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
          <h1 className="text-lg font-bold text-slate-900">Wachtwoord beveiligd</h1>
          <p className="text-sm text-slate-500">Dit rapport vereist een wachtwoord.</p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Wachtwoord invoeren"
            onKeyDown={(e) => { if (e.key === 'Enter') { setSavedPassword(password); setNeedsPassword(false); } }}
            className="w-full rounded-xl border bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
          <button
            onClick={() => { setSavedPassword(password); setNeedsPassword(false); }}
            className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 shadow-md shadow-blue-500/30 transition-colors"
          >Rapport bekijken</button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <p className="text-sm text-red-600">{error || 'Rapport niet gevonden'}</p>
      </div>
    );
  }

  /* ---- Derived data ---- */
  const met = data.metrics;
  const totalDev = data.device_types.reduce((a, d) => a + d.value, 0);
  const devPcts = data.device_types.map((d) => ({ name: d.name, pct: totalDev > 0 ? Math.round((d.value / totalDev) * 100) : 0 }));
  const pagesData = activeTab === 'pages' ? data.top_pages : activeTab === 'entry' ? data.entry_pages : data.exit_pages;
  const utmData = utmTab === 'sources' ? data.utm_sources : utmTab === 'mediums' ? data.utm_mediums : data.utm_campaigns;

  const metaCampaigns = data.campaign_data.filter((c) => c.provider === 'meta_ads');
  const googleCampaigns = data.campaign_data.filter((c) => c.provider === 'google_ads');
  const hasMetaCampaigns = metaCampaigns.length > 0;
  const hasGoogleCampaigns = googleCampaigns.length > 0;
  const hasAnyCampaigns = hasMetaCampaigns || hasGoogleCampaigns;
  const metaSummary = data.campaign_summary?.meta_ads;
  const googleSummary = data.campaign_summary?.google_ads;

  // Which campaigns to show in the current tab
  const tabCampaigns = mainTab === 'meta' ? metaCampaigns : mainTab === 'google' ? googleCampaigns : data.campaign_data;

  // Show website sections? (all or website tab)
  const showWebsite = mainTab === 'all' || mainTab === 'website';
  // Show ads sections?
  const showAds = mainTab === 'all' || mainTab === 'meta' || mainTab === 'google';

  // Source matching helpers for filtering leads by tab
  const isMetaSource = (s: string) => /facebook|\bfb\b|meta|instagram/i.test(s);
  const isGoogleSource = (s: string) => /google/i.test(s);
  const isPaidMedium = (m: string) => /cpc|paid|ppc|cpm|retargeting|social_paid/i.test(m);
  const matchesTab = (lead: LeadRow) => {
    const src = (lead.utm_source || lead.referrer_hostname || '').toLowerCase();
    const medium = (lead.utm_medium || '').toLowerCase();
    if (mainTab === 'meta') return isMetaSource(src) && isPaidMedium(medium);
    if (mainTab === 'google') return isGoogleSource(src) && isPaidMedium(medium);
    return true;
  };

  // Filtered leads & aggregations per tab
  const filteredLeads = mainTab === 'all' || mainTab === 'website' ? data.leads : data.leads.filter(matchesTab);
  const filteredLeadSources = (() => {
    if (mainTab === 'all' || mainTab === 'website') return data.lead_sources;
    // Re-aggregate from filteredLeads so the paid-medium filter is respected
    const srcCounts: Record<string, number> = {};
    filteredLeads.forEach((l) => { const s = l.utm_source || l.referrer_hostname || 'direct'; srcCounts[s] = (srcCounts[s] || 0) + 1; });
    return Object.entries(srcCounts).map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count);
  })();
  const filteredLeadMediums = (() => {
    if (mainTab === 'all' || mainTab === 'website') return data.lead_mediums;
    const mediumCounts: Record<string, number> = {};
    filteredLeads.forEach((l) => { const m = l.utm_medium || 'direct'; mediumCounts[m] = (mediumCounts[m] || 0) + 1; });
    return Object.entries(mediumCounts).map(([medium, count]) => ({ medium, count })).sort((a, b) => b.count - a.count);
  })();
  const filteredLeadCampaigns = (() => {
    if (mainTab === 'all' || mainTab === 'website') return data.lead_campaigns;
    const campCounts: Record<string, number> = {};
    filteredLeads.forEach((l) => { const c = l.utm_campaign; if (c) campCounts[c] = (campCounts[c] || 0) + 1; });
    return Object.entries(campCounts).map(([campaign, count]) => ({ campaign, count })).sort((a, b) => b.count - a.count);
  })();

  // Lead counts per provider (from our tracker — only paid traffic)
  const metaLeads = data.leads.filter((l) => {
    const src = (l.utm_source || l.referrer_hostname || '').toLowerCase();
    return isMetaSource(src) && isPaidMedium((l.utm_medium || '').toLowerCase());
  });
  const googleLeads = data.leads.filter((l) => {
    const src = (l.utm_source || l.referrer_hostname || '').toLowerCase();
    return isGoogleSource(src) && isPaidMedium((l.utm_medium || '').toLowerCase());
  });

  // Map leads to campaigns (match utm_campaign to campaign_name or campaign_id, scoped by provider, paid only)
  const leadCountByCampaign = (() => {
    const map: Record<string, number> = {};
    data.leads.forEach((l) => {
      const utm = l.utm_campaign;
      if (!utm) return;
      const medium = (l.utm_medium || '').toLowerCase();
      if (!isPaidMedium(medium)) return;
      const src = (l.utm_source || l.referrer_hostname || '').toLowerCase();
      const leadIsMeta = isMetaSource(src);
      const leadIsGoogle = isGoogleSource(src);
      data.campaign_data.forEach((c) => {
        // Only count leads whose source matches the campaign provider
        if (c.provider === 'meta_ads' && !leadIsMeta) return;
        if (c.provider === 'google_ads' && !leadIsGoogle) return;
        const key = `${c.provider}-${c.campaign_id}`;
        if (c.campaign_id === utm || c.campaign_name.toLowerCase().includes(utm.toLowerCase())) {
          map[key] = (map[key] || 0) + 1;
        }
      });
    });
    return map;
  })();

  // Available main tabs
  const mainTabs: { key: typeof mainTab; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'Overzicht', icon: <Layers className="w-3.5 h-3.5" /> },
    { key: 'website', label: 'Website', icon: <Globe className="w-3.5 h-3.5" /> },
    ...(hasMetaCampaigns ? [{ key: 'meta' as const, label: 'Meta Ads', icon: <FacebookIcon className="w-3.5 h-3.5" /> }] : []),
    ...(hasGoogleCampaigns ? [{ key: 'google' as const, label: 'Google Ads', icon: <GoogleIcon className="w-3.5 h-3.5" /> }] : []),
  ];

  /* ---- Dashboard ---- */
  return (
    <div className="rpt text-slate-800 antialiased min-h-screen relative overflow-x-hidden bg-[#f8fafc]">
      <style dangerouslySetInnerHTML={{ __html: REPORT_STYLES }} />

      {/* Background blobs */}
      <div className="fixed top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-50/50 to-transparent -z-10" />
      <div className="fixed top-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-400/10 rounded-full blur-[100px] -z-10 pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-emerald-400/10 rounded-full blur-[100px] -z-10 pointer-events-none" />

      <div className="max-w-[1440px] mx-auto p-4 sm:p-6 lg:p-8">

        {/* ═══════════════════ Header ═══════════════════ */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 anim-slide-up">
          <div className="flex items-center gap-4">
            {data.logo_url && (
              <img src={data.logo_url} alt="" className="h-10 w-10 rounded-xl object-contain border border-slate-200 shadow-sm" />
            )}
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-1">{data.report_name}</h1>
              <p className="text-slate-500 text-xs font-medium flex items-center">
                <span className="relative flex h-2.5 w-2.5 mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                {data.site_name}{data.site_domain ? ` · ${data.site_domain}` : ''}
              </p>
            </div>
          </div>

          <div className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-1">
            <Calendar className="w-4 h-4 text-slate-400 ml-2 mr-1" />
            {DATE_RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${range === r.value ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' : 'text-slate-500 hover:text-slate-900'}`}
              >{r.label}</button>
            ))}
            {loading && <div className="ml-2 h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />}
          </div>
        </header>

        {/* ═══════════════════ Active Filters ═══════════════════ */}
        {filters.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6 anim-slide-up">
            {filters.map((f) => (
              <span key={f.key} className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-700">
                {f.label}: {f.value}
                <button onClick={() => removeFilter(f.key)} className="hover:text-blue-500 transition-colors"><X className="w-3 h-3" /></button>
              </span>
            ))}
            <button onClick={() => setFilters([])} className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors">Alles wissen</button>
          </div>
        )}

        {/* ═══════════════════ Main Tabs ═══════════════════ */}
        {hasAnyCampaigns && (
          <div className="flex space-x-6 border-b border-slate-200 mb-8 overflow-x-auto anim-slide-up d100" style={{ scrollbarWidth: 'none' }}>
            {mainTabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setMainTab(t.key)}
                className={`pb-3 px-1 text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${
                  mainTab === t.key
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-500 hover:text-slate-800 border-b-2 border-transparent'
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        )}

        {/* ═══════════════════ KPI Cards ═══════════════════ */}
        {showWebsite && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5 mb-8">
          <KPICard label="Bezoekers" value={formatNumber(met.visitors)} icon={<Users className="w-5 h-5" />} iconBg="bg-violet-50" iconColor="text-violet-600" gradientFrom="from-violet-100" delay="d100" />
          <KPICard label="Paginaweergaven" value={formatNumber(met.pageviews)} icon={<Eye className="w-5 h-5" />} iconBg="bg-blue-50" iconColor="text-blue-600" gradientFrom="from-blue-100" delay="d150" />
          <KPICard label="Sessies" value={formatNumber(met.sessions)} icon={<Activity className="w-5 h-5" />} iconBg="bg-emerald-50" iconColor="text-emerald-600" gradientFrom="from-emerald-100" delay="d200" />
          <KPICard label="Bouncepercentage" value={`${met.bounce_rate}%`} icon={<BarChart3 className="w-5 h-5" />} iconBg="bg-amber-50" iconColor="text-amber-600" gradientFrom="from-amber-100" delay="d250" />
          <KPICard label="Weergaven / sessie" value={met.views_per_session.toString()} icon={<Layers className="w-5 h-5" />} iconBg="bg-cyan-50" iconColor="text-cyan-600" gradientFrom="from-cyan-100" delay="d300" />
          <KPICard label="Gem. duur" value={formatDuration(met.avg_duration)} icon={<Clock className="w-5 h-5" />} iconBg="bg-rose-50" iconColor="text-rose-600" gradientFrom="from-rose-100" delay="d400" />
        </div>
        )}

        {/* ═══════════════════ Ads KPIs (Meta/Google tab or Overzicht) ═══════════════════ */}
        {showAds && hasAnyCampaigns && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 mb-8">
            {(mainTab === 'all' || mainTab === 'meta') && metaSummary && (
              <>
                <KPICard label="Meta Impressies" value={formatNumber(metaSummary.impressions)} icon={<FacebookIcon className="w-5 h-5" />} iconBg="bg-blue-50" iconColor="text-blue-600" gradientFrom="from-blue-100" delay="d100" />
                <KPICard label="Meta Kliks" value={formatNumber(metaSummary.clicks)} icon={<MousePointerClick className="w-5 h-5" />} iconBg="bg-indigo-50" iconColor="text-indigo-600" gradientFrom="from-indigo-100" delay="d150" />
                <KPICard label="Meta Uitgaven" value={formatCurrency(metaSummary.cost)} icon={<BadgeEuro className="w-5 h-5" />} iconBg="bg-rose-50" iconColor="text-rose-600" gradientFrom="from-rose-100" delay="d200" />
                <KPICard label="Meta Resultaten" value={formatNumber(metaSummary.results)} icon={<UserPlus className="w-5 h-5" />} iconBg="bg-emerald-50" iconColor="text-emerald-600" gradientFrom="from-emerald-100" delay="d250" />
                {metaSummary.results > 0 && metaSummary.cost > 0 && (
                  <KPICard label="Meta CPR" value={formatCurrency(metaSummary.cost / metaSummary.results)} icon={<Target className="w-5 h-5" />} iconBg="bg-teal-50" iconColor="text-teal-600" gradientFrom="from-teal-100" delay="d300" />
                )}
              </>
            )}
            {(mainTab === 'all' || mainTab === 'google') && googleSummary && (
              <>
                <KPICard label="Google Impressies" value={formatNumber(googleSummary.impressions)} icon={<GoogleIcon className="w-5 h-5" />} iconBg="bg-white" iconColor="text-blue-600" gradientFrom="from-blue-100" delay="d100" />
                <KPICard label="Google Kliks" value={formatNumber(googleSummary.clicks)} icon={<MousePointerClick className="w-5 h-5" />} iconBg="bg-sky-50" iconColor="text-sky-600" gradientFrom="from-sky-100" delay="d150" />
                <KPICard label="Google Uitgaven" value={formatCurrency(googleSummary.cost)} icon={<BadgeEuro className="w-5 h-5" />} iconBg="bg-amber-50" iconColor="text-amber-600" gradientFrom="from-amber-100" delay="d200" />
                <KPICard label="Google Resultaten" value={formatNumber(googleSummary.results)} icon={<UserPlus className="w-5 h-5" />} iconBg="bg-teal-50" iconColor="text-teal-600" gradientFrom="from-teal-100" delay="d250" />
                {googleSummary.results > 0 && googleSummary.cost > 0 && (
                  <KPICard label="Google CPR" value={formatCurrency(googleSummary.cost / googleSummary.results)} icon={<Target className="w-5 h-5" />} iconBg="bg-emerald-50" iconColor="text-emerald-600" gradientFrom="from-emerald-100" delay="d300" />
                )}
              </>
            )}
          </div>
        )}

        {/* ═══════════════════ Chart + Sources ═══════════════════ */}
        {showWebsite && (<>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {data.timeseries.length > 0 && (
            <GlassCard className="lg:col-span-2 flex flex-col" anim="anim-slide-up d300">
              <SectionHeader icon={<ChartLine className="w-4 h-4" />} title="Bezoekers & Paginaweergaven" iconBg="bg-blue-50" iconColor="text-blue-600" />
              <div className="flex-grow relative" style={{ minHeight: 280 }}>
                <TimeSeries data={data.timeseries} period={range} />
              </div>
            </GlassCard>
          )}

          {data.top_referrers.length > 0 && (
            <GlassCard className="flex flex-col" anim="anim-slide-right d400">
              <SectionHeader icon={<ChartPie className="w-4 h-4" />} title="Verkeersbronnen" iconBg="bg-violet-50" iconColor="text-violet-600" />
              <div className="flex-grow flex flex-col gap-2.5">
                {data.top_referrers.slice(0, 8).map((ref, i) => {
                  const pct = met.visitors > 0 ? Math.round((ref.visitors / met.visitors) * 100) : 0;
                  const si = sourceIcon(ref.source);
                  return (
                    <button key={ref.source} onClick={() => addFilter('referrer', 'Referrer', ref.source)}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors group text-left w-full">
                      <div className="flex items-center">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center mr-3 ${si.bg} ${si.color} shadow-sm`}>
                          {si.icon}
                        </div>
                        <span className="text-[13px] font-medium text-slate-600 group-hover:text-slate-900 transition-colors truncate max-w-[140px]">{ref.source}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-bold text-slate-800">{pct}%</span>
                        <span className="text-[10px] text-slate-400">({formatNumber(ref.visitors)})</span>
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
              title={activeTab === 'pages' ? "Meest Bekeken Pagina's" : activeTab === 'entry' ? "Instappagina's" : "Uitstappagina's"}
              iconBg="bg-teal-50" iconColor="text-teal-600"
              action={<TabBar tabs={[{ key: 'pages', label: 'Top' }, { key: 'entry', label: 'Instap' }, { key: 'exit', label: 'Uitstap' }]} active={activeTab} onChange={(k) => setActiveTab(k as typeof activeTab)} />}
            />
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-2">Pagina</th>
                    <th className="pb-2 text-right">Weergaven</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {pagesData.slice(0, 10).map((p) => (
                    <tr key={p.path} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/80 transition-colors group cursor-pointer" onClick={() => addFilter('page', 'Pagina', p.path)}>
                      <td className="py-3 pr-2 font-medium text-slate-700 whitespace-nowrap group-hover:text-blue-600 transition-colors">
                        <Link2 className="inline w-3 h-3 text-slate-300 mr-2" />{p.path}
                      </td>
                      <td className="py-3 pl-2 text-right text-slate-800 font-bold tabular-nums">{formatNumber(p.views)}</td>
                    </tr>
                  ))}
                  {pagesData.length === 0 && <tr><td colSpan={2} className="py-8 text-center text-slate-400">Geen data</td></tr>}
                </tbody>
              </table>
            </div>
          </GlassCard>

          {data.countries.length > 0 && (
            <GlassCard anim="anim-slide-up d500">
              <SectionHeader icon={<Globe className="w-4 h-4" />} title="Landen" iconBg="bg-indigo-50" iconColor="text-indigo-600" />
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="pb-2">Land</th>
                      <th className="pb-2 text-right">Bezoekers</th>
                      <th className="pb-2 text-right w-32">%</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {data.countries.slice(0, 10).map((c) => {
                      const pct = met.visitors > 0 ? Math.round((c.visitors / met.visitors) * 100) : 0;
                      return (
                        <tr key={c.code} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/80 transition-colors cursor-pointer group" onClick={() => addFilter('country', 'Land', c.code)}>
                          <td className="py-3 pr-2 whitespace-nowrap">
                            <span className="mr-2 text-base">{countryFlag(c.code)}</span>
                            <span className="font-medium text-slate-700 group-hover:text-blue-600 transition-colors">{c.name}</span>
                          </td>
                          <td className="py-3 px-2 text-right text-slate-800 font-bold tabular-nums">{formatNumber(c.visitors)}</td>
                          <td className="py-3 pl-2 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                                <div className="h-full rounded-full bg-indigo-500 bar-fill" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="w-8 text-[11px] tabular-nums text-slate-500 font-semibold">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}
        </div>

        {/* ═══════════════════ Devices + Browsers/OS ═══════════════════ */}
        {data.device_types.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <GlassCard anim="anim-slide-up d500">
              <SectionHeader icon={<Smartphone className="w-4 h-4" />} title="Verkeer per Apparaat" iconBg="bg-cyan-50" iconColor="text-cyan-600" />
              <div className="flex flex-col justify-center gap-5">
                {devPcts.map((d, i) => {
                  const ic = d.name.toLowerCase().includes('mobile') || d.name.toLowerCase().includes('mobiel')
                    ? <Smartphone className="w-3.5 h-3.5" />
                    : d.name.toLowerCase().includes('desktop') ? <Monitor className="w-3.5 h-3.5" /> : <Tablet className="w-3.5 h-3.5" />;
                  return <DeviceBar key={d.name} icon={ic} name={d.name} percentage={d.pct} idx={i} />;
                })}
              </div>
            </GlassCard>

            <GlassCard anim="anim-slide-up d600">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center mb-4">
                    <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mr-3 text-sm shadow-sm">
                      <GoogleIcon className="w-4 h-4" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">Browsers</p>
                  </div>
                  <div className="space-y-1.5">
                    {data.browsers.slice(0, 5).map((b) => {
                      const tot = data.browsers.reduce((a, x) => a + x.value, 0);
                      const pct = tot > 0 ? Math.round((b.value / tot) * 100) : 0;
                      return (
                        <div key={b.name} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-2.5">
                            <span className="w-5 flex justify-center">{browserIcon(b.name)}</span>
                            <span className="text-xs font-medium text-slate-600">{b.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-100">
                              <div className="h-full rounded-full bg-purple-400 bar-fill" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs font-bold text-slate-800 w-8 text-right">{pct}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div className="flex items-center mb-4">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center mr-3 text-sm shadow-sm">
                      <Monitor className="w-4 h-4" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">Besturingssystemen</p>
                  </div>
                  <div className="space-y-1.5">
                    {data.operating_systems.slice(0, 5).map((os) => {
                      const tot = data.operating_systems.reduce((a, x) => a + x.value, 0);
                      const pct = tot > 0 ? Math.round((os.value / tot) * 100) : 0;
                      return (
                        <div key={os.name} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-2.5">
                            <span className="w-5 flex justify-center">{osIcon(os.name)}</span>
                            <span className="text-xs font-medium text-slate-600">{os.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-100">
                              <div className="h-full rounded-full bg-slate-400 bar-fill" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs font-bold text-slate-800 w-8 text-right">{pct}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        )}

        {/* ═══════════════════ UTM Campaigns ═══════════════════ */}
        {(data.utm_sources.length > 0 || data.utm_mediums.length > 0 || data.utm_campaigns.length > 0) && (
          <GlassCard className="mb-6" anim="anim-slide-up d400">
            <SectionHeader
              icon={<Megaphone className="w-4 h-4" />} title="Campagnetracking (UTM)" iconBg="bg-emerald-50" iconColor="text-emerald-600"
              action={<TabBar tabs={[{ key: 'sources', label: 'Bronnen' }, { key: 'mediums', label: 'Media' }, { key: 'campaigns', label: 'Campagnes' }]} active={utmTab} onChange={(k) => setUtmTab(k as typeof utmTab)} />}
            />
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-2">{utmTab === 'sources' ? 'Bron' : utmTab === 'mediums' ? 'Medium' : 'Campagne'}</th>
                    <th className="pb-2 text-right">Bezoekers</th>
                    <th className="pb-2 text-right w-32">%</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {utmData.slice(0, 10).map((item) => {
                    const pct = met.visitors > 0 ? Math.round((item.visitors / met.visitors) * 100) : 0;
                    return (
                      <tr key={item.name} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/80 transition-colors cursor-pointer group"
                        onClick={() => {
                          const k = utmTab === 'sources' ? 'utm_source' : utmTab === 'mediums' ? 'utm_medium' : 'utm_campaign';
                          const l = utmTab === 'sources' ? 'UTM Source' : utmTab === 'mediums' ? 'UTM Medium' : 'UTM Campaign';
                          addFilter(k, l, item.name);
                        }}>
                        <td className="py-3 pr-2 font-medium text-slate-700 group-hover:text-blue-600 transition-colors">
                          <span className="inline-flex items-center gap-2">
                            {(() => { const ui = utmIcon(item.name); return <span className={`w-5 h-5 rounded flex items-center justify-center ${ui.bg} ${ui.color}`}>{ui.icon}</span>; })()}
                            {item.name}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right text-slate-800 font-bold tabular-nums">{formatNumber(item.visitors)}</td>
                        <td className="py-3 pl-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                              <div className="h-full rounded-full bg-emerald-500 bar-fill" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="w-8 text-[11px] tabular-nums text-slate-500 font-semibold">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {utmData.length === 0 && <tr><td colSpan={3} className="py-8 text-center text-slate-400">Geen data</td></tr>}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )}
        </>)}

        {/* ═══════════════════ Ads Campaign Detail ═══════════════════ */}
        {showAds && tabCampaigns.length > 0 && (
          <GlassCard className="mb-6" anim="anim-slide-up d300">
            <SectionHeader
              icon={mainTab === 'meta' ? <span className="w-4 h-4"><FacebookIcon /></span> : mainTab === 'google' ? <span className="w-4 h-4"><GoogleIcon /></span> : <Crosshair className="w-4 h-4" />}
              title={mainTab === 'meta' ? 'Meta Ads Campagnes' : mainTab === 'google' ? 'Google Ads Campagnes' : 'Alle Campagnes'}
              iconBg={mainTab === 'meta' ? 'bg-blue-50' : mainTab === 'google' ? 'bg-amber-50' : 'bg-slate-50'}
              iconColor={mainTab === 'meta' ? 'text-blue-600' : mainTab === 'google' ? 'text-amber-600' : 'text-slate-600'}
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
                    const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(1) : '0.0';
                    const cpc = c.clicks > 0 ? (c.cost / c.clicks) : 0;
                    const campResults = c.results || 0;
                    const cpr = campResults > 0 ? (c.cost / campResults) : 0;
                    const statusColor = c.campaign_status === 'ENABLED' || c.campaign_status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : c.campaign_status === 'PAUSED' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500';
                    return (
                      <tr key={`${c.provider}-${c.campaign_id}-${i}`} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 flex-shrink-0">
                              {c.provider === 'meta_ads' ? <FacebookIcon /> : <GoogleIcon />}
                            </span>
                            <span className="text-[13px] font-medium text-slate-700 truncate max-w-[200px]">{c.campaign_name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 pr-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor}`}>
                            {c.campaign_status}
                          </span>
                        </td>
                        <td className="py-2.5 text-right text-[13px] text-slate-600">{formatNumber(c.impressions)}</td>
                        <td className="py-2.5 text-right text-[13px] text-slate-600">{formatNumber(c.clicks)}</td>
                        <td className="py-2.5 text-right text-[13px] text-slate-600">{ctr}%</td>
                        <td className="py-2.5 text-right text-[13px] font-medium text-slate-700">{formatCurrency(c.cost, c.currency)}</td>
                        <td className="py-2.5 text-right text-[13px] text-slate-600">{formatCurrency(cpc, c.currency)}</td>
                        <td className="py-2.5 text-right text-[13px] font-bold text-emerald-600">{formatNumber(campResults)}</td>
                        <td className="py-2.5 text-right text-[13px] font-bold text-slate-800">{campResults > 0 ? formatCurrency(cpr, c.currency) : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )}

        {/* ═══════════════════ Leads (only on Overzicht & Website tabs) ═══════════════════ */}
        {showWebsite && filteredLeads.length > 0 && (
          <>
            {(filteredLeadSources.length > 0 || filteredLeadMediums.length > 0 || filteredLeadCampaigns.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                {filteredLeadSources.length > 0 && (
                  <GlassCard anim="anim-slide-up d400">
                    <SectionHeader icon={<UserPlus className="w-4 h-4" />} title="Leadbronnen" iconBg="bg-orange-50" iconColor="text-orange-600" />
                    <div className="space-y-1.5">{filteredLeadSources.slice(0, 8).map((s) => {
                      const si = sourceIcon(s.source);
                      return (
                        <div key={s.source} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-6 h-6 rounded-md flex items-center justify-center ${si.bg} ${si.color}`}>{si.icon}</div>
                            <span className="text-xs font-medium text-slate-600">{s.source}</span>
                          </div>
                          <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-full">{s.count}</span>
                        </div>
                      );
                    })}</div>
                  </GlassCard>
                )}
                {filteredLeadMediums.length > 0 && (
                  <GlassCard anim="anim-slide-up d500">
                    <SectionHeader icon={<Send className="w-4 h-4" />} title="Lead-media" iconBg="bg-pink-50" iconColor="text-pink-600" />
                    <div className="space-y-1.5">{filteredLeadMediums.slice(0, 8).map((md) => {
                      const mi = utmIcon(md.medium);
                      return (
                        <div key={md.medium} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-6 h-6 rounded-md flex items-center justify-center ${mi.bg} ${mi.color}`}>{mi.icon}</div>
                            <span className="text-xs font-medium text-slate-600">{md.medium}</span>
                          </div>
                          <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-full">{md.count}</span>
                        </div>
                      );
                    })}</div>
                  </GlassCard>
                )}
                {filteredLeadCampaigns.length > 0 && (
                  <GlassCard anim="anim-slide-up d600">
                    <SectionHeader icon={<Megaphone className="w-4 h-4" />} title="Leadcampagnes" iconBg="bg-sky-50" iconColor="text-sky-600" />
                    <div className="space-y-1.5">{filteredLeadCampaigns.slice(0, 8).map((c) => {
                      const ci = utmIcon(c.campaign);
                      return (
                        <div key={c.campaign} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-6 h-6 rounded-md flex items-center justify-center ${ci.bg} ${ci.color}`}>{ci.icon}</div>
                            <span className="text-xs font-medium text-slate-600">{c.campaign}</span>
                          </div>
                          <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-full">{c.count}</span>
                        </div>
                      );
                    })}</div>
                  </GlassCard>
                )}
              </div>
            )}

            {/* Leads table */}
            <GlassCard className="mb-6" anim="anim-slide-up d500">
              <SectionHeader icon={<Users className="w-4 h-4" />} title={`Leads (${filteredLeads.length})`} iconBg="bg-orange-50" iconColor="text-orange-600" />
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="pb-2 pl-2">Naam</th><th className="pb-2">E-mail</th><th className="pb-2">Bron</th>
                      <th className="pb-2">Campagne</th><th className="pb-2">Status</th><th className="pb-2 text-right">Datum</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {filteredLeads.map((lead) => {
                      const srcLbl = lead.utm_source ? [lead.utm_source, lead.utm_medium].filter(Boolean).join(' / ') : lead.referrer_hostname || 'Direct';
                      const sk = (lead.utm_source || lead.referrer_hostname || '').toLowerCase();
                      const srcBdg = sk.includes('google') ? 'bg-blue-50 text-blue-700 border-blue-100'
                        : sk.includes('facebook') || sk.includes('meta') || sk.includes('instagram') ? 'bg-violet-50 text-violet-700 border-violet-100'
                        : sk.includes('linkedin') ? 'bg-sky-50 text-sky-700 border-sky-100' : 'bg-slate-50 text-slate-700 border-slate-100';
                      const stS: Record<string, string> = {
                        new: 'bg-blue-50 text-blue-600 border-blue-100', contacted: 'bg-amber-50 text-amber-600 border-amber-100',
                        qualified: 'bg-purple-50 text-purple-600 border-purple-100', converted: 'bg-emerald-50 text-emerald-600 border-emerald-100',
                        archived: 'bg-slate-100 text-slate-500 border-slate-200',
                      };
                      const ds = new Date(lead.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
                      const isExpanded = expandedLead === lead.id;

                      return (
                        <Fragment key={lead.id}>
                          <tr className="border-b border-slate-50 last:border-0 hover:bg-slate-50/80 transition-colors cursor-pointer group"
                            onClick={() => setExpandedLead(isExpanded ? null : lead.id)}>
                            <td className="py-3 pl-2 font-semibold text-slate-700 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5">
                                <Users className="w-3 h-3 text-slate-400" />
                                {lead.lead_name || <span className="text-slate-400 italic">—</span>}
                              </span>
                            </td>
                            <td className="py-3 text-slate-500 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5">
                                <Mail className="w-3 h-3 text-slate-300" />
                                {lead.lead_email || '—'}
                              </span>
                            </td>
                            <td className="py-3">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold border shadow-sm ${srcBdg}`}>
                                {(() => { const si = sourceIcon(sk || srcLbl); return <span className={si.color}>{si.icon}</span>; })()}
                                {srcLbl}
                              </span>
                            </td>
                            <td className="py-3 text-slate-500">
                              <span className="inline-flex items-center gap-1.5">
                                <Tag className="w-3 h-3 text-slate-300" />
                                {lead.utm_campaign || '—'}
                              </span>
                            </td>
                            <td className="py-3">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold border shadow-sm ${stS[lead.status] || ''}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  lead.status === 'new' ? 'bg-blue-500 animate-pulse' :
                                  lead.status === 'contacted' ? 'bg-amber-500' :
                                  lead.status === 'qualified' ? 'bg-purple-500' :
                                  lead.status === 'converted' ? 'bg-emerald-500' : 'bg-slate-400'
                                }`} />
                                {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
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
                                    {lead.lead_name && <p className="text-xs flex items-center gap-1.5"><Users className="w-3 h-3 text-slate-400" /><span className="text-slate-500">Naam:</span> <span className="font-medium text-slate-700">{lead.lead_name}</span></p>}
                                    {lead.lead_email && <p className="text-xs flex items-center gap-1.5"><Mail className="w-3 h-3 text-slate-400" /><span className="text-slate-500">E-mail:</span> <span className="font-medium text-slate-700">{lead.lead_email}</span></p>}
                                    {lead.lead_phone && <p className="text-xs flex items-center gap-1.5"><Phone className="w-3 h-3 text-slate-400" /><span className="text-slate-500">Tel:</span> <span className="font-medium text-slate-700">{lead.lead_phone}</span></p>}
                                    {lead.lead_company && <p className="text-xs flex items-center gap-1.5"><Building2 className="w-3 h-3 text-slate-400" /><span className="text-slate-500">Bedrijf:</span> <span className="font-medium text-slate-700">{lead.lead_company}</span></p>}
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                      <Target className="w-3 h-3" /> Attributie
                                    </p>
                                    <p className="text-xs flex items-center gap-1.5"><Search className="w-3 h-3 text-slate-400" /><span className="text-slate-500">Bron:</span> <span className="font-medium text-slate-700">{lead.utm_source || lead.referrer_hostname || 'Direct'}</span></p>
                                    {lead.utm_medium && <p className="text-xs flex items-center gap-1.5"><Send className="w-3 h-3 text-slate-400" /><span className="text-slate-500">Medium:</span> <span className="font-medium text-slate-700">{lead.utm_medium}</span></p>}
                                    {lead.utm_campaign && <p className="text-xs flex items-center gap-1.5"><Megaphone className="w-3 h-3 text-slate-400" /><span className="text-slate-500">Campagne:</span> <span className="font-medium text-slate-700">{lead.utm_campaign}</span></p>}
                                    {lead.page_path && <p className="text-xs flex items-center gap-1.5"><FileText className="w-3 h-3 text-slate-400" /><span className="text-slate-500">Pagina:</span> <span className="font-medium text-slate-700">{lead.page_path}</span></p>}
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                      <Globe className="w-3 h-3" /> Context
                                    </p>
                                    {lead.country_code && <p className="text-xs flex items-center gap-1.5"><MapPin className="w-3 h-3 text-slate-400" /><span className="text-slate-500">Locatie:</span> <span className="mr-1">{countryFlag(lead.country_code)}</span><span className="font-medium text-slate-700">{lead.city ? `${lead.city}, ` : ''}{lead.country_code}</span></p>}
                                    {lead.device_type && <p className="text-xs flex items-center gap-1.5"><Smartphone className="w-3 h-3 text-slate-400" /><span className="text-slate-500">Apparaat:</span> <span className="font-medium text-slate-700">{lead.device_type}</span></p>}
                                    {lead.lead_message && (
                                      <div className="mt-2">
                                        <p className="text-slate-500 text-xs">Bericht:</p>
                                        <p className="mt-0.5 rounded-lg bg-white p-2 text-xs whitespace-pre-wrap border border-slate-200">{lead.lead_message}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {lead.lead_data && typeof lead.lead_data === 'object' && Object.keys(lead.lead_data).length > 0 && (
                                  <div className="mt-4 border-t border-slate-200 pt-3">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Alle formulierdata</p>
                                    <div className="rounded-lg border bg-white overflow-hidden">
                                      <table className="w-full text-xs">
                                        <tbody>{Object.entries(lead.lead_data).map(([k, v]) => (
                                          <tr key={k} className="border-b border-slate-100 last:border-0">
                                            <td className="px-3 py-1.5 text-slate-500 font-medium whitespace-nowrap align-top w-1/3">{k}</td>
                                            <td className="px-3 py-1.5 text-slate-700 whitespace-pre-wrap break-words">{v}</td>
                                          </tr>
                                        ))}</tbody>
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
        )}

        {/* ═══════════════════ AI Insights ═══════════════════ */}
        {data.ai_analysis && (
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
            <AIReportCard analysis={data.ai_analysis as any} periodStart={data.date_from} periodEnd={data.date_to} compact />
          </div>
        )}

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
