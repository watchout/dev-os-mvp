#!/usr/bin/env ts-node
/**
 * devos_selfcheck.ts
 * dev-OS の設定整合性と web-console API の簡易動作確認を行う自動チェック。
 */

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { parse as parseYaml } from 'yaml';

interface WorkflowStep {
  order: number;
  role: string;
  modelSlot: string;
  input: string;
  output: string;
  notes?: string;
}

interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  modes?: Record<string, unknown>;
  steps: WorkflowStep[];
}

interface WorkflowsFile {
  workflows: WorkflowDefinition[];
}

interface SlotConfig {
  label?: string;
  defaultModel?: string;
  notes?: string;
}

interface PresetConfig {
  description?: string;
  slots?: Record<string, string>;
}

interface LLMConfig {
  slots: Record<string, SlotConfig>;
  presets: Record<string, PresetConfig>;
}

interface FeatureMeta {
  id?: unknown;
  name?: unknown;
  stakeholders?: unknown;
  business_goal?: unknown;
  quality_attributes?: unknown;
  constraints?: unknown;
  risk_level?: unknown;
  [key: string]: unknown;
}

type HttpMethod = 'GET' | 'POST';

// apps/platform を基準とする
const ROOT = path.join(__dirname, '..');
const WORKFLOWS_PATH = path.join(ROOT, 'workflows.yml');
const FEATURES_SSOT_PATH = path.join(ROOT, 'ssot', 'features.yml');
const COMMAND_TAGS_PATH = path.join(ROOT, 'ssot', 'command_tags.yml');
const GOVERNANCE_PATH = path.join(ROOT, 'ssot', 'governance.yml');
const PROMPT_TEMPLATES_PATH = path.join(ROOT, 'ssot', 'prompt_templates.yml');
const LLM_CONFIG_PATH = path.join(ROOT, 'workspace_llm_config.json');
const BASE_URL = 'http://localhost:5100';

async function run(): Promise<void> {
  console.log('[devos:selfcheck] File checks...');
  const filesOk = await checkFiles();

  // CI環境やサーバー未起動時はHTTPチェックをスキップ
  const skipHttp = process.env.SKIP_HTTP_CHECKS === '1' || process.env.CI === 'true';
  
  let httpOk = true;
  if (skipHttp) {
    console.log('\n[devos:selfcheck] HTTP checks... SKIPPED (SKIP_HTTP_CHECKS=1 or CI=true)');
  } else {
    console.log('\n[devos:selfcheck] HTTP checks...');
    httpOk = await checkHttpEndpoints();
  }

  if (!filesOk || !httpOk) {
    console.error('\n[devos:selfcheck] Check failed.');
    process.exit(1);
  }

  console.log('\n[devos:selfcheck] All checks passed.');
}

