import { UAParser } from 'ua-parser-js';

export interface ParsedUA {
  browser: string | null;
  browser_version: string | null;
  os: string | null;
  os_version: string | null;
  device_type: 'desktop' | 'mobile' | 'tablet' | null;
}

export function parseUserAgent(ua: string): ParsedUA {
  const parser = new UAParser(ua);
  const browser = parser.getBrowser();
  const os = parser.getOS();
  const device = parser.getDevice();

  let deviceType: 'desktop' | 'mobile' | 'tablet' | null = null;
  if (device.type === 'mobile') deviceType = 'mobile';
  else if (device.type === 'tablet') deviceType = 'tablet';
  else deviceType = 'desktop'; // Default to desktop if no device type detected

  return {
    browser: browser.name || null,
    browser_version: browser.version || null,
    os: os.name || null,
    os_version: os.version || null,
    device_type: deviceType,
  };
}
