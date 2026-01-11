export type EnvironmentProfile = {
  id: string;
  name: string;
  description: string;
  allowlistPrincipals: string[];
  allowlistIpPrefixes: string[];
};

export const PROFILES: EnvironmentProfile[] = [
  {
    id: "default",
    name: "Default (Lab)",
    description: "No suppression. Pure rule behavior on the demo datasets.",
    allowlistPrincipals: [],
    allowlistIpPrefixes: [],
  },
  {
    id: "corp-automation",
    name: "Corp + Automation",
    description: "Suppress known automation/admin identities commonly responsible for benign triggers.",
    allowlistPrincipals: ["ApprovedAutomationRole", "SYSTEM", "CONTOSO\\\\admin", "admin@contoso.example"],
    allowlistIpPrefixes: ["203.0.113."],
  },
  {
    id: "strict-eu",
    name: "Strict (EU-only egress)",
    description: "Suppress corporate egress ranges (demo) and emphasize anomalies from unknown IP space.",
    allowlistPrincipals: ["ApprovedAutomationRole"],
    allowlistIpPrefixes: ["203.0.113."],
  },
];

function getPrincipal(event: Record<string, any>): string | null {
  const candidates = [
    event?.userIdentity?.userName,
    event?.userIdentity?.sessionContext?.sessionIssuer?.userName,
    event?.userPrincipalName,
    event?.initiatedBy?.user?.userPrincipalName,
    event?.actor?.alternateId,
    event?.User,
    event?.SubjectUserName,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c;
  }
  return null;
}

function getIp(event: Record<string, any>): string | null {
  const candidates = [event?.sourceIPAddress, event?.client?.ipAddress, event?.IpAddress, event?.ipAddress];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c;
  }
  return null;
}

export function isSuppressedByProfile(profile: EnvironmentProfile, event: Record<string, any>) {
  const principal = getPrincipal(event);
  if (principal && profile.allowlistPrincipals.some((a) => principal === a)) return true;
  const ip = getIp(event);
  if (ip && profile.allowlistIpPrefixes.some((p) => ip.startsWith(p))) return true;
  return false;
}

