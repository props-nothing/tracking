'use client';

import { useState } from 'react';

export type Period = 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'last_90_days' | 'last_365_days' | 'custom';

export function useDateRange() {
  const [period, setPeriod] = useState<Period>('last_30_days');
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');

  return { period, setPeriod, customFrom, setCustomFrom, customTo, setCustomTo };
}