async function checkFiles(): Promise<boolean> {
  const errors: string[] = [];

  let workflowsData: WorkflowsFile | null = null;
  let llmConfig: LLMConfig | null = null;
  let featureIds: Set<string> | null = null;
  let allFeatures: FeatureMeta[] | null = null;
  let workflowIds: Set<string> | null = null;
  let commandTags: any[] | null = null;
  let governanceTriggers: Set<string> | null = null;
  let promptRagProfileIds: Set<string> | null = null;
  try {
    const workflowsRaw = fs.readFileSync(WORKFLOWS_PATH, 'utf-8');
    workflowsData = parseYaml(workflowsRaw) as WorkflowsFile;
    const ids = workflowsData?.workflows?.map((wf) => wf?.id).filter((id): id is string => typeof id === 'string');
    workflowIds = new Set(ids ?? []);
  } catch (err) {
    errors.push(`ERROR: failed to read workflows.yml (${String(err)})`);
  }

  try {
    const featuresRaw = fs.readFileSync(FEATURES_SSOT_PATH, 'utf-8');
    const parsed = parseYaml(featuresRaw) as { features?: FeatureMeta[] };
    const list = parsed?.features;
    if (!Array.isArray(list) || list.length === 0) {
      errors.push('ERROR: ssot/features.yml has no "features" array or it is empty');
    } else {
      allFeatures = list;
      featureIds = new Set(
        list
          .map((f, index) => {
            if (!f || typeof f !== 'object' || typeof f.id !== 'string' || f.id.trim().length === 0) {
              errors.push(`ERROR: ssot/features.yml features[${index}] has invalid or empty id`);
              return null;
            }
            return f.id;
          })
          .filter((id): id is string => id !== null),
      );
    }
  } catch (err) {
    errors.push(`ERROR: failed to read ssot/features.yml (${String(err)})`);
  }

  try {
    const llmConfigRaw = fs.readFileSync(LLM_CONFIG_PATH, 'utf-8');
    llmConfig = JSON.parse(llmConfigRaw) as LLMConfig;
  } catch (err) {
    errors.push(`ERROR: failed to read workspace_llm_config.json (${String(err)})`);
  }

  try {
    const commandTagsRaw = fs.readFileSync(COMMAND_TAGS_PATH, 'utf-8');
    const parsed = parseYaml(commandTagsRaw) as { command_tags?: { commands?: any[] } };
    const cmds = parsed?.command_tags?.commands;
    if (!Array.isArray(cmds)) {
      errors.push('ERROR: ssot/command_tags.yml has no command_tags.commands array');
    } else {
      commandTags = cmds;
    }
  } catch (err) {
    errors.push(`ERROR: failed to read ssot/command_tags.yml (${String(err)})`);
  }

  try {
    const governanceRaw = fs.readFileSync(GOVERNANCE_PATH, 'utf-8');
    const parsed = parseYaml(governanceRaw) as {
      governance?: { halt_protocol?: { triggers?: Array<{ id?: unknown }> } };
    };
    const triggers = parsed?.governance?.halt_protocol?.triggers;
    if (!Array.isArray(triggers) || triggers.length === 0) {
      errors.push('ERROR: ssot/governance.yml has no governance.halt_protocol.triggers array');
    } else {
      governanceTriggers = new Set(
        triggers
          .map((t, idx) => {
            const id = typeof t?.id === 'string' ? t.id.trim() : '';
            if (!id) {
              errors.push(`ERROR: governance.halt_protocol.triggers[${idx}] is missing valid id`);
              return null;
            }
            return id;
          })
          .filter((id): id is string => id !== null),
      );
    }
  } catch (err) {
    errors.push(`ERROR: failed to read ssot/governance.yml (${String(err)})`);
  }

  try {
    const promptTemplatesRaw = fs.readFileSync(PROMPT_TEMPLATES_PATH, 'utf-8');
    const parsed = parseYaml(promptTemplatesRaw) as { prompt_templates?: Array<{ rag_profile?: { id?: unknown } }> };
    const templates = parsed?.prompt_templates;
    if (!Array.isArray(templates) || templates.length === 0) {
      errors.push('ERROR: ssot/prompt_templates.yml has no prompt_templates array');
    } else {
      const ids = templates
        .map((tpl, idx) => {
          const id = tpl?.rag_profile?.id;
          if (typeof id === 'string' && id.trim().length > 0) return id.trim();
          return null;
        })
        .filter((id): id is string => id !== null);
      promptRagProfileIds = new Set(ids);
    }
  } catch (err) {
    errors.push(`ERROR: failed to read ssot/prompt_templates.yml (${String(err)})`);
  }

  if (!workflowsData || !llmConfig || !featureIds || !allFeatures || !workflowIds || !promptRagProfileIds) {
    reportErrors(errors);
    return false;
  }

  const slotKeys = new Set(Object.keys(llmConfig.slots ?? {}));
  const usedModelSlots = new Set<string>();

  workflowsData.workflows?.forEach((workflow) => {
    workflow.steps?.forEach((step) => {
      if (step?.modelSlot) {
        usedModelSlots.add(step.modelSlot);
      }
    });
  });

  usedModelSlots.forEach((slot) => {
    if (!slotKeys.has(slot)) {
      errors.push(
        `ERROR: modelSlot "${slot}" is used in workflows.yml but not defined in workspace_llm_config.json.slots`,
      );
    }
  });

  const presetEntries = Object.entries(llmConfig.presets ?? {});
  presetEntries.forEach(([presetName, preset]) => {
    if (!preset || typeof preset !== 'object') {
      errors.push(`ERROR: preset "${presetName}" is not an object`);
      return;
    }
    if (!preset.slots || typeof preset.slots !== 'object') {
      errors.push(`ERROR: preset "${presetName}" has no slots object`);
      return;
    }

    Object.entries(preset.slots).forEach(([slot, modelId]) => {
      if (!slotKeys.has(slot)) {
        errors.push(`ERROR: preset "${presetName}" references undefined slot "${slot}"`);
      }
      if (typeof modelId !== 'string' || modelId.trim().length === 0) {
        errors.push(`ERROR: preset "${presetName}" has empty model id for slot "${slot}"`);
      }
    });
  });

  // Check that workflow.featureId values are consistent with ssot/features.yml
  const workflowsWithFeatureId: Array<{ id: string; name?: string; featureId: string }> = [];
  workflowsData.workflows?.forEach((workflow) => {
    const wfAny = workflow as WorkflowDefinition & { featureId?: unknown };
    if (wfAny.featureId !== undefined) {
      const raw = wfAny.featureId;
      const featureId = typeof raw === 'string' ? raw.trim() : '';
      workflowsWithFeatureId.push({ id: workflow.id, name: workflow.name, featureId });
    }
  });

  const totalWithFeatureId = workflowsWithFeatureId.length;
  workflowsWithFeatureId.forEach((wf) => {
    const label = wf.name ? `"${wf.name}" (id=${wf.id})` : `(id=${wf.id})`;
    if (!wf.featureId) {
      errors.push(`ERROR: workflow ${label} has empty featureId`);
      return;
    }
    if (!featureIds.has(wf.featureId)) {
      errors.push(
        `ERROR: workflow ${label} refers to unknown featureId "${wf.featureId}" (not found in ssot/features.yml)`,
      );
    }
  });

  const highRiskFeatures = allFeatures.filter(
    (feature) => feature && typeof feature.risk_level === 'string' && feature.risk_level === 'high',
  );

  if (highRiskFeatures.length === 0) {
    console.log('  ✓ no high-risk features defined (risk_level: "high")');
  } else {
    highRiskFeatures.forEach((feature) => {
      const featureId = typeof feature.id === 'string' ? feature.id : '(unknown id)';
      const featureLabel = typeof feature.name === 'string' ? feature.name : '(no name)';
      const label = `feature "${featureLabel}" (id=${featureId})`;

      if (!Array.isArray(feature.stakeholders) || feature.stakeholders.length === 0) {
        errors.push(`ERROR: ${label} has empty or missing stakeholders (required for risk_level: high)`);
      }

      if (typeof feature.business_goal !== 'string' || feature.business_goal.trim().length === 0) {
        errors.push(`ERROR: ${label} has empty or missing business_goal (required for risk_level: high)`);
      }

      if (!Array.isArray(feature.quality_attributes) || feature.quality_attributes.length === 0) {
        errors.push(`ERROR: ${label} has empty or missing quality_attributes (required for risk_level: high)`);
      }

      if (!Array.isArray(feature.constraints) || feature.constraints.length === 0) {
        errors.push(`ERROR: ${label} has empty or missing constraints (required for risk_level: high)`);
      }

      if (feature.risk_level !== 'high') {
        errors.push(`ERROR: ${label} expected risk_level "high" but got "${String(feature.risk_level)}"`);
      }
    });
  }

  if (errors.length === 0) {
    console.log('  ✓ all modelSlot(s) and presets are consistent');
    console.log(`  ✓ featureId mapping: OK (${totalWithFeatureId} workflow(s) with featureId, all matched)`);
    if (highRiskFeatures.length > 0) {
      console.log(
        `  ✓ high-risk feature design template: OK (${highRiskFeatures.length} high-risk feature(s) validated)`,
      );
    }
  }

  // Tag layer checks (command_tags / governance / workflows / prompt_templates)
  if (commandTags) {
    // 3-3: id / tag uniqueness
    const idMap = new Map<string, string[]>();
    const tagMap = new Map<string, string[]>();
    commandTags.forEach((cmd) => {
      const id = typeof cmd?.id === 'string' ? cmd.id : '';
      const tag = typeof cmd?.tag === 'string' ? cmd.tag : '';
      const label = `command id=${id || '(missing)'}`;
      if (id) {
        const list = idMap.get(id) ?? [];
        list.push(label);
        idMap.set(id, list);
      } else {
        errors.push('ERROR: command_tags command missing id');
      }
      if (tag) {
        const list = tagMap.get(tag) ?? [];
        list.push(label);
        tagMap.set(tag, list);
      } else {
        errors.push(`ERROR: ${label} missing tag`);
      }
    });
    idMap.forEach((commandsWithId, id) => {
      if (commandsWithId.length > 1) {
        errors.push(`ERROR: duplicate command id "${id}" used by ${commandsWithId.join(', ')}`);
      }
    });
    tagMap.forEach((commandsWithTag, tag) => {
      if (commandsWithTag.length > 1) {
        errors.push(`ERROR: duplicate command tag "${tag}" used by ${commandsWithTag.join(', ')}`);
      }
    });

    // 3-1: defaultWorkflowId must exist
    commandTags.forEach((cmd) => {
      const cmdId = typeof cmd?.id === 'string' ? cmd.id : '(unknown)';
      const wfId = typeof cmd?.defaultWorkflowId === 'string' ? cmd.defaultWorkflowId : '';
      if (!wfId) {
        errors.push(`ERROR: command "${cmdId}" has empty defaultWorkflowId`);
        return;
      }
      if (!workflowIds.has(wfId)) {
        errors.push(
          `ERROR: command "${cmdId}" defaultWorkflowId "${wfId}" not found in workflows.yml (known: ${[
            ...workflowIds,
          ].join(', ')})`,
        );
      }
    });

    // 3-2: governance haltTriggers
    if (governanceTriggers) {
      commandTags.forEach((cmd) => {
        const cmdId = typeof cmd?.id === 'string' ? cmd.id : '(unknown)';
        const profile = cmd?.governanceProfile;
        const useHalt = profile?.useHaltProtocol === true;
        const haltTriggers = profile?.haltTriggers;
        if (useHalt) {
          if (!Array.isArray(haltTriggers) || haltTriggers.length === 0) {
            errors.push(`ERROR: command "${cmdId}" has useHaltProtocol=true but no haltTriggers array`);
            return;
          }
          haltTriggers.forEach((h: unknown) => {
            const id = typeof h === 'string' ? h : '';
            if (!id) {
              errors.push(`ERROR: command "${cmdId}" has invalid haltTrigger id (empty)`);
              return;
            }
            if (!governanceTriggers.has(id)) {
              errors.push(
                `ERROR: command "${cmdId}" haltTrigger "${id}" not found in governance.halt_protocol.triggers`,
              );
            }
          });
        }
      });
    }
  }

  // 3-4: workflows ragProfileId should exist in prompt_templates
  workflowsData.workflows?.forEach((workflow) => {
    const wfAny = workflow as WorkflowDefinition & { ragProfileId?: unknown };
    if (typeof wfAny.ragProfileId === 'string' && wfAny.ragProfileId.trim().length > 0) {
      const ragId = wfAny.ragProfileId.trim();
      if (!promptRagProfileIds.has(ragId)) {
        errors.push(
          `ERROR: workflow "${workflow.id}" ragProfileId "${ragId}" not found in ssot/prompt_templates.yml (known rag_profile.id: ${[
            ...promptRagProfileIds,
          ].join(', ')})`,
        );
      }
    }
  });

  if (errors.length === 0) {
    console.log('  ✓ all modelSlot(s) and presets are consistent');
    console.log(`  ✓ featureId mapping: OK (${totalWithFeatureId} workflow(s) with featureId, all matched)`);
    if (highRiskFeatures.length > 0) {
      console.log(
        `  ✓ high-risk feature design template: OK (${highRiskFeatures.length} high-risk feature(s) validated)`,
      );
    }
    console.log('  ✓ tag layer checks: OK (command_tags / governance / ragProfile references)');
    return true;
  }

  reportErrors(errors);
  return false;
}

