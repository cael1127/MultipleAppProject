import { Router } from 'express';
import type { EnergySnapshot } from '@prisma/client';
import { z } from 'zod';

import type { AuthedRequest } from '../middleware/jwt-middleware.js';
import { requireAuth } from '../middleware/jwt-middleware.js';
import { prisma } from '../prisma.js';

const router = Router();

router.get('/snapshots', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const snapshots = await prisma.energySnapshot.findMany({
      where: { ownerId: req.user!.id },
      orderBy: { recordedAt: 'desc' },
    });
    res.json({
      snapshots: snapshots.map((snapshot: EnergySnapshot) => ({
        ...snapshot,
        tags: JSON.parse(snapshot.tags || '[]'),
      })),
    });
  } catch (error) {
    next(error);
  }
});

const snapshotSchema = z.object({
  recordedAt: z.string().datetime(),
  readiness: z.number().int().min(0).max(100),
  sleepHours: z.number().min(0),
  hrvScore: z.number().int().min(0),
  tags: z.array(z.string()).default([]),
});

router.post('/snapshots', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const data = snapshotSchema.parse(req.body);
    const snapshot = await prisma.energySnapshot.create({
      data: {
        ownerId: req.user!.id,
        recordedAt: new Date(data.recordedAt),
        readiness: data.readiness,
        sleepHours: data.sleepHours,
        hrvScore: data.hrvScore,
        tags: JSON.stringify(data.tags ?? []),
      },
    });
    res.status(201).json({
      snapshot: {
        ...snapshot,
        tags: data.tags,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/journal', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const entries = await prisma.journalEntry.findMany({
      where: { ownerId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ entries });
  } catch (error) {
    next(error);
  }
});

router.post('/journal', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const schema = z.object({
      content: z.string().min(3),
      mood: z.number().int().min(1).max(5),
    });
    const data = schema.parse(req.body);
    const entry = await prisma.journalEntry.create({
      data: {
        ownerId: req.user!.id,
        content: data.content,
        mood: data.mood,
      },
    });
    res.status(201).json({ entry });
  } catch (error) {
    next(error);
  }
});

export { router as wellnessRouter };

