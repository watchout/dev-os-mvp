/**
 * 確信レベル判定ロジック（クライアントサイド版）
 * 
 * governance.yml の定義をハードコードして、ブラウザで動作可能にしたバージョン。
 * サーバーサイド版は confidence-level.ts を使用。
 */

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

// governance.yml の confidence_level_standards を静的に定義
const GOVERNANCE_LEVELS = [
  {
    level: 1,
    label: "漂う開発（バイブス）",
    action: "halt" as const,
    ui_hint: "「不」が「光」を遮っています。SSOTで仕様を整えてください。",
  },
  {
    level: 2,
    label: "不透明な設計",
    action: "warn" as const,
    ui_hint: "確信まであと一歩です。エッジケースを定義しましょう。",
  },
  {
    level: 3,
    label: "確信ある設計",
    action: "allow" as const,
    ui_hint: "弥栄！確かな知恵が整いました。実装を開始します。",
  },
];

/**
 * 確信レベルを評価する（クライアントサイド版）
 */
export function evaluateConfidenceLevel(
  instruction: string,
  ssotContext?: Record<string, unknown>,
): ConfidenceResult {
  const levelInfo = (lvl: ConfidenceLevel) =>
    GOVERNANCE_LEVELS.find((g) => g.level === lvl) ?? GOVERNANCE_LEVELS[0];

  const text = (instruction || "").trim();
  const hasObjective = text.length >= 10;
  const hasConstraints = /制約|条件|エッジケース|validation|バリデーション/i.test(text);
  const hasEdgeCases = /例外|失敗|エラー|fallback|異常系/i.test(text);
  const hasSSOTReference =
    !!(ssotContext && Object.keys(ssotContext).some((k) => ssotContext[k])) ||
    /ssot/i.test(text);

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
    label: info.label,
    action: info.action,
    hints,
    details: {
      hasSSOTReference,
      hasObjective,
      hasConstraints,
      hasEdgeCases,
    },
  };
}