async function checkHttpEndpoints(): Promise<boolean> {
  let ok = true;

  try {
    const health = await request('GET', '/api/health');
    if (health.statusCode !== 200) {
      console.error(`  ERROR: GET /api/health returned status ${health.statusCode}`);
      ok = false;
    } else {
      const parsed = JSON.parse(health.body ?? '{}');
      if (parsed?.status !== 'ok') {
        console.error('  ERROR: GET /api/health returned unexpected payload');
        ok = false;
      } else {
        console.log('  ✓ GET /api/health');
      }
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code === 'ECONNREFUSED') {
      console.warn(
        `  WARN: server not reachable at ${BASE_URL}, HTTP checks skipped. (Future: add --require-server option)`,
      );
      return true;
    }
    console.error(`  ERROR: GET /api/health failed (${String(err)})`);
    ok = false;
  }

  return ok;
}

function request(method: HttpMethod, pathname: string, body?: string): Promise<{ statusCode?: number; body: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(pathname, BASE_URL);
    const req = http.request(
      {
        method,
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        headers: body
          ? {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(body).toString(),
            }
          : undefined,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk as Buffer));
        res.on('end', () => {
          resolve({ statusCode: res.statusCode, body: Buffer.concat(chunks).toString('utf-8') });
        });
      },
    );
    req.on('error', reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

function reportErrors(errors: string[]): void {
  errors.forEach((msg) => console.error(`  ${msg}`));
}

void run().catch((err) => {
  console.error('[devos:selfcheck] Unexpected error', err);
  process.exit(1);
});
