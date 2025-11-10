import { Router } from 'express';
import { z } from 'zod';

import type { AuthedRequest } from '../middleware/jwt-middleware';
import { requireAuth } from '../middleware/jwt-middleware';
import { prisma } from '../prisma';

const router = Router();

router.get('/workflows', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const workflows = await prisma.workflow.findMany({
      where: { ownerId: req.user!.id },
      orderBy: { updatedAt: 'desc' },
      include: { steps: true },
    });
    res.json({ workflows });
  } catch (error) {
    next(error);
  }
});

const workflowSchema = z.object({
  name: z.string().min(3),
  description: z.string().min(5),
  visibility: z.enum(['PRIVATE', 'TEAM', 'ORG']).optional(),
  steps: z.array(
    z.object({
      kind: z.enum(['TRIGGER', 'DECISION', 'ACTION', 'NOTIFY']),
      position: z.number().int().nonnegative(),
      config: z.record(z.any()),
    }),
  ),
});

router.post('/workflows', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const data = workflowSchema.parse(req.body);
    const workflow = await prisma.workflow.create({
      data: {
        ownerId: req.user!.id,
        name: data.name,
        description: data.description,
        visibility: data.visibility,
        steps: {
          create: data.steps.map((step) => ({
            kind: step.kind,
            position: step.position,
            config: JSON.stringify(step.config),
          })),
        },
      },
      include: { steps: true },
    });
    res.status(201).json({ workflow });
  } catch (error) {
    next(error);
  }
});

const voiceLogSchema = z.object({
  title: z.string().min(3),
  transcript: z.string().min(10),
  tags: z.array(z.string()).max(6).optional(),
  workflowId: z.string().optional(),
});

router.post('/voice-logs', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const data = voiceLogSchema.parse(req.body);
    const voiceLog = await prisma.voiceLog.create({
      data: {
        ownerId: req.user!.id,
        title: data.title,
        transcript: data.transcript,
        workflowId: data.workflowId,
      },
    });
    res.status(201).json({ voiceLog });
  } catch (error) {
    next(error);
  }
});

const simulateSchema = z.object({
  prompt: z.string().min(5),
  guardrails: z.array(z.string()).optional(),
});

router.post('/guardrails/simulate', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const data = simulateSchema.parse(req.body);
    const heuristicScore = Math.min(1, Math.max(0, data.prompt.length / 280));
    const guardrails = data.guardrails ?? [];
    res.json({
      prompt: data.prompt,
      guardrails,
      verdict: heuristicScore > 0.65 ? 'Needs review' : 'Clear to ship',
      confidence: 1 - heuristicScore,
      notes: heuristicScore > 0.65 ? ['Tone deviates from approved copy banks', 'Guardrail escalation recommended'] : [],
    });
  } catch (error) {
    next(error);
  }
});

router.get('/voice-logs', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const voiceLogs = await prisma.voiceLog.findMany({
      where: { ownerId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ voiceLogs });
  } catch (error) {
    next(error);
  }
});

router.get('/workflow-suggestions', requireAuth, async (_req: AuthedRequest, res, next) => {
  try {
    res.json({
      suggestions: [
        {
          id: 'handoff-ai-review',
          title: 'AI-assisted handoff',
          description: 'Spin up a voice capsule capturing meeting recap, ticket creation, and guardrail audit.',
          steps: ['Voice capture', 'Summarize', 'Human approval', 'Ticket trigger'],
        },
        {
          id: 'followup-sequencer',
          title: 'Follow-up sequencer',
          description: 'Schedule weekly nudges across email + Slack when guardrails pass confidence threshold.',
          steps: ['Detect tone', 'Generate copy', 'Queue sends', 'Audit log'],
        },
      ],
    });
  } catch (error) {
    next(error);
  }
});

export { router as novaRouter };

