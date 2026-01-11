"use client";

import type { EnvironmentProfile } from "../lib/profiles";

export default function ProfileSelector({
  profiles,
  value,
  onChange,
}: {
  profiles: EnvironmentProfile[];
  value: EnvironmentProfile;
  onChange: (p: EnvironmentProfile) => void;
}) {
  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="pill">environment profile</div>
          <p className="muted" style={{ margin: "10px 0 0 0" }}>
            Profiles simulate environment-specific suppressions/allowlists client-side (no backend).
          </p>
        </div>
        <select
          className="input"
          style={{ width: 260 }}
          value={value.id}
          onChange={(e) => {
            const next = profiles.find((p) => p.id === e.target.value);
            if (next) onChange(next);
          }}
        >
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div className="pill" style={{ marginTop: 10 }}>
        {value.description}
      </div>
    </div>
  );
}

