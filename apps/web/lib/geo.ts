/**
 * Geo-location lookup
 *
 * Resolution order:
 * 1. Vercel/Cloudflare request headers (free, zero-config on those platforms)
 * 2. MaxMind GeoLite2 .mmdb file (if present — requires download)
 * 3. Returns nulls (geo data simply missing, everything else works)
 */
import { NextRequest } from 'next/server';

export interface GeoData {
  country_code: string | null;
  country_name: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
}

const EMPTY_GEO: GeoData = {
  country_code: null,
  country_name: null,
  region: null,
  city: null,
  latitude: null,
  longitude: null,
};

// ── 1. Platform headers (Vercel / Cloudflare) ─────────────────

/**
 * Extract geo data from platform-injected request headers.
 * Works on Vercel (x-vercel-ip-*) and Cloudflare (cf-ipcountry etc.)
 */
export function geoFromHeaders(request: NextRequest): GeoData | null {
  // Vercel headers
  const vCountry = request.headers.get('x-vercel-ip-country');
  if (vCountry) {
    return {
      country_code: vCountry,
      country_name: null, // Vercel doesn't provide the full name
      region: request.headers.get('x-vercel-ip-country-region'),
      city: request.headers.get('x-vercel-ip-city')
        ? decodeURIComponent(request.headers.get('x-vercel-ip-city')!)
        : null,
      latitude: request.headers.get('x-vercel-ip-latitude')
        ? parseFloat(request.headers.get('x-vercel-ip-latitude')!)
        : null,
      longitude: request.headers.get('x-vercel-ip-longitude')
        ? parseFloat(request.headers.get('x-vercel-ip-longitude')!)
        : null,
    };
  }

  // Cloudflare headers
  const cfCountry = request.headers.get('cf-ipcountry');
  if (cfCountry && cfCountry !== 'XX') {
    return {
      country_code: cfCountry,
      country_name: null,
      region: request.headers.get('cf-region') || null,
      city: request.headers.get('cf-ipcity') || null,
      latitude: request.headers.get('cf-iplat')
        ? parseFloat(request.headers.get('cf-iplat')!)
        : null,
      longitude: request.headers.get('cf-iplon')
        ? parseFloat(request.headers.get('cf-iplon')!)
        : null,
    };
  }

  return null;
}

// ── 2. MaxMind GeoLite2 (optional local DB) ───────────────────

let reader: any = null;
let maxmindFailed = false;

async function getReader() {
  if (reader) return reader;
  if (maxmindFailed) return null;

  try {
    const { Reader } = await import('@maxmind/geoip2-node');
    const fs = await import('fs');
    const path = await import('path');

    const dbPaths = [
      path.join(process.cwd(), 'data', 'GeoLite2-City.mmdb'),
      path.join(process.cwd(), 'GeoLite2-City.mmdb'),
      '/usr/share/GeoIP/GeoLite2-City.mmdb',
    ];

    for (const dbPath of dbPaths) {
      if (fs.existsSync(dbPath)) {
        reader = await Reader.open(dbPath);
        return reader;
      }
    }

    maxmindFailed = true;
    return null;
  } catch {
    maxmindFailed = true;
    return null;
  }
}

async function geoFromMaxmind(ip: string): Promise<GeoData | null> {
  try {
    const r = await getReader();
    if (!r) return null;

    const result = r.city(ip);
    return {
      country_code: result.country?.isoCode || null,
      country_name: result.country?.names?.en || null,
      region: result.subdivisions?.[0]?.names?.en || null,
      city: result.city?.names?.en || null,
      latitude: result.location?.latitude || null,
      longitude: result.location?.longitude || null,
    };
  } catch {
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────

/**
 * Look up geo data for an IP, using platform headers first, then MaxMind.
 * Pass the NextRequest to enable header-based lookup (Vercel/Cloudflare).
 */
export async function geolocate(
  ip: string,
  request?: NextRequest
): Promise<GeoData> {
  if (!ip || ip === '127.0.0.1' || ip === '::1') return { ...EMPTY_GEO };

  // Try platform headers first (free, no config)
  if (request) {
    const fromHeaders = geoFromHeaders(request);
    if (fromHeaders) return fromHeaders;
  }

  // Fall back to MaxMind if available
  const fromMaxmind = await geoFromMaxmind(ip);
  if (fromMaxmind) return fromMaxmind;

  return { ...EMPTY_GEO };
}
