import fs from "node:fs";
import path from "node:path";
import yaml from "yaml";

export type ConfidenceLevel = 1 | 2 | 3;

export type ConfidenceResult = {
  level: ConfidenceLevel;
  label: string;
  action: "halt" | "warn" | "allow";
  hints: string[];
  details: {
    hasSSOTReference: boolean;
    hasObjective: boolean;
    hasConstraints: boolean;
    hasEdgeCases: boolean;
  };
};

type GovernanceConfidence = {
  level: number;
  label: string;
  action: "halt" | "warn" | "allow";
  ui_hint?: string;
};

function loadGovernanceConfidence(): GovernanceConfidence[] {
  try {
    const govPath = path.resolve(process.cwd(), "ssot", "governance.yml");
    const raw = fs.readFileSync(govPath, "utf-8");
    const parsed = yaml.parse(raw) as any;
    return parsed?.governance?.confidence_level_standards ?? [];
  } catch {
    return [];
  }
}

// 簡易ヒューリスティック判定（Phase 2 初期版）
export async function evaluateConfidenceLevel(
  instruction: string,
  ssotContext?: Record<string, unknown>,
): Promise<ConfidenceResult> {
  const governanceLevels = loadGovernanceConfidence();
  const levelInfo = (lvl: ConfidenceLevel) =>
    governanceLevels.find((g) => g.level === lvl) ?? {
      level: lvl,
      label: `Level ${lvl}`,
      action: lvl === 1 ? "halt" : lvl === 2 ? "warn" : "allow",
      ui_hint: "",
    };

  const text = (instruction || "").trim();
  const hasObjective = text.length >= 10;
  const hasConstraints = /制約|条件|エッジケース|validation|バリデーション/i.test(text);
  const hasEdgeCases = /例外|失敗|エラー|fallback|異常系/i.test(text);
  const hasSSOTReference = !!(ssotContext && Object.keys(ssotContext).length > 0) || /ssot/i.test(text);

  let level: ConfidenceLevel = 3;
  if (!hasObjective || text.length < 10) {
    level = 1;
  } else if (!hasSSOTReference) {
    level = 1;
  } else if (!hasConstraints || !hasEdgeCases) {
    level = 2;
  }

  const info = levelInfo(level);
  const hints: string[] = [];
  if (level === 1) {
    hints.push("目的を具体的に記述してください（何を、いつまでに、誰が、どの粒度で）。");
    hints.push("関連するSSOTを引用または貼り付けてください（仕様の根拠を示す）。");
    if (info.ui_hint) hints.push(info.ui_hint);
  } else if (level === 2) {
    hints.push("制約条件・エッジケース（異常系）を列挙してください。");
    hints.push("入力/出力の型や境界値を具体化してください。");
    if (info.ui_hint) hints.push(info.ui_hint);
  } else {
    if (info.ui_hint) hints.push(info.ui_hint);
  }

  return {
    level,
    label: info.label || `Level ${level}`,
    action: info.action || (level === 1 ? "halt" : level === 2 ? "warn" : "allow"),
    hints,
    details: {
      hasSSOTReference,
      hasObjective,
      hasConstraints,
      hasEdgeCases,
    },
  };
}

