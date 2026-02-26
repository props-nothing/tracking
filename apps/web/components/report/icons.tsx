import React from "react";
import {
  UserCheck,
  Hash,
  ExternalLink,
  Mail,
  MousePointer,
  Search,
  Link2,
  Compass,
  Globe,
  Smartphone,
  Monitor,
  Chrome,
  Megaphone,
  Target,
} from "lucide-react";

export function GoogleIcon({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09A6.97 6.97 0 0 1 5.48 12c0-.72.13-1.43.36-2.09V7.07H2.18A11.96 11.96 0 0 0 0 12c0 1.93.46 3.77 1.28 5.4l3.56-2.77.01-.54z"
        fill="#FBBC05"
      />
      <path
        d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.09 14.97 0 12 0 7.7 0 3.99 2.47 2.18 6.07l3.66 2.84c.87-2.6 3.3-4.16 6.16-4.16z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function FacebookIcon({
  className = "w-3 h-3",
}: {
  className?: string;
}) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.025 4.388 11.022 10.125 11.927v-8.437H7.078v-3.49h3.047V9.41c0-3.026 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.971H15.83c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796v8.437C19.612 23.095 24 18.098 24 12.073z" />
    </svg>
  );
}

export function InstagramIcon({
  className = "w-3 h-3",
}: {
  className?: string;
}) {
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
      <path
        fill="url(#ig-grad)"
        d="M12 2.163c3.204 0 3.584.012 4.85.07 1.17.054 1.97.24 2.43.403a4.088 4.088 0 0 1 1.518.988c.464.464.8.952.987 1.518.164.46.35 1.26.404 2.43.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.054 1.17-.24 1.97-.404 2.43a4.088 4.088 0 0 1-.987 1.518 4.088 4.088 0 0 1-1.518.987c-.46.164-1.26.35-2.43.404-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.17-.054-1.97-.24-2.43-.404a4.088 4.088 0 0 1-1.518-.987 4.088 4.088 0 0 1-.987-1.518c-.164-.46-.35-1.26-.404-2.43C2.175 15.584 2.163 15.204 2.163 12s.012-3.584.07-4.85c.054-1.17.24-1.97.404-2.43A4.088 4.088 0 0 1 3.624 3.2a4.088 4.088 0 0 1 1.518-.988c.46-.164 1.26-.35 2.43-.404C8.838 1.75 9.218 1.738 12 1.738V2.163zM12 0C8.741 0 8.333.014 7.053.072 5.775.13 4.902.333 4.14.63a5.876 5.876 0 0 0-2.126 1.384A5.876 5.876 0 0 0 .63 4.14C.333 4.902.13 5.775.072 7.053.014 8.333 0 8.741 0 12s.014 3.668.072 4.948c.058 1.277.261 2.15.558 2.913a5.876 5.876 0 0 0 1.384 2.126A5.876 5.876 0 0 0 4.14 23.37c.763.297 1.636.5 2.913.558C8.333 23.986 8.741 24 12 24s3.668-.014 4.948-.072c1.277-.058 2.15-.261 2.913-.558a5.876 5.876 0 0 0 2.126-1.384 5.876 5.876 0 0 0 1.384-2.126c.297-.763.5-1.636.558-2.913.058-1.28.072-1.688.072-4.948s-.014-3.668-.072-4.948c-.058-1.277-.261-2.15-.558-2.913a5.876 5.876 0 0 0-1.384-2.126A5.876 5.876 0 0 0 19.86.63C19.098.333 18.225.13 16.948.072 15.668.014 15.26 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"
      />
    </svg>
  );
}

/** Return a contextual icon + color for a referrer source */
export function sourceIcon(source: string): {
  icon: React.ReactNode;
  color: string;
  bg: string;
} {
  const s = source.toLowerCase();
  if (s.includes("google"))
    return {
      icon: <GoogleIcon className="w-3.5 h-3.5" />,
      color: "text-blue-600",
      bg: "bg-white",
    };
  if (s.includes("facebook") || s.includes("meta") || /\bfb\b/.test(s))
    return {
      icon: <FacebookIcon className="w-3.5 h-3.5" />,
      color: "text-blue-600",
      bg: "bg-blue-50",
    };
  if (s.includes("instagram"))
    return {
      icon: <InstagramIcon className="w-3.5 h-3.5" />,
      color: "text-pink-600",
      bg: "bg-pink-50",
    };
  if (s.includes("linkedin"))
    return {
      icon: <UserCheck className="w-3 h-3" />,
      color: "text-sky-600",
      bg: "bg-sky-50",
    };
  if (s.includes("twitter") || s.includes("x.com"))
    return {
      icon: <Hash className="w-3 h-3" />,
      color: "text-slate-700",
      bg: "bg-slate-100",
    };
  if (s.includes("youtube"))
    return {
      icon: <ExternalLink className="w-3 h-3" />,
      color: "text-red-600",
      bg: "bg-red-50",
    };
  if (s.includes("tiktok"))
    return {
      icon: <Hash className="w-3 h-3" />,
      color: "text-fuchsia-600",
      bg: "bg-fuchsia-50",
    };
  if (s.includes("mail") || s.includes("newsletter") || s.includes("email"))
    return {
      icon: <Mail className="w-3 h-3" />,
      color: "text-amber-600",
      bg: "bg-amber-50",
    };
  if (s.includes("direct") || s === "(direct)")
    return {
      icon: <MousePointer className="w-3 h-3" />,
      color: "text-slate-500",
      bg: "bg-slate-100",
    };
  if (s.includes("bing"))
    return {
      icon: <Search className="w-3 h-3" />,
      color: "text-teal-600",
      bg: "bg-teal-50",
    };
  return {
    icon: <Link2 className="w-3 h-3" />,
    color: "text-blue-500",
    bg: "bg-blue-50",
  };
}

