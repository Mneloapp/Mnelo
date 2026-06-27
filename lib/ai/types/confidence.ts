export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";

export type Confidence = {
  level: ConfidenceLevel;
  score: number | null;
  reason: string;
};

export const CONFIDENCE = {
  HIGH: "HIGH",
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  UNKNOWN: "UNKNOWN",
} as const satisfies Record<ConfidenceLevel, ConfidenceLevel>;

export function createConfidence(score: number | null, reason: string): Confidence {
  if (score === null) {
    return { level: "UNKNOWN", reason, score };
  }

  if (score >= 0.95) {
    return { level: "HIGH", reason, score };
  }

  if (score >= 0.8) {
    return { level: "MEDIUM", reason, score };
  }

  return { level: "LOW", reason, score };
}
