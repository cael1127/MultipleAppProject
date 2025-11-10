import { Router } from 'express';
import type { FinanceAccount, AutopilotRule, Transaction } from '@prisma/client';
import { z } from 'zod';

import type { AuthedRequest } from '../middleware/jwt-middleware.js';
import { requireAuth } from '../middleware/jwt-middleware.js';
import { prisma } from '../prisma.js';

const router = Router();

router.get('/accounts', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const accounts = await prisma.financeAccount.findMany({
      where: { ownerId: req.user!.id },
      include: { transactions: true, autopilotRules: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ accounts });
  } catch (error) {
    next(error);
  }
});

const accountSchema = z.object({
  name: z.string().min(3),
  type: z.enum(['CHECKING', 'SAVINGS', 'CREDIT', 'CASH', 'INVESTMENT']),
  currency: z.string().min(3).max(10),
  balance: z.number(),
});

router.post('/accounts', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const data = accountSchema.parse(req.body);
    const account = await prisma.financeAccount.create({
      data: {
        ownerId: req.user!.id,
        ...data,
      },
    });
    res.status(201).json({ account });
  } catch (error) {
    next(error);
  }
});

const transactionSchema = z.object({
  accountId: z.string(),
  description: z.string().min(3),
  amount: z.number(),
  category: z.string(),
  occurredAt: z.string().datetime(),
});

router.post('/transactions', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const data = transactionSchema.parse(req.body);
    const account = await prisma.financeAccount.findFirst({
      where: { id: data.accountId, ownerId: req.user!.id },
    });
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }
    const transaction = await prisma.transaction.create({
      data: {
        accountId: account.id,
        description: data.description,
        amount: data.amount,
        category: data.category,
        occurredAt: new Date(data.occurredAt),
      },
    });
    res.status(201).json({ transaction });
  } catch (error) {
    next(error);
  }
});

const ruleSchema = z.object({
  accountId: z.string().optional(),
  name: z.string().min(3),
  percentage: z.number().min(0).max(1),
  destination: z.string(),
  active: z.boolean().optional(),
});

router.post('/autopilot-rules', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const data = ruleSchema.parse(req.body);
    const rule = await prisma.autopilotRule.create({
      data: {
        ownerId: req.user!.id,
        accountId: data.accountId,
        name: data.name,
        percentage: data.percentage,
        destination: data.destination,
        active: data.active ?? true,
      },
    });
    res.status(201).json({ rule });
  } catch (error) {
    next(error);
  }
});

router.post('/forecast', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const schema = z.object({
      horizonDays: z.number().int().positive().max(180).default(30),
    });
    const { horizonDays } = schema.parse(req.body ?? {});
    const accounts = await prisma.financeAccount.findMany({
      where: { ownerId: req.user!.id },
      include: { transactions: true, autopilotRules: true },
    });

    const forecast = accounts.map((account: FinanceAccount & { transactions: Transaction[]; autopilotRules: AutopilotRule[] }) => {
      const inflows = account.transactions
        .filter((t: Transaction) => t.amount > 0)
        .reduce((sum: number, t: Transaction) => sum + t.amount, 0);
      const outflows = account.transactions
        .filter((t: Transaction) => t.amount < 0)
        .reduce((sum: number, t: Transaction) => sum + t.amount, 0);
      const autopilot = account.autopilotRules.reduce((sum: number, rule: AutopilotRule) => {
        if (!rule.active) return sum;
        return sum + account.balance * rule.percentage;
      }, 0);
      const projected = account.balance + ((inflows + outflows) / Math.max(account.transactions.length, 1)) * horizonDays - autopilot;
      return {
        accountId: account.id,
        balance: account.balance,
        projected,
        horizonDays,
        autopilot,
      };
    });

    res.json({ forecast });
  } catch (error) {
    next(error);
  }
});

export { router as financeRouter };

