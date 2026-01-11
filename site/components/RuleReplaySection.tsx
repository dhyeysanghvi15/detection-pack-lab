"use client";

import { useState } from "react";

import type { RuleDetail } from "../lib/types";
import { PROFILES, type EnvironmentProfile } from "../lib/profiles";
import ProfileSelector from "./ProfileSelector";
import ReplayPlayer from "./ReplayPlayer";

export default function RuleReplaySection({ rule }: { rule: RuleDetail }) {
  const [profile, setProfile] = useState<EnvironmentProfile>(PROFILES[0]);

  return (
    <div className="grid" style={{ gap: 14 }}>
      <ProfileSelector profiles={PROFILES} value={profile} onChange={setProfile} />
      <ReplayPlayer rule={rule} ruleId={rule.id} caseName="malicious" profile={profile} />
      <ReplayPlayer rule={rule} ruleId={rule.id} caseName="benign" profile={profile} />
    </div>
  );
}

