import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { format, formatDistance, differenceInHours } from 'date-fns';

const telegramRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /telegram/menu
   * Get all active drying processes for Menu command
   */
  fastify.get('/menu', async (request, reply) => {
    try {
      const processes = await prisma.dryingProcess.findMany({
        where: {
          status: 'IN_PROGRESS'
        },
        include: {
          WoodType: true,
          DryingProcessItem: {
            include: {
              WoodType: true
            }
          },
          DryingReading: {
            orderBy: {
              readingTime: 'asc'
            }
          },
          ElectricityRecharge: {
            orderBy: {
              rechargeDate: 'asc'
            }
          }
        },
        orderBy: {
          startTime: 'desc'
        }
      });

      // Calculate estimates for each process
      const processesWithEstimates = processes.map((process: any) => {
        // Map PascalCase to camelCase for internal processing
        const readings = process.DryingReading || [];
        const items = process.DryingProcessItem || [];
        const recharges = process.ElectricityRecharge || [];
        const woodType = process.WoodType;

        const latestReading = readings[readings.length - 1];
        const currentHumidity = latestReading?.humidity || process.startingHumidity || 0;
        const targetHumidity = 12; // Default target

        // Calculate drying rate and estimate
        const estimate = calculateDryingEstimate(readings, currentHumidity, targetHumidity);

        // Calculate electricity usage (with recharge support) - SAME AS factory.ts
        let totalElectricityUsed = 0;
        const currentElectricity = latestReading?.electricityMeter || 0;
        const firstReading = readings[0]?.electricityMeter;

        for (let i = 0; i < readings.length; i++) {
          const currentReading = readings[i];
          const currentTime = new Date(currentReading.readingTime);

          let prevReading: number;
          let prevTime: Date;

          if (i === 0) {
            prevReading = process.startingElectricityUnits || firstReading;
            prevTime = new Date(process.startTime);
          } else {
            prevReading = readings[i - 1].electricityMeter;
            prevTime = new Date(readings[i - 1].readingTime);
          }

          // Find recharges between prev and current reading
          const rechargesBetween = recharges.filter((r: any) =>
            new Date(r.rechargeDate) > prevTime && new Date(r.rechargeDate) <= currentTime
          );

          if (rechargesBetween.length > 0) {
            // Recharge occurred - use formula: prevReading + recharged - currentReading
            const totalRecharged = rechargesBetween.reduce((sum: number, r: any) => sum + r.kwhAmount, 0);
            const consumed = prevReading + totalRecharged - currentReading.electricityMeter;
            totalElectricityUsed += Math.max(0, consumed);
          } else {
            // Normal consumption (prepaid meter counting down)
            const consumed = prevReading - currentReading.electricityMeter;
            if (consumed > 0) {
              totalElectricityUsed += consumed;
            }
          }
        }

        const electricityUsed = totalElectricityUsed;

        // Get LOT number (from associated wood receipt if available)
        // TODO: Link to actual LOT via wood receipt/slicing relationship
        const lotNumber = null;

        // Build wood type description from items (new multi-wood support) or fallback to old single woodType
        let woodTypeDesc = 'Unknown';
        let thicknessDesc = null;
        let pieceCountDesc = null;

        if (items && items.length > 0) {
          // New multi-wood format
          woodTypeDesc = items.map((item: any) => item.WoodType?.name || 'Unknown').join(', ');
          thicknessDesc = items.map((item: any) => item.thickness).join(', ');
          pieceCountDesc = items.reduce((sum: number, item: any) => sum + item.pieceCount, 0);
        } else if (woodType) {
          // Old single-wood format
          woodTypeDesc = woodType.name;
          thicknessDesc = process.thickness ? `${process.thickness}"` : null;
          pieceCountDesc = process.pieceCount;
        }

        return {
          id: process.id,
          batchNumber: process.batchNumber,
          woodType: woodTypeDesc,
          thickness: thicknessDesc,
          pieceCount: pieceCountDesc,
          currentHumidity: currentHumidity.toFixed(1),
          targetHumidity,
          currentElectricity: currentElectricity.toFixed(2),
          electricityUsed: Math.abs(electricityUsed).toFixed(2),
          estimatedDays: estimate.daysRemaining,
          estimatedDate: estimate.completionDate,
          dryingRate: estimate.dryingRate,
          lastReadingTime: latestReading?.readingTime || null,
          location: process.location || 'Kiln',
          lotNumber,
          status: process.status
        };
      });

      return processesWithEstimates;
    } catch (error) {
      console.error('Error fetching menu:', error);
      return reply.status(500).send({ error: 'Failed to fetch menu' });
    }
  });

  /**
   * GET /telegram/batches/active
   * Get list of active batches for selection
   */
  fastify.get('/batches/active', async (request, reply) => {
    try {
      const batches = await prisma.dryingProcess.findMany({
        where: {
          status: 'IN_PROGRESS'
        },
        include: {
          WoodType: true
        },
        orderBy: {
          startTime: 'desc'
        }
      });

      return batches.map((batch: any) => ({
        id: batch.id,
        batchNumber: batch.batchNumber,
        woodType: batch.WoodType?.name || 'Unknown'
      }));
    } catch (error) {
      console.error('Error fetching active batches:', error);
      return reply.status(500).send({ error: 'Failed to fetch batches' });
    }
  });

  /**
   * GET /telegram/batch/:id/status
   * Get detailed status for specific batch
   */
  fastify.get('/batch/:id/status', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      // Try to find by ID or batch number
      const process = await prisma.dryingProcess.findFirst({
        where: {
          OR: [
            { id },
            { batchNumber: id }
          ]
        },
        include: {
          WoodType: true,
          DryingReading: {
            orderBy: {
              readingTime: 'desc'
            },
            take: 20
          }
        }
      });

      if (!process) {
        return reply.status(404).send({ error: 'Batch not found' });
      }

      // Map PascalCase to camelCase
      const readings = (process as any).DryingReading || [];
      const woodType = (process as any).WoodType;

      const latestReading = readings[0];
      const currentHumidity = latestReading?.humidity || process.startingHumidity || 0;
      const targetHumidity = 12;

      const estimate = calculateDryingEstimate(readings, currentHumidity, targetHumidity);

      // Calculate total electricity used
      const firstReading = readings[readings.length - 1];
      const electricityUsed = latestReading && firstReading
        ? latestReading.electricityMeter - (process.startingElectricityUnits || firstReading.electricityMeter)
        : 0;

      // Calculate total duration
      const totalDuration = differenceInHours(new Date(), process.startTime) / 24;

      return {
        id: process.id,
        batchNumber: process.batchNumber,
        woodType: woodType?.name || 'Unknown',
        thickness: process.thickness ? `${process.thickness}"` : null,
        status: process.status,
        currentHumidity: currentHumidity.toFixed(1),
        targetHumidity,
        startTime: process.startTime,
        estimatedCompletion: estimate.completionDate,
        daysRemaining: estimate.daysRemaining,
        totalDuration: totalDuration.toFixed(1),
        dryingRate: estimate.dryingRate,
        electricityUsed: electricityUsed.toFixed(1),
        recentReadings: readings.slice(0, 5).map((r: any) => ({
          humidity: r.humidity,
          electricityMeter: r.electricityMeter,
          readingTime: r.readingTime
        })),
        lotNumber: null // TODO: Link to actual LOT
      };
    } catch (error) {
      console.error('Error fetching batch status:', error);
      return reply.status(500).send({ error: 'Failed to fetch status' });
    }
  });

  /**
   * GET /telegram/batch/:id/estimate
   * Get completion estimate for batch
   */
  fastify.get('/batch/:id/estimate', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const process = await prisma.dryingProcess.findFirst({
        where: {
          OR: [
            { id },
            { batchNumber: id }
          ]
        },
        include: {
          DryingReading: {
            orderBy: {
              readingTime: 'desc'
            },
            take: 10
          }
        }
      });

      if (!process) {
        return reply.status(404).send({ error: 'Batch not found' });
      }

      // Map PascalCase to camelCase
      const readings = (process as any).DryingReading || [];

      const latestReading = readings[0];
      const currentHumidity = latestReading?.humidity || process.startingHumidity || 0;
      const targetHumidity = 12;

      const estimate = calculateDryingEstimate(readings, currentHumidity, targetHumidity);

      return estimate;
    } catch (error) {
      console.error('Error calculating estimate:', error);
      return reply.status(500).send({ error: 'Failed to calculate estimate' });
    }
  });

  /**
   * POST /telegram/reading
   * Create a new reading from telegram bot
   */
  fastify.post('/reading', async (request, reply) => {
    try {
      const data = request.body as {
        batchId: string;
        humidity?: number;
        electricityMeter?: number;
        lukuMeterImageUrl?: string;
        humidityMeterImageUrl?: string;
        photoTimestamp?: string;
        ocrConfidence?: number;
        notes?: string;
      };

      // Validate required fields
      if (!data.batchId) {
        return reply.status(400).send({ error: 'batchId is required' });
      }

      if (!data.humidity && !data.electricityMeter) {
        return reply.status(400).send({ error: 'At least one reading (humidity or electricityMeter) is required' });
      }

      // Get process
      const process = await prisma.dryingProcess.findFirst({
        where: {
          OR: [
            { id: data.batchId },
            { batchNumber: data.batchId }
          ]
        }
      });

      if (!process) {
        return reply.status(404).send({ error: 'Batch not found' });
      }

      // Get latest reading to fill in missing values
      const latestReading = await prisma.dryingReading.findFirst({
        where: {
          dryingProcessId: process.id
        },
        orderBy: {
          readingTime: 'desc'
        }
      });

      // Create reading
      const reading = await prisma.dryingReading.create({
        data: {
          id: crypto.randomUUID(),
          dryingProcessId: process.id,
          humidity: data.humidity || latestReading?.humidity || process.startingHumidity || 0,
          electricityMeter: data.electricityMeter || latestReading?.electricityMeter || process.startingElectricityUnits || 0,
          lukuMeterImageUrl: data.lukuMeterImageUrl,
          humidityMeterImageUrl: data.humidityMeterImageUrl,
          photoTimestamp: data.photoTimestamp ? new Date(data.photoTimestamp) : null,
          ocrConfidence: data.ocrConfidence,
          source: 'TELEGRAM_BOT',
          notes: data.notes || 'Added via Telegram bot',
          createdByName: 'Telegram Bot',
          readingTime: data.photoTimestamp ? new Date(data.photoTimestamp) : new Date(),
          updatedAt: new Date()
        }
      });

      return reading;
    } catch (error) {
      console.error('Error creating reading:', error);
      return reply.status(500).send({ error: 'Failed to create reading' });
    }
  });
};

