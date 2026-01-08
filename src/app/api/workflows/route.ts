import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';

type WorkflowSummary = {
  id: string;
  name: string;
  description?: string;
  modes: string[];
  stepsCount: number;
};

function resolveWorkflowsPath(): string {
  const direct = path.resolve(process.cwd(), 'workflows.yml');
  if (fs.existsSync(direct)) return direct;
  const fromPlatform = path.resolve(process.cwd(), '..', '..', 'workflows.yml');
  if (fs.existsSync(fromPlatform)) return fromPlatform;
  throw new Error('workflows.yml not found');
}

export async function GET() {
  try {
    const raw = fs.readFileSync(resolveWorkflowsPath(), 'utf-8');
    const parsed = yaml.parse(raw) as { workflows: any[] };
    const workflows = (parsed.workflows ?? []) as any[];

    const data: WorkflowSummary[] = workflows.map((w) => ({
      id: w.id,
      name: w.name,
      description: w.description,
      modes: w.modes ? Object.keys(w.modes) : [],
      stepsCount: Array.isArray(w.steps) ? w.steps.length : 0,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('GET /api/workflows failed', error);
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 });
  }
}