/** Return an icon for a browser name */
export function browserIcon(name: string): React.ReactNode {
  const n = name.toLowerCase();
  if (n.includes("chrome")) return <GoogleIcon className="w-3.5 h-3.5" />;
  if (n.includes("safari"))
    return <Compass className="w-3.5 h-3.5 text-sky-500" />;
  if (n.includes("firefox"))
    return <Globe className="w-3.5 h-3.5 text-orange-500" />;
  if (n.includes("edge"))
    return <Globe className="w-3.5 h-3.5 text-blue-600" />;
  if (n.includes("opera"))
    return <Globe className="w-3.5 h-3.5 text-red-500" />;
  if (n.includes("samsung"))
    return <Smartphone className="w-3.5 h-3.5 text-violet-500" />;
  return <Globe className="w-3.5 h-3.5 text-slate-400" />;
}

/** Return an icon for an OS name */
export function osIcon(name: string): React.ReactNode {
  const n = name.toLowerCase();
  if (n.includes("windows"))
    return <Monitor className="w-3.5 h-3.5 text-blue-500" />;
  if (n.includes("mac") || n.includes("ios"))
    return <Smartphone className="w-3.5 h-3.5 text-slate-700" />;
  if (n.includes("android"))
    return <Smartphone className="w-3.5 h-3.5 text-emerald-500" />;
  if (n.includes("linux"))
    return <Monitor className="w-3.5 h-3.5 text-amber-600" />;
  if (n.includes("chrome"))
    return <Chrome className="w-3.5 h-3.5 text-blue-500" />;
  return <Monitor className="w-3.5 h-3.5 text-slate-400" />;
}

/** Return an icon for a UTM source/medium/campaign name */
export function utmIcon(name: string): {
  icon: React.ReactNode;
  color: string;
  bg: string;
} {
  const n = name.toLowerCase();
  if (n.includes("google"))
    return {
      icon: <GoogleIcon className="w-3.5 h-3.5" />,
      color: "text-blue-600",
      bg: "bg-white",
    };
  if (n.includes("facebook") || n.includes("meta") || /\bfb\b/.test(n))
    return {
      icon: <FacebookIcon className="w-3.5 h-3.5" />,
      color: "text-blue-600",
      bg: "bg-blue-50",
    };
  if (n.includes("instagram"))
    return {
      icon: <InstagramIcon className="w-3.5 h-3.5" />,
      color: "text-pink-600",
      bg: "bg-pink-50",
    };
  if (n.includes("email") || n.includes("mail") || n.includes("newsletter"))
    return {
      icon: <Mail className="w-3 h-3" />,
      color: "text-amber-600",
      bg: "bg-amber-50",
    };
  if (n.includes("linkedin"))
    return {
      icon: <UserCheck className="w-3 h-3" />,
      color: "text-sky-600",
      bg: "bg-sky-50",
    };
  if (n.includes("cpc") || n.includes("paid") || n.includes("ad"))
    return {
      icon: <Megaphone className="w-3 h-3" />,
      color: "text-orange-600",
      bg: "bg-orange-50",
    };
  if (n.includes("social"))
    return {
      icon: <Hash className="w-3 h-3" />,
      color: "text-pink-600",
      bg: "bg-pink-50",
    };
  if (n.includes("organic"))
    return {
      icon: <Search className="w-3 h-3" />,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    };
  if (n.includes("referral"))
    return {
      icon: <Link2 className="w-3 h-3" />,
      color: "text-cyan-600",
      bg: "bg-cyan-50",
    };
  if (n.includes("direct"))
    return {
      icon: <MousePointer className="w-3 h-3" />,
      color: "text-slate-500",
      bg: "bg-slate-100",
    };
  return {
    icon: <Target className="w-3 h-3" />,
    color: "text-slate-600",
    bg: "bg-slate-100",
  };
}
