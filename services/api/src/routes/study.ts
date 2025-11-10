import { Router } from 'express';
import type { Sprint as SprintModel, TutorSnapshot as TutorSnapshotModel } from '@prisma/client';
import { z } from 'zod';

import type { AuthedRequest } from '../middleware/jwt-middleware.js';
import { requireAuth } from '../middleware/jwt-middleware.js';
import { prisma } from '../prisma.js';

const router = Router();

router.get('/sprints', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const sprints = await prisma.sprint.findMany({
      where: { ownerId: req.user!.id },
      include: { focusSessions: true, tutorSnapshots: true },
      orderBy: { startDate: 'desc' },
    });
    res.json({
      sprints: sprints.map((sprint: SprintModel & { tutorSnapshots: TutorSnapshotModel[] }) => ({
        ...sprint,
        tutorSnapshots: sprint.tutorSnapshots.map((snapshot) => ({
          ...snapshot,
          topics: JSON.parse(snapshot.topics || '[]'),
          actionItems: JSON.parse(snapshot.actionItems || '[]'),
        })),
      })),
    });
  } catch (error) {
    next(error);
  }
});

const sprintSchema = z.object({
  title: z.string().min(3),
  objective: z.string().min(5),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

router.post('/sprints', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const data = sprintSchema.parse(req.body);
    const sprint = await prisma.sprint.create({
      data: {
        ownerId: req.user!.id,
        title: data.title,
        objective: data.objective,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      },
    });
    res.status(201).json({ sprint });
  } catch (error) {
    next(error);
  }
});

const focusSchema = z.object({
  sprintId: z.string().optional(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
  notes: z.string().optional(),
});

router.post('/focus-sessions', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const data = focusSchema.parse(req.body);
    const session = await prisma.focusSession.create({
      data: {
        ownerId: req.user!.id,
        sprintId: data.sprintId,
        startedAt: new Date(data.startedAt),
        endedAt: data.endedAt ? new Date(data.endedAt) : undefined,
        notes: data.notes,
      },
    });
    res.status(201).json({ session });
  } catch (error) {
    next(error);
  }
});

const tutorSchema = z.object({
  sprintId: z.string().optional(),
  summary: z.string().min(5),
  topics: z.array(z.string()).default([]),
  actionItems: z.array(z.string()).default([]),
});

router.post('/tutor-snapshots', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const data = tutorSchema.parse(req.body);
    const snapshot = await prisma.tutorSnapshot.create({
      data: {
        ownerId: req.user!.id,
        sprintId: data.sprintId,
        summary: data.summary,
        topics: JSON.stringify(data.topics ?? []),
        actionItems: JSON.stringify(data.actionItems ?? []),
      },
    });
    res.status(201).json({
      snapshot: {
        ...snapshot,
        topics: data.topics,
        actionItems: data.actionItems,
      },
    });
  } catch (error) {
    next(error);
  }
});

export { router as studyRouter };

