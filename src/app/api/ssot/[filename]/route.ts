/**
 * SSOT ファイル読み込み・保存 API
 * GET /api/ssot/[filename] - ファイル内容を取得
 * PUT /api/ssot/[filename] - ファイル内容を保存
 */

import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import yaml from "yaml";

// プロジェクトルートの ssot/ ディレクトリ
function getSSOTDir(): string {
  const platformDir = process.cwd();
  const possiblePaths = [
    path.join(platformDir, "..", "..", "ssot"),
    path.join(platformDir, "ssot"),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return path.join(platformDir, "..", "..", "ssot");
}

// ファイル名のバリデーション（セキュリティ）
function isValidFilename(filename: string): boolean {
  // ディレクトリトラバーサル防止
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return false;
  }
  // .yml または .yaml のみ許可
  if (!filename.endsWith(".yml") && !filename.endsWith(".yaml")) {
    return false;
  }
  // 英数字、ハイフン、アンダースコア、ドットのみ許可
  if (!/^[a-zA-Z0-9_-]+\.(yml|yaml)$/.test(filename)) {
    return false;
  }
  return true;
}

type RouteContext = {
  params: Promise<{ filename: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { filename } = await context.params;

    if (!isValidFilename(filename)) {
      return NextResponse.json(
        { error: "Invalid filename" },
        { status: 400 }
      );
    }

    const ssotDir = getSSOTDir();
    const filePath = path.join(ssotDir, filename);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    const content = fs.readFileSync(filePath, "utf-8");

    // YAMLバリデーション
    let isValid = true;
    let parseError: string | null = null;
    try {
      yaml.parse(content);
    } catch (e: any) {
      isValid = false;
      parseError = e?.message || "YAML parse error";
    }

    return NextResponse.json({
      data: {
        filename,
        content,
        isValid,
        parseError,
      },
    });
  } catch (error: any) {
    console.error("[SSOT API Error]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to read file" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { filename } = await context.params;

    if (!isValidFilename(filename)) {
      return NextResponse.json(
        { error: "Invalid filename" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { content } = body;

    if (typeof content !== "string") {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 }
      );
    }

    // YAMLバリデーション
    try {
      yaml.parse(content);
    } catch (e: any) {
      return NextResponse.json(
        { error: `YAML parse error: ${e?.message}` },
        { status: 400 }
      );
    }

    const ssotDir = getSSOTDir();
    const filePath = path.join(ssotDir, filename);

    // 既存ファイルの内容を取得（差分用）
    let originalContent = "";
    if (fs.existsSync(filePath)) {
      originalContent = fs.readFileSync(filePath, "utf-8");
    }

    // ファイル保存
    fs.writeFileSync(filePath, content, "utf-8");

    return NextResponse.json({
      data: {
        filename,
        saved: true,
        originalContent,
        newContent: content,
      },
    });
  } catch (error: any) {
    console.error("[SSOT API Error]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to save file" },
      { status: 500 }
    );
  }
}

