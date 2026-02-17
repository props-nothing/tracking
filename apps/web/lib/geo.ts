// MaxMind GeoLite2 geo-location lookup
// Requires MAXMIND_LICENSE_KEY and the GeoLite2-City database

export interface GeoData {
  country_code: string | null;
  country_name: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
}

let reader: any = null;

async function getReader() {
  if (reader) return reader;

  try {
    const { Reader } = await import('@maxmind/geoip2-node');
    const fs = await import('fs');
    const path = await import('path');

    // Try common locations for the GeoLite2 database
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

    console.warn('[Geo] GeoLite2-City.mmdb not found. Geo-location disabled.');
    return null;
  } catch (err) {
    console.warn('[Geo] Failed to load MaxMind reader:', err);
    return null;
  }
}

/**
 * Look up geo data for an IP address.
 * Returns null values if the database is not available or IP not found.
 */
export async function geolocate(ip: string): Promise<GeoData> {
  const empty: GeoData = {
    country_code: null,
    country_name: null,
    region: null,
    city: null,
    latitude: null,
    longitude: null,
  };

  if (!ip || ip === '127.0.0.1' || ip === '::1') return empty;

  try {
    const r = await getReader();
    if (!r) return empty;

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
    return empty;
  }
}