/**
 * Calculate drying estimate based on readings
 */
function calculateDryingEstimate(readings: any[], currentHumidity: number, targetHumidity: number) {
  if (readings.length < 2) {
    return {
      daysRemaining: null,
      completionDate: null,
      dryingRate: null,
      confidence: 'low'
    };
  }

  // Sort by time
  const sortedReadings = [...readings].sort((a, b) =>
    new Date(a.readingTime).getTime() - new Date(b.readingTime).getTime()
  );

  // Calculate drying rate from recent readings
  let totalRate = 0;
  let count = 0;

  for (let i = 1; i < Math.min(sortedReadings.length, 10); i++) {
    const timeDiff = differenceInHours(
      new Date(sortedReadings[i].readingTime),
      new Date(sortedReadings[i - 1].readingTime)
    );

    const humidityDiff = sortedReadings[i - 1].humidity - sortedReadings[i].humidity;

    if (timeDiff > 0 && humidityDiff >= 0) {
      totalRate += (humidityDiff / timeDiff) * 24; // Convert to % per day
      count++;
    }
  }

  const dryingRate = count > 0 ? totalRate / count : 0;

  if (dryingRate <= 0) {
    return {
      daysRemaining: null,
      completionDate: null,
      dryingRate: 0,
      confidence: 'low'
    };
  }

  // Calculate days remaining
  const humidityToGo = currentHumidity - targetHumidity;
  const daysRemaining = humidityToGo / dryingRate;

  // Calculate completion date from LAST READING time (not current time)
  const lastReading = sortedReadings[sortedReadings.length - 1];
  const completionDate = new Date(lastReading.readingTime);
  completionDate.setDate(completionDate.getDate() + daysRemaining);

  // Confidence based on number of readings
  const confidence = count >= 5 ? 'high' : count >= 3 ? 'medium' : 'low';

  return {
    daysRemaining: parseFloat(daysRemaining.toFixed(1)),
    completionDate: completionDate.toISOString(),
    dryingRate: parseFloat(dryingRate.toFixed(2)),
    confidence
  };
}

export default telegramRoutes;
