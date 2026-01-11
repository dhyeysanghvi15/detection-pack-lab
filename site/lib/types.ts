export type RuleStatus = "passing" | "failing" | "experimental";
export type RuleSeverity = "low" | "medium" | "high" | "critical";

export type Meta = {
  generated_at: string;
  commit: string;
  run_id: string;
  rules_total: number;
  rules_passing: number;
  rules_failing: number;
};

export type RuleIndexItem = {
  id: string;
  name: string;
  description: string;
  logsource: string;
  tactic: string;
  techniques: string[];
  severity: RuleSeverity;
  status: RuleStatus;
  confidence: number;
  noise_risk: number;
  quality_score: number;
};

export type RulesIndex = { rules: RuleIndexItem[] };

export type Results = {
  summary: {
    pass_rate: number;
    avg_time_to_detect_ms: number;
    events_total: number;
    alerts_expected: number;
    alerts_actual: number;
  };
  by_rule: Record<
    string,
    {
      tests: Array<{
        case: "benign" | "malicious";
        events: number;
        expected_alerts: number;
        actual_alerts: number;
        time_to_detect_ms: number;
        passed: boolean;
        why: {
          matched_fields: Array<{ field: string; value: string }>;
          failed_clause: string | null;
          missing_fields: string[];
        };
      }>;
      false_positive_notes: string[];
      tuning_knobs: Array<{ name: string; description: string; default: string | number }>;
    }
  >;
};

export type Coverage = {
  tactics: string[];
  techniques: Array<{
    technique: string;
    name: string;
    tactic: string;
    rules: string[];
    status_breakdown: { passing: number; failing: number; experimental: number };
  }>;
};

export type RuleDetail = {
  id: string;
  title: string;
  name?: string;
  description: string;
  sigma_path: string;
  elastic_path: string;
  sigma_text: string;
  elastic_text: string;
  elastic_kql?: string;
  elastic_esql?: string;
  logsource: string;
  tags: string[];
  tactic: string;
  techniques: string[];
  severity: RuleSeverity;
  status: RuleStatus;
  confidence: number;
  noise_risk: number;
  quality_score: number;
  fields_used?: string[];
  false_positive_notes?: string[];
  tuning_knobs?: Array<{ name: string; description: string; default: string | number }>;
  score_breakdown?: Record<string, any>;
  compiled?: {
    condition: string;
    selections: Record<
      string,
      Array<{
        field: string;
        op:
          | "eq"
          | "contains"
          | "startswith"
          | "endswith"
          | "re"
          | "gt"
          | "gte"
          | "lt"
          | "lte";
        values: any[];
      }>
    >;
  };
  validation?: {
    tests: Results["by_rule"][string]["tests"];
    summary?: { alerts_expected: number; alerts_actual: number };
  };
};
