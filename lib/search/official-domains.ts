export const OFFICIAL_DOMAINS = [
  "flk.npc.gov.cn",
  "npc.gov.cn",
  "gov.cn",
  "court.gov.cn",
  "spp.gov.cn",
  "moj.gov.cn",
  "chinacourt.org",
];

export function isOfficialUrl(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol !== "http:" && protocol !== "https:") return false;
    return OFFICIAL_DOMAINS.some((d) => hostname === d || hostname.endsWith(`.${d}`));
  } catch {
    return false;
  }
}
