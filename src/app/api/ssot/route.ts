/**
 * SSOT ファイル一覧 API
 * GET /api/ssot - ssot/ ディレクトリのYAMLファイル一覧を返す
 */

import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

// プロジェクトルートの ssot/ ディレクトリ
function getSSOTDir(): string {
  // apps/platform から見て ../../ssot
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

export async function GET() {
  try {
    const ssotDir = getSSOTDir();

    if (!fs.existsSync(ssotDir)) {
      return NextResponse.json({
        data: {
          files: [],
          directory: ssotDir,
          error: "ssot directory not found",
        },
      });
    }

    const entries = fs.readdirSync(ssotDir, { withFileTypes: true });
    const files = entries
      .filter((e) => e.isFile() && (e.name.endsWith(".yml") || e.name.endsWith(".yaml")))
      .map((e) => {
        const filePath = path.join(ssotDir, e.name);
        const stats = fs.statSync(filePath);
        return {
          name: e.name,
          size: stats.size,
          modifiedAt: stats.mtime.toISOString(),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      data: {
        files,
        directory: ssotDir,
      },
    });
  } catch (error: any) {
    console.error("[SSOT API Error]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to list SSOT files" },
      { status: 500 }
    );
  }
}

