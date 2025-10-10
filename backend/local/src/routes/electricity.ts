import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';

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
}

async function electricityRoutes(fastify: FastifyInstance) {
  // Get all electricity recharges
  fastify.get('/recharges', async (request, reply) => {
    try {
      const recharges = await prisma.electricityRecharge.findMany({
        orderBy: {
          rechargeDate: 'desc'
        }
      });
      return recharges;
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

  // Create a new electricity recharge
  fastify.post('/recharges', async (request, reply) => {
    try {
      const body = request.body as ElectricityRechargeBody;

      const recharge = await prisma.electricityRecharge.create({
        data: {
          rechargeDate: new Date(body.rechargeDate),
          token: body.token,
          kwhAmount: body.kwhAmount,
          totalPaid: body.totalPaid,
          baseCost: body.baseCost,
          vat: body.vat,
          ewuraFee: body.ewuraFee,
          reaFee: body.reaFee,
          debtCollected: body.debtCollected,
          notes: body.notes
        }
      });

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
          rechargeDate,
          token,
          kwhAmount,
          totalPaid,
          baseCost,
          vat,
          ewuraFee,
          reaFee,
          debtCollected,
          notes: 'Parsed from SMS'
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

      await prisma.electricityRecharge.delete({
        where: { id }
      });

      return reply.status(204).send();
    } catch (error) {
      console.error('Error deleting electricity recharge:', error);
      return reply.status(500).send({ error: 'Failed to delete electricity recharge' });
    }
  });
}

export default electricityRoutes;
