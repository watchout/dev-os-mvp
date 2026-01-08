"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { yaml } from "@codemirror/lang-yaml";
import { oneDark } from "@codemirror/theme-one-dark";
import { diffLines } from "diff";

type Props = {
  filename: string;
  initialContent: string;
  onSave?: (content: string) => Promise<void>;
};

export function SSOTEditor({ filename, initialContent, onSave }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  
  const [content, setContent] = useState(initialContent);
  const [originalContent] = useState(initialContent);
  const [isValid, setIsValid] = useState(true);
  const [parseError, setParseError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(false);

  // YAMLバリデーション
  const validateYAML = useCallback((text: string) => {
    try {
      // 動的インポートでyamlをロード（クライアント側）
      import("yaml").then((yamlModule) => {
        try {
          yamlModule.parse(text);
          setIsValid(true);
          setParseError(null);
        } catch (e: any) {
          setIsValid(false);
          setParseError(e?.message || "YAML parse error");
        }
      });
    } catch {
      // フォールバック
      setIsValid(true);
      setParseError(null);
    }
  }, []);

  // エディタ初期化
  useEffect(() => {
    if (!editorRef.current) return;

    const state = EditorState.create({
      doc: initialContent,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        yaml(),
        oneDark,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newContent = update.state.doc.toString();
            setContent(newContent);
            validateYAML(newContent);
          }
        }),
        EditorView.theme({
          "&": {
            height: "100%",
            fontSize: "14px",
          },
          ".cm-scroller": {
            overflow: "auto",
          },
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;
    validateYAML(initialContent);

    return () => {
      view.destroy();
    };
  }, [initialContent, validateYAML]);

  // 保存
  const handleSave = async () => {
    if (!isValid || !onSave) return;
    
    setSaving(true);
    setSaveMessage(null);
    
    try {
      await onSave(content);
      setSaveMessage("保存しました");
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (e: any) {
      setSaveMessage(`エラー: ${e?.message || "保存に失敗しました"}`);
    } finally {
      setSaving(false);
    }
  };

  // 差分計算
  const diffResult = showDiff ? diffLines(originalContent, content) : [];
  const hasChanges = content !== originalContent;

  return (
    <div className="flex h-full flex-col">
      {/* ヘッダー */}
      <div className="flex items-center justify-between border-b bg-zinc-800 px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-zinc-300">{filename}</span>
          {hasChanges && (
            <span className="rounded bg-amber-600 px-2 py-0.5 text-xs text-white">
              未保存
            </span>
          )}
          {!isValid && (
            <span className="rounded bg-red-600 px-2 py-0.5 text-xs text-white">
              YAML エラー
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowDiff(!showDiff)}
            className={`rounded px-3 py-1 text-sm transition ${
              showDiff
                ? "bg-indigo-600 text-white"
                : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
            }`}
          >
            差分
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isValid || saving || !hasChanges}
            className="rounded bg-green-600 px-4 py-1 text-sm font-medium text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:bg-zinc-600"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>

      {/* バリデーションエラー */}
      {parseError && (
        <div className="border-b border-red-700 bg-red-900/50 px-4 py-2 text-sm text-red-300">
          <span className="font-medium">YAML Parse Error:</span> {parseError}
        </div>
      )}

      {/* 保存メッセージ */}
      {saveMessage && (
        <div
          className={`border-b px-4 py-2 text-sm ${
            saveMessage.startsWith("エラー")
              ? "border-red-700 bg-red-900/50 text-red-300"
              : "border-green-700 bg-green-900/50 text-green-300"
          }`}
        >
          {saveMessage}
        </div>
      )}

      {/* メインエリア */}
      <div className="flex flex-1 overflow-hidden">
        {/* エディタ */}
        <div
          ref={editorRef}
          className={`flex-1 overflow-auto ${showDiff ? "w-1/2" : "w-full"}`}
        />

        {/* 差分表示 */}
        {showDiff && (
          <div className="w-1/2 overflow-auto border-l border-zinc-700 bg-zinc-900 p-4">
            <h3 className="mb-2 text-sm font-medium text-zinc-400">変更差分</h3>
            {!hasChanges ? (
              <p className="text-sm text-zinc-500">変更はありません</p>
            ) : (
              <pre className="text-sm">
                {diffResult.map((part, i) => (
                  <span
                    key={i}
                    className={
                      part.added
                        ? "bg-green-900/50 text-green-300"
                        : part.removed
                        ? "bg-red-900/50 text-red-300"
                        : "text-zinc-400"
                    }
                  >
                    {part.value}
                  </span>
                ))}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

