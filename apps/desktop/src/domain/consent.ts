const KEY = 'bs_research';
export function readResearchConsent(): boolean {
  try {
    return document.cookie.split(';').some(value => value.trim() === `${KEY}=on`) || sessionStorage.getItem(KEY) === 'on';
  } catch { return false; }
}

export function storeResearchConsent(enabled: boolean): void {
  try {
    document.cookie = `${KEY}=${enabled ? 'on' : ''}; Max-Age=${enabled ? 2_592_000 : 0}; Path=/; SameSite=Strict${location.protocol === 'https:' ? '; Secure' : ''}`;
    if (enabled && !document.cookie.split(';').some(value => value.trim() === `${KEY}=on`)) sessionStorage.setItem(KEY, 'on');
    else sessionStorage.removeItem(KEY);
  } catch {
    try { if (enabled) sessionStorage.setItem(KEY, 'on'); else sessionStorage.removeItem(KEY); } catch { /* Consent remains limited to this app session. */ }
  }
}
