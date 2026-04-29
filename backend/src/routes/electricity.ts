import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import { filterRecipientsByPreference, excludeActorUnlessOptedIn } from '../services/notificationPreferences.js';
import { sendTelegramMessage } from '../services/telegramNotify.js';
import crypto from 'node:crypto';

interface ElectricityRechargeBody {
  rechargeDate: string;
  token: string;
  kwhAmount: number;
  totalPaid: number;
  baseCost?: number;
  vat?: number;
  ewuraFee?: number;
  reaFee?: number;
  debtCollected?: number;
  notes?: string;
  dryingProcessId?: string;
  meterReadingAfter?: number;
}

async function electricityRoutes(fastify: FastifyInstance) {
  // SECURITY: Protect all electricity routes with authentication
  fastify.addHook('onRequest', authenticateToken);

  // Get all electricity recharges
  fastify.get('/recharges', async (request, reply) => {
    try {
      const recharges = await prisma.electricityRecharge.findMany({
        include: {
          DryingProcess: {
            select: {
              batchNumber: true,
              status: true
            }
          }
        },
        orderBy: {
          rechargeDate: 'desc'
        }
      });
      // Map PascalCase to camelCase for frontend
      return recharges.map(r => ({
        ...r,
        dryingProcess: (r as any).DryingProcess
      }));
    } catch (error) {
      console.error('Error fetching electricity recharges:', error);
      return reply.status(500).send({ error: 'Failed to fetch electricity recharges' });
    }
  });

  // Get electricity statistics (total spent, total KWH, average price)
  fastify.get('/statistics', async (request, reply) => {
    try {
      const recharges = await prisma.electricityRecharge.findMany();

      const totalPaid = recharges.reduce((sum, r) => sum + r.totalPaid, 0);
      const totalKwh = recharges.reduce((sum, r) => sum + r.kwhAmount, 0);
      const averagePricePerKwh = totalKwh > 0 ? totalPaid / totalKwh : 0;

      return {
        totalPaid,
        totalKwh,
        averagePricePerKwh,
        rechargeCount: recharges.length
      };
    } catch (error) {
      console.error('Error calculating electricity statistics:', error);
      return reply.status(500).send({ error: 'Failed to calculate statistics' });
    }
  });

  // Get current electricity balance
  fastify.get('/balance', async (request, reply) => {
    try {
      // Calculate total kWh purchased from all recharges
      const recharges = await prisma.electricityRecharge.findMany();
      const totalPurchased = recharges.reduce((sum, r) => sum + r.kwhAmount, 0);

      // Calculate total kWh used from all drying processes
      const processes = await prisma.dryingProcess.findMany({
        include: {
          DryingReading: {
            orderBy: { readingTime: 'asc' }
          }
        }
      });

      let totalUsed = 0;
      for (const process of processes) {
        // Map PascalCase to camelCase
        const readings = (process as any).DryingReading || [];
        if (readings.length > 0) {

          // Calculate usage from consecutive readings
          for (let i = 1; i < readings.length; i++) {
            const prevReading = readings[i - 1].electricityMeter;
            const currReading = readings[i].electricityMeter;
            const diff = currReading - prevReading;

            // If meter went down, it's normal usage (prepaid meter counting down)
            // If meter went up significantly, it's a recharge - ignore it
            if (diff < 0) {
              // Normal usage: meter went down (e.g., 989 -> 726 = -263, so 263 kWh used)
              totalUsed += Math.abs(diff);
            } else if (diff > 100) {
              // Large positive jump = recharge happened, don't count it as usage
              continue;
            } else {
              // Small positive change might be usage on regular meter
              totalUsed += diff;
            }
          }

          // Also account for usage from starting point to first reading
          if (process.startingElectricityUnits && readings.length > 0) {
            const firstReading = readings[0].electricityMeter;
            const diff = firstReading - process.startingElectricityUnits;
            if (diff < 0) {
              totalUsed += Math.abs(diff);
            } else if (diff <= 100) {
              totalUsed += diff;
            }
          }
        }
      }

      const balance = totalPurchased - totalUsed;
      const percentageRemaining = totalPurchased > 0 ? (balance / totalPurchased) * 100 : 0;

      return {
        totalPurchased: Math.round(totalPurchased * 100) / 100,
        totalUsed: Math.round(totalUsed * 100) / 100,
        balance: Math.round(balance * 100) / 100,
        percentageRemaining: Math.round(percentageRemaining * 100) / 100,
        isLowBalance: balance < (totalPurchased * 0.2) // Less than 20% remaining
      };
    } catch (error) {
      console.error('Error calculating electricity balance:', error);
      return reply.status(500).send({ error: 'Failed to calculate electricity balance' });
    }
  });

  // Get recharges for a specific drying process
  fastify.get('/recharges/drying-process/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const recharges = await prisma.electricityRecharge.findMany({
        where: { dryingProcessId: id },
        orderBy: { rechargeDate: 'asc' }
      });

      return recharges;
    } catch (error) {
      console.error('Error fetching recharges for drying process:', error);
      return reply.status(500).send({ error: 'Failed to fetch recharges' });
    }
  });

  // Create a new electricity recharge
  fastify.post('/recharges', async (request, reply) => {
    try {
      const body = request.body as ElectricityRechargeBody;

      // When the recharge is tied to a drying process, anchor it to the most
      // recent reading. The recharge's effective time then comes from that
      // reading instead of a user-entered date — preventing the wrong-date
      // bug where the cost formula misallocates kWh between windows.
      let linkedReadingId: string | undefined;
      if (body.dryingProcessId) {
        const lastReading = await prisma.dryingReading.findFirst({
          where: { dryingProcessId: body.dryingProcessId },
          orderBy: { readingTime: 'desc' },
          select: { id: true },
        });
        if (!lastReading) {
          return reply.status(400).send({
            error: 'Cannot log recharge: this drying process has no readings yet. Please add a reading first, then log the recharge.',
          });
        }
        linkedReadingId = lastReading.id;
      }

      const recharge = await prisma.electricityRecharge.create({
        data: {
          id: crypto.randomUUID(),
          rechargeDate: new Date(body.rechargeDate),
          token: body.token,
          kwhAmount: body.kwhAmount,
          totalPaid: body.totalPaid,
          baseCost: body.baseCost,
          vat: body.vat,
          ewuraFee: body.ewuraFee,
          reaFee: body.reaFee,
          debtCollected: body.debtCollected,
          notes: body.notes,
          dryingProcessId: body.dryingProcessId,
          meterReadingAfter: body.meterReadingAfter,
          linkedReadingId,
          updatedAt: new Date()
        }
      });

      // Notify admins, respecting per-user preferences
      try {
        const actor = (request as any).user;
        const actingUser = actor?.userId
          ? await prisma.user.findUnique({ where: { id: actor.userId }, select: { firstName: true, lastName: true } })
          : null;
        const userName = actingUser ? `${actingUser.firstName} ${actingUser.lastName}`.trim() : 'Someone';

        const admins = await prisma.user.findMany({
          where: { role: 'ADMIN', isActive: true },
          select: { id: true },
        });
        const recipientIds = await excludeActorUnlessOptedIn(admins.map(a => a.id), actor?.userId);

        if (recipientIds.length > 0) {
          let batchInfo = '';
          if (body.dryingProcessId) {
            const dp = await prisma.dryingProcess.findUnique({
              where: { id: body.dryingProcessId },
              select: { batchNumber: true },
            });
            if (dp) batchInfo = ` for ${dp.batchNumber}`;
          }
          const totalTzs = body.totalPaid.toLocaleString('en-US', { maximumFractionDigits: 0 });
          const kwh = body.kwhAmount.toLocaleString('en-US', { maximumFractionDigits: 1 });

          const inAppIds = await filterRecipientsByPreference(recipientIds, 'LUKU_RECHARGE_ADDED', 'inApp');
          const telegramIds = await filterRecipientsByPreference(recipientIds, 'LUKU_RECHARGE_ADDED', 'telegram');

          if (inAppIds.length > 0) {
            await prisma.notification.createMany({
              data: inAppIds.map(rid => ({
                id: crypto.randomUUID(),
                userId: rid,
                type: 'LUKU_RECHARGE_ADDED',
                title: 'New Luku recharge',
                message: `${userName} logged a Luku recharge${batchInfo}: ${kwh} kWh for TZS ${totalTzs}`,
                linkUrl: `/dashboard/management/electricity`,
                isRead: false,
              })),
            });
          }
          if (telegramIds.length > 0) {
            const tgText =
              `⚡ *New Luku recharge*\n` +
              `By: ${userName}\n` +
              `Amount: *TZS ${totalTzs}*\n` +
              `kWh: ${kwh}` +
              (batchInfo ? `\nLinked to:${batchInfo}` : '');
            for (const rid of telegramIds) {
              void sendTelegramMessage({ userId: rid, text: tgText, parseMode: 'Markdown' });
            }
          }
        }
      } catch (notifyError) {
        console.error('Error sending luku-recharge notification:', notifyError);
      }

      return reply.status(201).send(recharge);
    } catch (error) {
      console.error('Error creating electricity recharge:', error);
      return reply.status(500).send({ error: 'Failed to create electricity recharge' });
    }
  });

  // Parse SMS and create recharge
  fastify.post('/recharges/parse-sms', async (request, reply) => {
    try {
      const { smsText } = request.body as { smsText: string };

      // Parse the SMS format:
      // TOKEN 5375 8923 5938 7140 3552 1399.3KWH Cost 408606.56 VAT 18% 73549.18 EWURA 1% 4086.07 REA 3% 12258.19 Debt Collected 1500.00 TOTAL TZS 500000.00 2025-10-03 18:08

      const tokenMatch = smsText.match(/TOKEN\s+([\d\s]+)/);
      const kwhMatch = smsText.match(/([\d.]+)KWH/);
      const costMatch = smsText.match(/Cost\s+([\d.]+)/);
      const vatMatch = smsText.match(/VAT\s+\d+%\s+([\d.]+)/);
      const ewuraMatch = smsText.match(/EWURA\s+\d+%\s+([\d.]+)/);
      const reaMatch = smsText.match(/REA\s+\d+%\s+([\d.]+)/);
      const debtMatch = smsText.match(/Debt Collected\s+([\d.]+)/);
      const totalMatch = smsText.match(/TOTAL\s+TZS\s+([\d.]+)/);
      const dateMatch = smsText.match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/);

      if (!tokenMatch || !kwhMatch || !totalMatch) {
        return reply.status(400).send({ error: 'Invalid SMS format. Could not parse required fields.' });
      }

      const token = tokenMatch[1].replace(/\s+/g, '');
      const kwhAmount = parseFloat(kwhMatch[1]);
      const totalPaid = parseFloat(totalMatch[1]);
      const baseCost = costMatch ? parseFloat(costMatch[1]) : undefined;
      const vat = vatMatch ? parseFloat(vatMatch[1]) : undefined;
      const ewuraFee = ewuraMatch ? parseFloat(ewuraMatch[1]) : undefined;
      const reaFee = reaMatch ? parseFloat(reaMatch[1]) : undefined;
      const debtCollected = debtMatch ? parseFloat(debtMatch[1]) : undefined;
      const rechargeDate = dateMatch ? new Date(dateMatch[1]) : new Date();

      const recharge = await prisma.electricityRecharge.create({
        data: {
          id: crypto.randomUUID(),
          rechargeDate,
          token,
          kwhAmount,
          totalPaid,
          baseCost,
          vat,
          ewuraFee,
          reaFee,
          debtCollected,
          notes: 'Parsed from SMS',
          updatedAt: new Date()
        }
      });

      return reply.status(201).send(recharge);
    } catch (error) {
      console.error('Error parsing SMS:', error);
      return reply.status(500).send({ error: 'Failed to parse SMS and create recharge' });
    }
  });

  // Delete a recharge
  fastify.delete('/recharges/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      // Read first so we can include details in the notification
      const existing = await prisma.electricityRecharge.findUnique({
        where: { id },
        include: { DryingProcess: { select: { batchNumber: true } } },
      });
      if (!existing) {
        return reply.status(404).send({ error: 'Recharge not found' });
      }

      await prisma.electricityRecharge.delete({ where: { id } });

      // Notify admins
      try {
        const actor = (request as any).user;
        const actingUser = actor?.userId
          ? await prisma.user.findUnique({ where: { id: actor.userId }, select: { firstName: true, lastName: true } })
          : null;
        const userName = actingUser ? `${actingUser.firstName} ${actingUser.lastName}`.trim() : 'Someone';

        const admins = await prisma.user.findMany({
          where: { role: 'ADMIN', isActive: true },
          select: { id: true },
        });
        const recipientIds = await excludeActorUnlessOptedIn(admins.map(a => a.id), actor?.userId);

        if (recipientIds.length > 0) {
          const totalTzs = existing.totalPaid.toLocaleString('en-US', { maximumFractionDigits: 0 });
          const kwh = existing.kwhAmount.toLocaleString('en-US', { maximumFractionDigits: 1 });
          const batchInfo = (existing as any).DryingProcess?.batchNumber
            ? ` (was linked to ${(existing as any).DryingProcess.batchNumber})`
            : '';

          const inAppIds = await filterRecipientsByPreference(recipientIds, 'LUKU_RECHARGE_DELETED', 'inApp');
          const telegramIds = await filterRecipientsByPreference(recipientIds, 'LUKU_RECHARGE_DELETED', 'telegram');

          if (inAppIds.length > 0) {
            await prisma.notification.createMany({
              data: inAppIds.map(rid => ({
                id: crypto.randomUUID(),
                userId: rid,
                type: 'LUKU_RECHARGE_DELETED',
                title: 'Luku recharge deleted',
                message: `${userName} deleted a Luku recharge: ${kwh} kWh / TZS ${totalTzs}${batchInfo}`,
                linkUrl: `/dashboard/management/electricity`,
                isRead: false,
              })),
            });
          }
          if (telegramIds.length > 0) {
            const tgText =
              `🗑️ *Luku recharge deleted*\n` +
              `By: ${userName}\n` +
              `Amount: TZS ${totalTzs}\n` +
              `kWh: ${kwh}` +
              (batchInfo ? `\n${batchInfo.trim()}` : '');
            for (const rid of telegramIds) {
              void sendTelegramMessage({ userId: rid, text: tgText, parseMode: 'Markdown' });
            }
          }
        }
      } catch (notifyError) {
        console.error('Error sending luku-recharge-deleted notification:', notifyError);
      }

      return reply.status(204).send();
    } catch (error) {
      console.error('Error deleting electricity recharge:', error);
      return reply.status(500).send({ error: 'Failed to delete electricity recharge' });
    }
  });
}

export default electricityRoutes;
