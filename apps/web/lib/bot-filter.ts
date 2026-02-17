import { isbot } from 'isbot';

// Additional bot patterns not covered by isbot
const ADDITIONAL_BOTS = /headlesschrome|phantomjs|puppeteer|playwright|selenium|webdriver|crawl|index|archive|monitor|check|probe|scan|test/i;

/**
 * Returns true if the user-agent belongs to a bot
 */
export function isBotUA(userAgent: string): boolean {
  if (!userAgent) return true;
  if (isbot(userAgent)) return true;
  if (ADDITIONAL_BOTS.test(userAgent)) return true;
  return false;
}
