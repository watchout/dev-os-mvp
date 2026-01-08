import { describe, it, expect } from "vitest";
import { evaluateConfidenceLevel, type ConfidenceLevel } from "./confidence-level-client";

describe("evaluateConfidenceLevel", () => {
  describe("Level 1 (halt)", () => {
    it("should return Level 1 when instruction is empty", () => {
      const result = evaluateConfidenceLevel("", {});
      expect(result.level).toBe(1);
      expect(result.action).toBe("halt");
      expect(result.label).toBe("漂う開発（バイブス）");
    });

    it("should return Level 1 when instruction is too short", () => {
      const result = evaluateConfidenceLevel("短い", {});
      expect(result.level).toBe(1);
      expect(result.action).toBe("halt");
    });

    it("should return Level 1 when no SSOT reference", () => {
      const result = evaluateConfidenceLevel(
        "ユーザー登録機能を実装する。メールアドレスとパスワードでの登録を行う。",
        {}
      );
      expect(result.level).toBe(1);
      expect(result.action).toBe("halt");
      expect(result.details.hasSSOTReference).toBe(false);
    });

    it("should provide improvement hints for Level 1", () => {
      const result = evaluateConfidenceLevel("短い", {});
      expect(result.hints.length).toBeGreaterThan(0);
      expect(result.hints.some((h) => h.includes("SSOT"))).toBe(true);
    });
  });

  describe("Level 2 (warn)", () => {
    it("should return Level 2 when SSOT is referenced but constraints are missing", () => {
      const result = evaluateConfidenceLevel(
        "ユーザー登録機能を実装する。SSOT/platform.yml のユーザーエンティティ定義に従う。",
        {}
      );
      expect(result.level).toBe(2);
      expect(result.action).toBe("warn");
      expect(result.label).toBe("不透明な設計");
    });

    it("should return Level 2 when ssotContext is provided but no constraints", () => {
      const result = evaluateConfidenceLevel(
        "ユーザー登録機能を実装する。メールアドレスとパスワードでの登録を行う。",
        { platform: "some ssot content" }
      );
      expect(result.level).toBe(2);
      expect(result.action).toBe("warn");
    });

    it("should provide improvement hints for Level 2", () => {
      const result = evaluateConfidenceLevel(
        "機能を実装する。SSOT に従う。",
        {}
      );
      expect(result.hints.some((h) => h.includes("制約条件") || h.includes("エッジケース"))).toBe(true);
    });
  });

  describe("Level 3 (allow)", () => {
    it("should return Level 3 when all conditions are met", () => {
      const result = evaluateConfidenceLevel(
        "ユーザー登録機能を実装する。SSOT/platform.yml のユーザーエンティティ定義に従う。バリデーションエラー時は400を返す。制約条件として空文字は不可。",
        {}
      );
      expect(result.level).toBe(3);
      expect(result.action).toBe("allow");
      expect(result.label).toBe("確信ある設計");
    });

    it("should return Level 3 when constraints and edge cases are mentioned", () => {
      const result = evaluateConfidenceLevel(
        "ユーザー登録機能。ssot 参照。エラー時の fallback 処理を含む。制約条件を満たす。",
        {}
      );
      expect(result.level).toBe(3);
      expect(result.action).toBe("allow");
    });

    it("should have positive hint for Level 3", () => {
      const result = evaluateConfidenceLevel(
        "完全な仕様。SSOT参照。制約条件あり。例外処理も定義済み。",
        {}
      );
      expect(result.hints.some((h) => h.includes("弥栄"))).toBe(true);
    });
  });

  describe("details object", () => {
    it("should correctly identify hasObjective", () => {
      const shortResult = evaluateConfidenceLevel("短い", {});
      expect(shortResult.details.hasObjective).toBe(false);

      const longResult = evaluateConfidenceLevel("十分な長さの指示文です。", {});
      expect(longResult.details.hasObjective).toBe(true);
    });

    it("should correctly identify hasSSOTReference", () => {
      const withSSOT = evaluateConfidenceLevel("SSOT に基づいて実装する。", {});
      expect(withSSOT.details.hasSSOTReference).toBe(true);

      const withContext = evaluateConfidenceLevel("何かを実装する。", { ssot: "content" });
      expect(withContext.details.hasSSOTReference).toBe(true);
    });

    it("should correctly identify hasConstraints", () => {
      const withConstraints = evaluateConfidenceLevel("バリデーション条件を含む。", {});
      expect(withConstraints.details.hasConstraints).toBe(true);

      const withoutConstraints = evaluateConfidenceLevel("何かを実装する。", {});
      expect(withoutConstraints.details.hasConstraints).toBe(false);
    });

    it("should correctly identify hasEdgeCases", () => {
      const withEdgeCases = evaluateConfidenceLevel("エラー時の処理を含む。", {});
      expect(withEdgeCases.details.hasEdgeCases).toBe(true);

      const withFallback = evaluateConfidenceLevel("fallback 処理を実装。", {});
      expect(withFallback.details.hasEdgeCases).toBe(true);
    });
  });
});

