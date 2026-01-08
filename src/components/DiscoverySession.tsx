"use client";

import { useState } from "react";
import { type ReactNode } from "react";

type ExpertMessage = {
  role: "market_analyst" | "strategy_designer" | "brand_guardian" | "user";
  content: string;
  status: "thinking" | "completed" | "error";
};

type ExpertInfo = {
  id: "market_analyst" | "strategy_designer" | "brand_guardian";
  name: string;
  label: string;
  icon: string;
  color: string;
  description: string;
};

const EXPERTS: ExpertInfo[] = [
  {
    id: "market_analyst",
    name: "Market Analyst",
    label: "市場・潮流・データ解析",
    icon: "📊",
    color: "text-blue-600",
    description: "事実、統計、トレンド、競合環境を客観的に分析します。",
  },
  {
    id: "strategy_designer",
    name: "Strategy Designer",
    label: "戦略・心理・成長設計",
    icon: "🧠",
    color: "text-purple-600",
    description: "ユーザーの深層心理に基づき、勝てる戦略と成長循環を設計します。",
  },
  {
    id: "brand_guardian",
    name: "Brand Guardian",
    label: "物語・品格・監査",
    icon: "🛡️",
    color: "text-amber-600",
    description: "戦略に体温（物語）を込め、ブランドの誠実さを監査します。",
  },
];

export function DiscoverySession() {
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState<ExpertMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startDiscovery = async () => {
    if (!userInput.trim()) return;

    setIsProcessing(true);
    setError(null);
    setMessages([
      { role: "user", content: userInput, status: "completed" },
      { role: "market_analyst", content: "市場の声を聴いています...", status: "thinking" },
    ]);

    try {
      // 実際には workflows/run/kickoff_discovery を呼び出す
      const res = await fetch("/api/workflows/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId: "kickoff_discovery",
          mode: "balanced",
          payload: { 
            rough_concept: userInput,
            field_voices: userInput 
          },
        }),
      });

      if (!res.ok) {
        throw new Error("Discovery Session の起動に失敗しました。");
      }

      const data = await res.json();
      const result = data.data;

      // 各ステップの結果をメッセージに反映
      const newMessages: ExpertMessage[] = [
        { role: "user", content: userInput, status: "completed" },
      ];

      result.steps.forEach((step: any) => {
        if (step.role === "market_analyst") {
          newMessages.push({ role: "market_analyst", content: step.output || "分析完了", status: "completed" });
        } else if (step.role === "strategy_designer") {
          newMessages.push({ role: "strategy_designer", content: step.output || "戦略設計完了", status: "completed" });
        } else if (step.role === "brand_guardian") {
          newMessages.push({ role: "brand_guardian", content: step.output || "ブランド監査完了", status: "completed" });
        }
      });

      setMessages(newMessages);
    } catch (e: any) {
      setError(e.message || "エラーが発生しました。");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* イントロダクション */}
      <section className="rounded-lg border bg-gradient-to-br from-indigo-50 to-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-zinc-900">知恵の深掘り (Discovery Session)</h2>
        <p className="mt-2 text-sm text-zinc-600">
          あなたのあやふやなアイデアや、現場で感じた「不」を教えてください。
          IYASAKA の 3 人の専門家が、それを「確信」へと変えるための戦略 SSOT を練り上げます。
        </p>

        <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
          {EXPERTS.map((expert) => (
            <div key={expert.id} className="min-w-[200px] rounded-md border bg-white p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-xl">{expert.icon}</span>
                <span className={`text-sm font-bold ${expert.color}`}>{expert.name}</span>
              </div>
              <p className="mt-1 text-xs font-medium text-zinc-500">{expert.label}</p>
              <p className="mt-2 text-[10px] leading-relaxed text-zinc-400">{expert.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 入力エリア */}
      <section className="rounded-lg border bg-white p-6 shadow-sm">
        <label className="block text-sm font-bold text-zinc-700">
          あなたの想い・現場の「不」を教えてください
        </label>
        <textarea
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="例: ホテルのフロントが忙しすぎて、お客様一人ひとりと向き合う余裕がない。もっと温かいおもてなしができるようにしたい。"
          className="mt-2 w-full rounded-md border-zinc-300 p-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          rows={4}
          disabled={isProcessing}
        />
        <div className="mt-4 flex justify-end">
          <button
            onClick={startDiscovery}
            disabled={isProcessing || !userInput.trim()}
            className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-6 py-2 text-sm font-bold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-indigo-300"
          >
            {isProcessing ? "3極が議論中..." : "深掘りを開始する"}
            {!isProcessing && <span>🚀</span>}
          </button>
        </div>
      </section>

      {/* 議論の可視化 */}
      {messages.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Discussion Process</h3>
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-4 p-4 rounded-lg border shadow-sm transition-all duration-500 ${
                msg.role === "user" ? "bg-zinc-50 border-zinc-200" : "bg-white border-indigo-100"
              } ${msg.status === "thinking" ? "animate-pulse" : ""}`}
            >
              <div className="flex-shrink-0">
                {msg.role === "user" ? (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-200 text-xl">👤</div>
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-2xl">
                    {EXPERTS.find(e => e.id === msg.role)?.icon}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-400">
                    {msg.role === "user" ? "You" : EXPERTS.find(e => e.id === msg.role)?.name}
                  </span>
                  {msg.status === "thinking" && (
                    <span className="text-[10px] text-indigo-500 font-bold animate-bounce">THINKING...</span>
                  )}
                </div>
                <div className="mt-1 text-sm text-zinc-800 whitespace-pre-wrap leading-relaxed">
                  {msg.content}
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      {error && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <p className="text-sm text-red-600 font-medium">⚠️ {error}</p>
        </div>
      )}
    </div>
  );
}

