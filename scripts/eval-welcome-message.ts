#!/usr/bin/env tsx
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { z } from 'zod';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { generateWelcomeMessage } from '../src/lib/ai/welcome-message';
import { logger } from '../src/lib/logger';

const DEFAULT_INPUT_PATH = 'tests/fixtures/welcome-eval.jsonl';
const DEFAULT_MIN_LENGTH = 100;
const DEFAULT_MAX_LENGTH = 150;
const DEFAULT_BANNED_PHRASES = [
  '독서 클럽',
  '독서클럽',
  '좋은 분들 만나실 거예요',
  '인상 깊었어요',
  'ㅎㅎ',
];

const EVAL_SYSTEM_PROMPT = `You are a strict fact checker for welcome messages.
Only mark a sentence as supported if the call script explicitly states all details.
If any detail is inferred, exaggerated, or generalized, mark it unsupported.`;

const SentenceEvalSchema = z.object({
  sentence: z.string(),
  category: z.enum(['FACT', 'GREETING', 'CONTEXT', 'OTHER']),
  supported: z.boolean(),
  evidence: z.string().optional(),
  reason: z.string().optional(),
});

const JudgeSchema = z.object({
  sentenceEvals: z.array(SentenceEvalSchema),
});

const EvalCaseSchema = z.object({
  id: z.string(),
  memberName: z.string(),
  callScript: z.string(),
  message: z.string().optional().nullable(),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  bannedPhrases: z.array(z.string()).optional(),
});

type EvalCase = z.infer<typeof EvalCaseSchema>;

function getArgValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function getEvalModel() {
  const provider = process.env.EVAL_AI_PROVIDER || process.env.AI_PROVIDER || 'openai';
  const modelName = process.env.EVAL_AI_MODEL || process.env.AI_MODEL || 'gpt-4o-mini';

  switch (provider) {
    case 'anthropic':
      return anthropic(modelName);
    case 'google':
      return google(modelName);
    case 'openai':
    default:
      return openai(modelName);
  }
}

function parseJsonLines(path: string): EvalCase[] {
  const raw = readFileSync(path, 'utf8');
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const results: EvalCase[] = [];

  lines.forEach((line, index) => {
    try {
      const parsed = JSON.parse(line);
      const data = EvalCaseSchema.parse(parsed);
      results.push(data);
    } catch (error) {
      logger.error(`Failed to parse JSONL line ${index + 1}`, error);
    }
  });

  return results;
}

async function judgeMessage(callScript: string, message: string) {
  const prompt = `Call script:
${callScript}

Message:
${message}

Tasks:
1) Split the message into sentences.
2) For each sentence, CLASSIFY its category:
   - FACT: Claims a specific fact about the User (e.g. "You like X").
   - GREETING: Welcome messages, salutations.
   - CONTEXT: Club descriptions, future promises ("You will meet..."), general compliments.
   - OTHER: Anything else.
3) IF Category is FACT: Check if it is supported by the script. If yes, supported=true. If no, supported=false.
4) IF Category is GREETING/CONTEXT/OTHER: ALWAYS mark supported=true.
Return JSON.`;

  const result = await generateObject({
    model: getEvalModel(),
    schema: JudgeSchema,
    system: 'You are an expert Hallucination Detector.',
    prompt,
  });

  return result.object;
}

async function evaluateCase(
  entry: EvalCase,
  options: { skipGenerate: boolean; forceGenerate: boolean }
) {
  const minLength = entry.minLength ?? DEFAULT_MIN_LENGTH;
  const maxLength = entry.maxLength ?? DEFAULT_MAX_LENGTH;
  const bannedPhrases = [...DEFAULT_BANNED_PHRASES, ...(entry.bannedPhrases || [])];

  const providedMessage =
    typeof entry.message === 'string' && entry.message.trim().length > 0
      ? entry.message.trim()
      : null;

  let message = providedMessage;
  let source: 'fixture' | 'generated' = 'fixture';

  if (options.forceGenerate || !message) {
    if (options.skipGenerate) {
      return {
        id: entry.id,
        skipped: true,
        reason: 'No message provided and generation disabled',
      };
    }

    const generated = await generateWelcomeMessage({
      memberName: entry.memberName,
      callScript: entry.callScript,
    });

    if (!generated.success || !generated.message) {
      return {
        id: entry.id,
        skipped: false,
        success: false,
        error: generated.error || 'Welcome message generation failed',
      };
    }

    message = generated.message.trim();
    source = 'generated';
  }

  const length = message.length;
  const lengthOk = length >= minLength && length <= maxLength;
  const bannedHits = bannedPhrases.filter((phrase) => message.includes(phrase));

  const judge = await judgeMessage(entry.callScript, message);
  const unsupported = judge.sentenceEvals.filter((item) => !item.supported);

  return {
    id: entry.id,
    skipped: false,
    success: true,
    source,
    message,
    length,
    lengthOk,
    bannedHits,
    sentenceCount: judge.sentenceEvals.length,
    unsupportedSentences: unsupported.map((item) => item.sentence),
  };
}

async function main() {
  const inputPath = resolve(getArgValue('--input') || DEFAULT_INPUT_PATH);
  const limit = Number(getArgValue('--limit') || 0);
  const skipGenerate = hasFlag('--skip-generate');
  const forceGenerate = hasFlag('--force-generate');
  const strict = hasFlag('--strict');

  const cases = parseJsonLines(inputPath);
  const selected = limit > 0 ? cases.slice(0, limit) : cases;

  if (selected.length === 0) {
    logger.warn('No eval cases found', { inputPath });
    return;
  }

  const results = [];
  let skippedCount = 0;
  let failCount = 0;
  let totalSentences = 0;
  let unsupportedSentences = 0;

  for (const entry of selected) {
    const result = await evaluateCase(entry, { skipGenerate, forceGenerate });
    results.push(result);

    if (result.skipped) {
      skippedCount += 1;
      continue;
    }

    if (!result.success) {
      failCount += 1;
      logger.warn('Eval failed to produce a message', {
        id: result.id,
        error: result.error,
      });
      continue;
    }

    totalSentences += result.sentenceCount;
    unsupportedSentences += result.unsupportedSentences.length;

    const caseFailed =
      !result.lengthOk || result.bannedHits.length > 0 || result.unsupportedSentences.length > 0;

    if (caseFailed) {
      failCount += 1;
    }

    const status = caseFailed ? 'FAIL' : 'PASS';
    const bannedSummary = result.bannedHits.length > 0 ? result.bannedHits.join(', ') : 'none';
    const unsupportedSummary =
      result.unsupportedSentences.length > 0
        ? result.unsupportedSentences.join(' | ')
        : 'none';

    console.log(`[${status}] ${result.id} (${result.source})`);
    console.log(`  message: "${result.message}"`);
    console.log(`  length: ${result.length} (${result.lengthOk ? 'ok' : 'out of range'})`);
    console.log(`  banned: ${bannedSummary}`);
    console.log(`  unsupported: ${unsupportedSummary}`);
  }

  const evaluatedCount = results.filter((result) => !result.skipped).length;
  const unsupportedRate =
    totalSentences > 0 ? (unsupportedSentences / totalSentences).toFixed(3) : '0.000';

  console.log('\n=== Welcome Message Eval Summary ===');
  console.log(`cases: ${evaluatedCount}/${results.length} (skipped: ${skippedCount})`);
  console.log(`failures: ${failCount}`);
  console.log(`unsupported_sentence_rate: ${unsupportedRate}`);

  if (strict && failCount > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error('Welcome message eval failed', error);
  process.exit(1);
});
