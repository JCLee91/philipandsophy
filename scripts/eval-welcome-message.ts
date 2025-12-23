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
const DEFAULT_MAX_LENGTH = 250;
const DEFAULT_BANNED_PHRASES = [
  '독서 클럽',
  '독서클럽',
  '좋은 분들 만나실 거예요',
  '인상 깊었어요',
  'ㅎㅎ',
];

const EVAL_SYSTEM_PROMPT = `당신은 '팩트 체커'입니다.
생성된 메시지가 인터뷰 내용(스크립트)에 기반하고 있는지 확인하되, **매우 관대한 기준**을 적용하세요.

# 핵심 목표
사용자에 대해 **없는 사실을 완전히 날조한 경우**만 찾아내세요.

# 검증 규칙
1. **명백한 거짓만 적발**:
   - 인터뷰에 없는 특정 장소, 직업, 고유명사, 숫자를 언급한 경우.
   - 인터뷰 내용과 정반대되는 내용을 말한 경우.
2. **유추 및 추론 허용 (Pass)**:
   - 인터뷰 내용을 바탕으로 한 자연스러운 추론은 **모두 사실(Fact)**로 인정하세요.
3. **복합 문장 허용 (Pass)**:
   - 문장에 팩트와 감상/인사가 섞여 있는 경우, **팩트 부분만 맞으면 통과**시키세요.
   - (예: "취미가 독서라니 정말 멋지네요" -> 독서가 팩브라면 통과)
   - 뒷부분의 "멋지네요", "반갑습니다"는 검증 대상이 아닙니다.
4. **표현의 다양성 허용 (Pass)**:
   - "자주", "항상", "열심히" 같은 수식어가 붙어도 문맥상 통하면 허용하세요.
5. **그 외 무조건 통과**:
   - 인사말, 느낌, 미래에 대한 다짐, 칭찬 등은 검증하지 말고 통과시키세요.

# 요약
"이 사람이 이런 말을 한 적이 없는데?" 싶은 **심각한 날조**가 아니라면, 웬만하면 모두 **통과(Supported)**시키세요.`;

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
  const provider = process.env.EVAL_AI_PROVIDER || process.env.AI_PROVIDER || 'google';
  const modelName = process.env.EVAL_AI_MODEL || process.env.AI_MODEL || 'gemini-3-flash-preview';

  switch (provider) {
    case 'anthropic':
      return anthropic(modelName);
    case 'openai':
      return openai(modelName);
    case 'google':
    default:
      return google(modelName);
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
  const prompt = `통화 녹취록 (Call script):
${callScript}

생성된 메시지 (Message):
${message}

수행 작업:
1) 메시지를 문장 단위로 분리하세요.
2) 각 문장의 카테고리를 분류하세요 (CLASSIFY):
   - FACT: 사용자에 대한 구체적 사실 주장 (예: "회원님은 X를 좋아하시죠").
   - GREETING: 환영 인사, 안부.
   - CONTEXT: 클럽 소개, 미래에 대한 약속("~만나게 될 겁니다"), 일반적인 칭찬.
   - OTHER: 그 외.
3) 카테고리가 'FACT'인 경우: 스크립트에 근거한 내용인지 확인하세요. (근거가 있으면 supported=true, 없으면 supported=false).
4) 카테고리가 'GREETING', 'CONTEXT', 'OTHER'인 경우: 항상 supported=true로 설정하세요.
JSON 형식으로 반환하세요.`;

  const result = await generateObject({
    model: getEvalModel(),
    schema: JudgeSchema,
    system: EVAL_SYSTEM_PROMPT,
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
