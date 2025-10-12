import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';

interface WoodCalculationData {
  user_id: string;
  wood_type_id: string;
  thickness: number;
  width: number;
  length: number;
  price_per_plank: number;
  tax_percentage: number;
  volume_m3: number;
  planks_per_m3: number;
  price_per_m3: number;
  notes?: string;
}

async function factoryRoutes(fastify: FastifyInstance) {
  // Get all calculations for a user
  fastify.get('/calculations', async (request, reply) => {
    try {
      const { user_id } = request.query as { user_id?: string };
      
      if (!user_id) {
        return reply.status(400).send({ error: 'user_id is required' });
      }

      const calculations = await prisma.woodCalculation.findMany({
        where: { userId: user_id },
        include: {
          woodType: true
        },
        orderBy: { createdAt: 'desc' }
      });

      // Transform to match frontend expectations (snake_case)
      const transformedCalculations = calculations.map(calc => ({
        id: calc.id,
        user_id: calc.userId,
        wood_type_id: calc.woodTypeId,
        thickness: calc.thickness,
        width: calc.width,
        length: calc.length,
        price_per_plank: calc.pricePerPlank,
        tax_percentage: 0, // Add default tax percentage
        volume_m3: calc.volumeM3,
        planks_per_m3: calc.planksPerM3,
        price_per_m3: calc.pricePerM3,
        notes: calc.notes,
        created_at: calc.createdAt,
        updated_at: calc.updatedAt,
        wood_type: calc.woodType
      }));

      return transformedCalculations;
    } catch (error) {
      console.error('Error fetching calculations:', error);
      return reply.status(500).send({ error: 'Failed to fetch calculations' });
    }
  });

  // Create a new calculation
  fastify.post('/calculations', async (request, reply) => {
    try {
      const data = request.body as WoodCalculationData;
      
      // Validate required fields
      if (!data.user_id || !data.wood_type_id || !data.thickness || !data.width || !data.length || !data.price_per_plank) {
        return reply.status(400).send({ error: 'Missing required fields' });
      }

      const calculation = await prisma.woodCalculation.create({
        data: {
          userId: data.user_id,
          woodTypeId: data.wood_type_id,
          thickness: data.thickness,
          width: data.width,
          length: data.length,
          pricePerPlank: data.price_per_plank,
          volumeM3: data.volume_m3,
          planksPerM3: data.planks_per_m3,
          pricePerM3: data.price_per_m3,
          notes: data.notes || ''
        },
        include: {
          woodType: true
        }
      });

      // Transform response to match frontend expectations
      const transformedCalculation = {
        id: calculation.id,
        user_id: calculation.userId,
        wood_type_id: calculation.woodTypeId,
        thickness: calculation.thickness,
        width: calculation.width,
        length: calculation.length,
        price_per_plank: calculation.pricePerPlank,
        tax_percentage: data.tax_percentage || 0,
        volume_m3: calculation.volumeM3,
        planks_per_m3: calculation.planksPerM3,
        price_per_m3: calculation.pricePerM3,
        notes: calculation.notes,
        created_at: calculation.createdAt,
        updated_at: calculation.updatedAt,
        wood_type: calculation.woodType
      };

      return transformedCalculation;
    } catch (error) {
      console.error('Error creating calculation:', error);
      return reply.status(500).send({ error: 'Failed to create calculation' });
    }
  });

  // Delete a calculation
  fastify.delete('/calculations/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      
      await prisma.woodCalculation.delete({
        where: { id }
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting calculation:', error);
      return reply.status(500).send({ error: 'Failed to delete calculation' });
    }
  });

  // Get wood types
  fastify.get('/wood-types', async (request, reply) => {
    try {
      const woodTypes = await prisma.woodType.findMany({
        orderBy: { name: 'asc' }
      });

      return woodTypes;
    } catch (error) {
      console.error('Error fetching wood types:', error);
      return reply.status(500).send({ error: 'Failed to fetch wood types' });
    }
  });

  // Create a new wood type
  fastify.post('/wood-types', async (request, reply) => {
    try {
      const data = request.body as any;

      if (!data.name) {
        return reply.status(400).send({ error: 'Name is required' });
      }

      const woodType = await prisma.woodType.create({
        data: {
          name: data.name,
          description: data.description || null,
          density: data.density || null,
          grade: data.grade || 'STANDARD',
          origin: data.origin || null
        }
      });

      return woodType;
    } catch (error) {
      console.error('Error creating wood type:', error);
      return reply.status(500).send({ error: 'Failed to create wood type' });
    }
  });

  // Update a wood type
  fastify.put('/wood-types/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as any;

      if (!data.name) {
        return reply.status(400).send({ error: 'Name is required' });
      }

      const woodType = await prisma.woodType.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description || null,
          density: data.density || null,
          grade: data.grade || 'STANDARD',
          origin: data.origin || null
        }
      });

      return woodType;
    } catch (error) {
      console.error('Error updating wood type:', error);
      return reply.status(500).send({ error: 'Failed to update wood type' });
    }
  });

  // Delete a wood type
  fastify.delete('/wood-types/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      await prisma.woodType.delete({
        where: { id }
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting wood type:', error);
      return reply.status(500).send({ error: 'Failed to delete wood type' });
    }
  });

  // Get factory list
  fastify.get('/', async (request, reply) => {
    try {
      const factories = await prisma.factory.findMany({
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return factories;
    } catch (error) {
      console.error('Error fetching factories:', error);
      return reply.status(500).send({ error: 'Failed to fetch factories' });
    }
  });

  // Create a new factory
  fastify.post('/', async (request, reply) => {
    try {
      const { name, userId } = request.body as { name: string; userId: string };

      if (!name || !userId) {
        return reply.status(400).send({ error: 'Name and userId are required' });
      }

      const factory = await prisma.factory.create({
        data: {
          name,
          userId
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      return factory;
    } catch (error) {
      console.error('Error creating factory:', error);
      return reply.status(500).send({ error: 'Failed to create factory' });
    }
  });

  // Get all operations
  fastify.get('/operations', async (request, reply) => {
    try {
      const { status } = request.query as { status?: string };

      const operations = await prisma.operation.findMany({
        where: status ? { status } : undefined,
        include: {
          woodType: true
        },
        orderBy: { createdAt: 'desc' }
      });

      // Transform to match frontend expectations (snake_case)
      const transformedOperations = operations.map(op => ({
        id: op.id,
        serial_number: op.serialNumber,
        wood_type_id: op.woodTypeId,
        lot_number: op.lotNumber,
        start_time: op.startTime?.toISOString() || null,
        end_time: op.endTime?.toISOString() || null,
        sleeper_sizes: op.sleeperSizes,
        plank_sizes: op.plankSizes,
        status: op.status,
        waste_percentage: op.wastePercentage,
        notes: op.notes,
        created_at: op.createdAt.toISOString(),
        updated_at: op.updatedAt.toISOString(),
        wood_type: op.woodType
      }));

      return transformedOperations;
    } catch (error) {
      console.error('Error fetching operations:', error);
      return reply.status(500).send({ error: 'Failed to fetch operations' });
    }
  });

  // Get a single operation by ID
  fastify.get('/operations/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const operation = await prisma.operation.findUnique({
        where: { id },
        include: {
          woodType: true
        }
      });

      if (!operation) {
        return reply.status(404).send({ error: 'Operation not found' });
      }

      // Transform to match frontend expectations
      const transformed = {
        id: operation.id,
        serial_number: operation.serialNumber,
        wood_type_id: operation.woodTypeId,
        lot_number: operation.lotNumber,
        start_time: operation.startTime?.toISOString() || null,
        end_time: operation.endTime?.toISOString() || null,
        sleeper_sizes: operation.sleeperSizes,
        plank_sizes: operation.plankSizes,
        status: operation.status,
        waste_percentage: operation.wastePercentage,
        notes: operation.notes,
        created_at: operation.createdAt.toISOString(),
        updated_at: operation.updatedAt.toISOString(),
        wood_type: operation.woodType
      };

      return transformed;
    } catch (error) {
      console.error('Error fetching operation:', error);
      return reply.status(500).send({ error: 'Failed to fetch operation' });
    }
  });

  // Create a new operation
  fastify.post('/operations', async (request, reply) => {
    try {
      const data = request.body as any;

      if (!data.serial_number || !data.wood_type_id || !data.lot_number) {
        return reply.status(400).send({ error: 'serial_number, wood_type_id, and lot_number are required' });
      }

      const operation = await prisma.operation.create({
        data: {
          serialNumber: data.serial_number,
          woodTypeId: data.wood_type_id,
          lotNumber: data.lot_number,
          startTime: data.start_time ? new Date(data.start_time) : null,
          endTime: data.end_time ? new Date(data.end_time) : null,
          sleeperSizes: data.sleeper_sizes || [],
          plankSizes: data.plank_sizes || [],
          status: data.status || 'draft',
          wastePercentage: data.waste_percentage || null,
          notes: data.notes || null
        },
        include: {
          woodType: true
        }
      });

      // Transform response
      const transformed = {
        id: operation.id,
        serial_number: operation.serialNumber,
        wood_type_id: operation.woodTypeId,
        lot_number: operation.lotNumber,
        start_time: operation.startTime?.toISOString() || null,
        end_time: operation.endTime?.toISOString() || null,
        sleeper_sizes: operation.sleeperSizes,
        plank_sizes: operation.plankSizes,
        status: operation.status,
        waste_percentage: operation.wastePercentage,
        notes: operation.notes,
        created_at: operation.createdAt.toISOString(),
        updated_at: operation.updatedAt.toISOString(),
        wood_type: operation.woodType
      };

      return transformed;
    } catch (error) {
      console.error('Error creating operation:', error);
      return reply.status(500).send({ error: 'Failed to create operation' });
    }
  });

  // Update an operation
  fastify.patch('/operations/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as any;

      const operation = await prisma.operation.update({
        where: { id },
        data: {
          serialNumber: data.serial_number,
          woodTypeId: data.wood_type_id,
          lotNumber: data.lot_number,
          startTime: data.start_time ? new Date(data.start_time) : null,
          endTime: data.end_time ? new Date(data.end_time) : null,
          sleeperSizes: data.sleeper_sizes,
          plankSizes: data.plank_sizes,
          status: data.status,
          wastePercentage: data.waste_percentage || null,
          notes: data.notes || null
        },
        include: {
          woodType: true
        }
      });

      // Transform response
      const transformed = {
        id: operation.id,
        serial_number: operation.serialNumber,
        wood_type_id: operation.woodTypeId,
        lot_number: operation.lotNumber,
        start_time: operation.startTime?.toISOString() || null,
        end_time: operation.endTime?.toISOString() || null,
        sleeper_sizes: operation.sleeperSizes,
        plank_sizes: operation.plankSizes,
        status: operation.status,
        waste_percentage: operation.wastePercentage,
        notes: operation.notes,
        created_at: operation.createdAt.toISOString(),
        updated_at: operation.updatedAt.toISOString(),
        wood_type: operation.woodType
      };

      return transformed;
    } catch (error) {
      console.error('Error updating operation:', error);
      return reply.status(500).send({ error: 'Failed to update operation' });
    }
  });

  // Complete an operation
  fastify.patch('/operations/:id/complete', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as any;

      const operation = await prisma.operation.update({
        where: { id },
        data: {
          status: 'completed',
          endTime: data.end_time ? new Date(data.end_time) : new Date()
        },
        include: {
          woodType: true
        }
      });

      // Transform response
      const transformed = {
        id: operation.id,
        serial_number: operation.serialNumber,
        wood_type_id: operation.woodTypeId,
        lot_number: operation.lotNumber,
        start_time: operation.startTime?.toISOString() || null,
        end_time: operation.endTime?.toISOString() || null,
        sleeper_sizes: operation.sleeperSizes,
        plank_sizes: operation.plankSizes,
        status: operation.status,
        waste_percentage: operation.wastePercentage,
        notes: operation.notes,
        created_at: operation.createdAt.toISOString(),
        updated_at: operation.updatedAt.toISOString(),
        wood_type: operation.woodType
      };

      return transformed;
    } catch (error) {
      console.error('Error completing operation:', error);
      return reply.status(500).send({ error: 'Failed to complete operation' });
    }
  });

  // Delete an operation
  fastify.delete('/operations/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      await prisma.operation.delete({
        where: { id }
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting operation:', error);
      return reply.status(500).send({ error: 'Failed to delete operation' });
    }
  });

  // Get approval requests
  fastify.get('/approval-requests', async (request, reply) => {
    try {
      // For now, return empty array - approval system can be implemented later
      return [];
    } catch (error) {
      console.error('Error fetching approval requests:', error);
      return reply.status(500).send({ error: 'Failed to fetch approval requests' });
    }
  });

  // ===== DRYING PROCESS ROUTES =====

  // Get all drying processes
  fastify.get('/drying-processes', async (request, reply) => {
    try {
      const processes = await prisma.dryingProcess.findMany({
        include: {
          woodType: true,
          readings: {
            orderBy: { readingTime: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return processes;
    } catch (error) {
      console.error('Error fetching drying processes:', error);
      return reply.status(500).send({ error: 'Failed to fetch drying processes' });
    }
  });

  // Get single drying process by ID
  fastify.get('/drying-processes/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const process = await prisma.dryingProcess.findUnique({
        where: { id },
        include: {
          woodType: true,
          readings: {
            orderBy: { readingTime: 'asc' }
          }
        }
      });

      if (!process) {
        return reply.status(404).send({ error: 'Drying process not found' });
      }

      return process;
    } catch (error) {
      console.error('Error fetching drying process:', error);
      return reply.status(500).send({ error: 'Failed to fetch drying process' });
    }
  });

  // Create new drying process
  fastify.post('/drying-processes', async (request, reply) => {
    try {
      const data = request.body as {
        woodTypeId: string;
        thickness: number;
        thicknessUnit?: string;
        pieceCount: number;
        startingHumidity?: number;
        startingElectricityUnits?: number;
        startTime: string;
        notes?: string;
      };

      // Validate required fields
      if (!data.woodTypeId || !data.thickness || !data.pieceCount || !data.startTime) {
        return reply.status(400).send({ error: 'Missing required fields' });
      }

      // Generate unique batch number
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
      const count = await prisma.dryingProcess.count({
        where: {
          batchNumber: {
            startsWith: `DRY-${dateStr}`
          }
        }
      });
      const batchNumber = `DRY-${dateStr}-${String(count + 1).padStart(3, '0')}`;

      const process = await prisma.dryingProcess.create({
        data: {
          batchNumber,
          woodTypeId: data.woodTypeId,
          thickness: data.thickness,
          thicknessUnit: data.thicknessUnit || 'mm',
          pieceCount: data.pieceCount,
          startingHumidity: data.startingHumidity,
          startingElectricityUnits: data.startingElectricityUnits,
          startTime: new Date(data.startTime),
          notes: data.notes || '',
          status: 'IN_PROGRESS'
        },
        include: {
          woodType: true,
          readings: true
        }
      });

      return process;
    } catch (error) {
      console.error('Error creating drying process:', error);
      return reply.status(500).send({ error: 'Failed to create drying process' });
    }
  });

  // Update drying process
  fastify.put('/drying-processes/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as {
        woodTypeId?: string;
        thickness?: number;
        thicknessUnit?: string;
        pieceCount?: number;
        startingHumidity?: number;
        startingElectricityUnits?: number;
        startTime?: string;
        status?: string;
        endTime?: string;
        totalCost?: number;
        notes?: string;
      };

      // If completing the process, calculate cost
      let calculatedCost = data.totalCost;
      if (data.status === 'COMPLETED') {
        // Fetch the process with readings
        const processWithReadings = await prisma.dryingProcess.findUnique({
          where: { id },
          include: {
            readings: {
              orderBy: { readingTime: 'asc' }
            }
          }
        });

        if (processWithReadings && processWithReadings.readings.length >= 2) {
          // Get electricity price from settings
          const electricityPriceSetting = await prisma.setting.findUnique({
            where: { key: 'electricityPricePerKWh' }
          });

          const pricePerKWh = electricityPriceSetting
            ? parseFloat(electricityPriceSetting.value)
            : 0.15; // Default fallback

          // Calculate total electricity used
          const firstReading = processWithReadings.readings[0].electricityMeter;
          const lastReading = processWithReadings.readings[processWithReadings.readings.length - 1].electricityMeter;
          const totalKWh = lastReading - firstReading;

          // Calculate cost
          calculatedCost = totalKWh * pricePerKWh;
        }
      }

      const process = await prisma.dryingProcess.update({
        where: { id },
        data: {
          ...(data.woodTypeId && { woodTypeId: data.woodTypeId }),
          ...(data.thickness !== undefined && { thickness: data.thickness }),
          ...(data.thicknessUnit && { thicknessUnit: data.thicknessUnit }),
          ...(data.pieceCount !== undefined && { pieceCount: data.pieceCount }),
          ...(data.startingHumidity !== undefined && { startingHumidity: data.startingHumidity }),
          ...(data.startingElectricityUnits !== undefined && { startingElectricityUnits: data.startingElectricityUnits }),
          ...(data.startTime && { startTime: new Date(data.startTime) }),
          ...(data.status && { status: data.status }),
          ...(data.endTime && { endTime: new Date(data.endTime) }),
          ...(calculatedCost !== undefined && { totalCost: calculatedCost }),
          ...(data.notes !== undefined && { notes: data.notes })
        },
        include: {
          woodType: true,
          readings: {
            orderBy: { readingTime: 'asc' }
          }
        }
      });

      return process;
    } catch (error) {
      console.error('Error updating drying process:', error);
      return reply.status(500).send({ error: 'Failed to update drying process' });
    }
  });

  // Delete drying process
  fastify.delete('/drying-processes/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      await prisma.dryingProcess.delete({
        where: { id }
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting drying process:', error);
      return reply.status(500).send({ error: 'Failed to delete drying process' });
    }
  });

  // Add reading to drying process
  fastify.post('/drying-processes/:id/readings', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as {
        electricityMeter: number;
        humidity: number;
        readingTime?: string;
        notes?: string;
        lukuSms?: string;
      };

      // Validate required fields
      if (data.electricityMeter === undefined || data.humidity === undefined) {
        return reply.status(400).send({ error: 'Missing required fields' });
      }

      // Verify process exists
      const process = await prisma.dryingProcess.findUnique({
        where: { id }
      });

      if (!process) {
        return reply.status(404).send({ error: 'Drying process not found' });
      }

      const reading = await prisma.dryingReading.create({
        data: {
          dryingProcessId: id,
          electricityMeter: data.electricityMeter,
          humidity: data.humidity,
          readingTime: data.readingTime ? new Date(data.readingTime) : new Date(),
          notes: data.notes || '',
          lukuSms: data.lukuSms || null
        }
      });

      return reading;
    } catch (error) {
      console.error('Error adding reading:', error);
      return reply.status(500).send({ error: 'Failed to add reading' });
    }
  });

  // Update reading
  fastify.put('/drying-readings/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as {
        electricityMeter?: number;
        humidity?: number;
        readingTime?: string;
        notes?: string;
        lukuSms?: string;
      };

      const reading = await prisma.dryingReading.update({
        where: { id },
        data: {
          ...(data.electricityMeter !== undefined && { electricityMeter: data.electricityMeter }),
          ...(data.humidity !== undefined && { humidity: data.humidity }),
          ...(data.readingTime !== undefined && { readingTime: new Date(data.readingTime) }),
          ...(data.notes !== undefined && { notes: data.notes }),
          ...(data.lukuSms !== undefined && { lukuSms: data.lukuSms })
        }
      });

      return reading;
    } catch (error) {
      console.error('Error updating reading:', error);
      return reply.status(500).send({ error: 'Failed to update reading' });
    }
  });

  // Delete reading
  fastify.delete('/drying-readings/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      await prisma.dryingReading.delete({
        where: { id }
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting reading:', error);
      return reply.status(500).send({ error: 'Failed to delete reading' });
    }
  });

  // ===== RECEIPT DRAFT ROUTES =====

  // Get drafts (optionally filtered by receipt_id)
  fastify.get('/drafts', async (request, reply) => {
    try {
      const { receipt_id } = request.query as { receipt_id?: string };

      const drafts = await prisma.receiptDraft.findMany({
        where: receipt_id ? { receiptId: receipt_id } : undefined,
        orderBy: { updatedAt: 'desc' }
      });

      return drafts;
    } catch (error) {
      console.error('Error fetching drafts:', error);
      return reply.status(500).send({ error: 'Failed to fetch drafts' });
    }
  });

  // Create new draft
  fastify.post('/drafts', async (request, reply) => {
    try {
      const data = request.body as {
        receipt_id: string;
        measurements: any[];
        updated_by: string;
      };

      console.log('Received draft data:', JSON.stringify(data, null, 2));

      if (!data.receipt_id || !data.measurements || !data.updated_by) {
        console.log('Validation failed:', {
          has_receipt_id: !!data.receipt_id,
          has_measurements: !!data.measurements,
          has_updated_by: !!data.updated_by
        });
        return reply.status(400).send({ error: 'Missing required fields' });
      }

      const draft = await prisma.receiptDraft.create({
        data: {
          receiptId: data.receipt_id,
          measurements: data.measurements,
          updatedBy: data.updated_by
        }
      });

      // Update Wood Receipt status to PENDING when first draft is saved
      const receipt = await prisma.woodReceipt.findFirst({
        where: { lotNumber: data.receipt_id }
      });

      if (receipt && receipt.status === 'CREATED') {
        await prisma.woodReceipt.update({
          where: { id: receipt.id },
          data: { status: 'PENDING' }
        });
        console.log(`Updated receipt ${data.receipt_id} status to PENDING`);
      }

      return draft;
    } catch (error) {
      console.error('Error creating draft:', error);
      return reply.status(500).send({ error: 'Failed to create draft' });
    }
  });

  // Update existing draft
  fastify.patch('/drafts/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as {
        measurements?: any[];
        updated_at?: string;
        updated_by?: string;
      };

      const draft = await prisma.receiptDraft.update({
        where: { id },
        data: {
          ...(data.measurements && { measurements: data.measurements }),
          ...(data.updated_by && { updatedBy: data.updated_by })
        }
      });

      // Update Wood Receipt status to PENDING when measurements are being filled
      const existingDraft = await prisma.receiptDraft.findUnique({
        where: { id }
      });

      if (existingDraft) {
        const receipt = await prisma.woodReceipt.findFirst({
          where: { lotNumber: existingDraft.receiptId }
        });

        if (receipt && receipt.status === 'CREATED') {
          await prisma.woodReceipt.update({
            where: { id: receipt.id },
            data: { status: 'PENDING' }
          });
          console.log(`Updated receipt ${existingDraft.receiptId} status to PENDING`);
        }
      }

      return draft;
    } catch (error) {
      console.error('Error updating draft:', error);
      return reply.status(500).send({ error: 'Failed to update draft' });
    }
  });

  // Delete draft
  fastify.delete('/drafts/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      await prisma.receiptDraft.delete({
        where: { id }
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting draft:', error);
      return reply.status(500).send({ error: 'Failed to delete draft' });
    }
  });

  // ===== RECEIPT HISTORY ROUTES =====

  // Get receipt history (optionally filtered by receipt_id)
  fastify.get('/receipt-history', async (request, reply) => {
    try {
      const { receipt_id } = request.query as { receipt_id?: string };

      const history = await prisma.receiptHistory.findMany({
        where: receipt_id ? { receiptId: receipt_id } : undefined,
        orderBy: { timestamp: 'desc' }
      });

      return history;
    } catch (error) {
      console.error('Error fetching receipt history:', error);
      return reply.status(500).send({ error: 'Failed to fetch receipt history' });
    }
  });

  // Create history entry
  fastify.post('/receipt-history', async (request, reply) => {
    try {
      const data = request.body as {
        receipt_id: string;
        user_id: string;
        user_name: string;
        action: string;
        details: string;
        timestamp?: string;
      };

      if (!data.receipt_id || !data.user_id || !data.user_name || !data.action || !data.details) {
        return reply.status(400).send({ error: 'Missing required fields' });
      }

      const history = await prisma.receiptHistory.create({
        data: {
          receiptId: data.receipt_id,
          userId: data.user_id,
          userName: data.user_name,
          action: data.action,
          details: data.details,
          timestamp: data.timestamp ? new Date(data.timestamp) : new Date()
        }
      });

      return history;
    } catch (error) {
      console.error('Error creating history entry:', error);
      return reply.status(500).send({ error: 'Failed to create history entry' });
    }
  });
}

export default factoryRoutes; 