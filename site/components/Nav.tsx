"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

const tabs = [
  { href: "/", label: "Dashboard" },
  { href: "/rules", label: "Rule Explorer" },
  { href: "/coverage", label: "ATT&CK Coverage" },
  { href: "/stories", label: "Story Mode" },
  { href: "/health", label: "Pack Health" },
  { href: "/noise", label: "Noise Lab" },
  { href: "/schema", label: "Schema Analyzer" }
];

export default function Nav() {
  const pathname = usePathname();
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const logicalPath =
    base && pathname.startsWith(base) ? pathname.slice(base.length) || "/" : pathname;

  return (
    <div style={{ position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(12px)" }}>
      <div
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(7,10,16,0.65)",
        }}
      >
        <div className="container" style={{ paddingTop: 14, paddingBottom: 14 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div
                className="card"
                style={{
                  padding: "8px 10px",
                  borderRadius: 12,
                  background:
                    "linear-gradient(135deg, rgba(124,58,237,0.24), rgba(34,211,238,0.10))",
                }}
              >
                <span style={{ fontWeight: 650, letterSpacing: "-0.02em" }}>Detection Pack Lab</span>
              </div>
              <span className="pill">
                CI-verified • offline • artifacts-driven
              </span>
            </div>

            <div className="row" style={{ gap: 10 }}>
              {tabs.map((t) => {
                const active = logicalPath === t.href;
                return (
                  <Link key={t.href} href={t.href} className="pill" style={{ position: "relative" }}>
                    {active && (
                      <motion.span
                        layoutId="activeTab"
                        style={{
                          position: "absolute",
                          inset: 0,
                          borderRadius: 999,
                          border: "1px solid rgba(34,211,238,0.42)",
                          background: "rgba(34,211,238,0.08)",
                        }}
                        transition={{ type: "spring", stiffness: 450, damping: 34 }}
                      />
                    )}
                    <span style={{ position: "relative" }}>{t.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
