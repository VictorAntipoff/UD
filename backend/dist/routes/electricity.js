import { prisma } from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
async function electricityRoutes(fastify) {
    // SECURITY: Protect all electricity routes with authentication
    fastify.addHook('onRequest', authenticateToken);
    // Get all electricity recharges
    fastify.get('/recharges', async (request, reply) => {
        try {
            const recharges = await prisma.electricityRecharge.findMany({
                orderBy: {
                    rechargeDate: 'desc'
                }
            });
            return recharges;
        }
        catch (error) {
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
        }
        catch (error) {
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
                    readings: {
                        orderBy: { readingTime: 'asc' }
                    }
                }
            });
            let totalUsed = 0;
            for (const process of processes) {
                if (process.readings.length > 0) {
                    const readings = process.readings;
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
                        }
                        else if (diff > 100) {
                            // Large positive jump = recharge happened, don't count it as usage
                            continue;
                        }
                        else {
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
                        }
                        else if (diff <= 100) {
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
        }
        catch (error) {
            console.error('Error calculating electricity balance:', error);
            return reply.status(500).send({ error: 'Failed to calculate electricity balance' });
        }
    });
    // Create a new electricity recharge
    fastify.post('/recharges', async (request, reply) => {
        try {
            const body = request.body;
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
        }
        catch (error) {
            console.error('Error creating electricity recharge:', error);
            return reply.status(500).send({ error: 'Failed to create electricity recharge' });
        }
    });
    // Parse SMS and create recharge
    fastify.post('/recharges/parse-sms', async (request, reply) => {
        try {
            const { smsText } = request.body;
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
        }
        catch (error) {
            console.error('Error parsing SMS:', error);
            return reply.status(500).send({ error: 'Failed to parse SMS and create recharge' });
        }
    });
    // Delete a recharge
    fastify.delete('/recharges/:id', async (request, reply) => {
        try {
            const { id } = request.params;
            await prisma.electricityRecharge.delete({
                where: { id }
            });
            return reply.status(204).send();
        }
        catch (error) {
            console.error('Error deleting electricity recharge:', error);
            return reply.status(500).send({ error: 'Failed to delete electricity recharge' });
        }
    });
}
export default electricityRoutes;
