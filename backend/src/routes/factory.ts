// @ts-nocheck

import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import PDFDocument from 'pdfkit';

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
  // SECURITY: Protect all factory routes with authentication
  fastify.addHook('onRequest', authenticateToken);

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
          WoodType: true
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
          id: crypto.randomUUID(),
          userId: data.user_id,
          woodTypeId: data.wood_type_id,
          thickness: data.thickness,
          width: data.width,
          length: data.length,
          pricePerPlank: data.price_per_plank,
          volumeM3: data.volume_m3,
          planksPerM3: data.planks_per_m3,
          pricePerM3: data.price_per_m3,
          notes: data.notes || '',
          updatedAt: new Date()
        },
        include: {
          WoodType: true
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
          id: crypto.randomUUID(),
          name: data.name,
          description: data.description || null,
          density: data.density || null,
          grade: data.grade || 'STANDARD',
          origin: data.origin || null,
          updatedAt: new Date()
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
    } catch (error: any) {
      console.error('Error deleting wood type:', error);

      // Check if it's a foreign key constraint error
      if (error.code === 'P2003' || error.code === 'P2014') {
        return reply.status(400).send({
          error: 'Cannot delete wood type that is being used in calculations, processes, or receipts. Please delete those records first.'
        });
      }

      return reply.status(500).send({ error: 'Failed to delete wood type' });
    }
  });

  // Get factory list
  fastify.get('/', async (request, reply) => {
    try {
      const factories = await prisma.factory.findMany({
        include: {
          User: {
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
          id: crypto.randomUUID(),
          name,
          userId,
          updatedAt: new Date()
        },
        include: {
          User: {
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
          WoodType: true
        },
        orderBy: { createdAt: 'desc' }
      });

      // Transform to match frontend expectations (snake_case)
      const transformedOperations = operations.map(op => ({
        id: op.id,
        serial_number: op.serialNumber,
        wood_type_id: op.woodTypeId,
        lot_number: op.lotNumber,
        sleeper_number: op.sleeperNumber,
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

      console.log('GET /operations - Returning', transformedOperations.length, 'operations');
      transformedOperations.forEach((op, index) => {
        console.log(`  Operation ${index + 1} (${op.id}): Sleeper #${op.sleeper_number}, Planks:`, Array.isArray(op.plank_sizes) ? op.plank_sizes.length : 'not array');
      });

      return transformedOperations;
    } catch (error) {
      console.error('Error fetching operations:', error);
      return reply.status(500).send({ error: 'Failed to fetch operations' });
    }
  });

  // Check if LOT has existing operations
  fastify.get('/operations/check-lot', async (request, reply) => {
    try {
      const { lot_number } = request.query as { lot_number?: string };

      if (!lot_number) {
        return reply.status(400).send({ error: 'lot_number is required' });
      }

      const operations = await prisma.operation.findMany({
        where: {
          lotNumber: lot_number,
          status: { not: 'completed' } // Only check for non-completed operations
        }
      });

      return {
        exists: operations.length > 0,
        operations: operations.map(op => ({
          id: op.id,
          serial_number: op.serialNumber,
          status: op.status
        }))
      };
    } catch (error) {
      console.error('Error checking LOT:', error);
      return reply.status(500).send({ error: 'Failed to check LOT' });
    }
  });

  // Get a single operation by ID
  fastify.get('/operations/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const operation = await prisma.operation.findUnique({
        where: { id },
        include: {
          WoodType: true
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
        sleeper_number: operation.sleeperNumber,
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

      console.log('GET /operations/:id - Returning operation:', operation.id);
      console.log('Plank sizes type:', typeof operation.plankSizes, 'isArray:', Array.isArray(operation.plankSizes));
      console.log('Plank sizes count:', Array.isArray(operation.plankSizes) ? operation.plankSizes.length : 'not an array');
      console.log('Plank sizes data:', JSON.stringify(operation.plankSizes));

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
          id: crypto.randomUUID(),
          serialNumber: data.serial_number,
          woodTypeId: data.wood_type_id,
          lotNumber: data.lot_number,
          sleeperNumber: data.sleeper_number || null,
          startTime: data.start_time ? new Date(data.start_time) : null,
          endTime: data.end_time ? new Date(data.end_time) : null,
          sleeperSizes: data.sleeper_sizes || [],
          plankSizes: data.plank_sizes || [],
          status: data.status || 'draft',
          wastePercentage: data.waste_percentage || null,
          notes: data.notes || null,
          updatedAt: new Date()
        },
        include: {
          WoodType: true
        }
      });

      // Transform response
      const transformed = {
        id: operation.id,
        serial_number: operation.serialNumber,
        wood_type_id: operation.woodTypeId,
        lot_number: operation.lotNumber,
        sleeper_number: operation.sleeperNumber,
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

      console.log('PATCH /operations/:id - Received data for operation:', id);
      console.log('Plank sizes in request:', typeof data.plank_sizes, 'isArray:', Array.isArray(data.plank_sizes));
      console.log('Plank sizes count:', Array.isArray(data.plank_sizes) ? data.plank_sizes.length : 'not an array');
      console.log('Plank sizes data:', JSON.stringify(data.plank_sizes));

      // Build update data object
      const updateData: any = {
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
      };

      // Only update sleeperNumber if it's provided in the request
      if (data.sleeper_number !== undefined) {
        updateData.sleeperNumber = data.sleeper_number;
      }

      const operation = await prisma.operation.update({
        where: { id },
        data: updateData,
        include: {
          WoodType: true
        }
      });

      console.log('PATCH /operations/:id - After save, plank sizes:', typeof operation.plankSizes, 'count:', Array.isArray(operation.plankSizes) ? operation.plankSizes.length : 'not array');

      // Check if all sleepers in the LOT have been sliced
      if (data.auto_check_completion) {
        // Get total sleepers from draft
        const drafts = await prisma.receiptDraft.findMany({
          where: { receiptId: operation.lotNumber }
        });

        if (drafts.length > 0) {
          const measurements = drafts[0].measurements as any[];
          const totalSleepers = Array.isArray(measurements) ? measurements.length : 0;

          // Count sliced sleepers for this LOT
          const slicedOperations = await prisma.operation.findMany({
            where: {
              lotNumber: operation.lotNumber,
              status: { in: ['draft', 'pending_approval', 'supervisor_approved', 'admin_approved', 'completed'] }
            }
          });

          const slicedSleeperNumbers = new Set(
            slicedOperations
              .filter(op => op.sleeperNumber !== null)
              .map(op => op.sleeperNumber)
          );

          // If all sleepers are sliced, auto-submit for approval
          if (totalSleepers > 0 && slicedSleeperNumbers.size >= totalSleepers) {
            // Update all draft operations to pending_approval
            await prisma.operation.updateMany({
              where: {
                lotNumber: operation.lotNumber,
                status: 'draft'
              },
              data: {
                status: 'pending_approval'
              }
            });

            // Create supervisor approval request for each operation
            const draftOps = await prisma.operation.findMany({
              where: {
                lotNumber: operation.lotNumber,
                status: 'pending_approval'
              }
            });

            for (const op of draftOps) {
              // Check if approval already exists
              const existingApproval = await prisma.approval.findFirst({
                where: {
                  operationId: op.id,
                  approverRole: 'SUPERVISOR'
                }
              });

              if (!existingApproval) {
                await prisma.approval.create({
                  data: {
                    id: crypto.randomUUID(),
                    operationId: op.id,
                    approverRole: 'SUPERVISOR',
                    status: 'pending',
                    updatedAt: new Date()
                  }
                });
              }
            }
          }
        }
      }

      // Transform response
      const transformed = {
        id: operation.id,
        serial_number: operation.serialNumber,
        wood_type_id: operation.woodTypeId,
        lot_number: operation.lotNumber,
        sleeper_number: operation.sleeperNumber,
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
          WoodType: true
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
      // Auto-fix orphaned "Under Drying" stock on each fetch
      try {
        const activeProcesses = await prisma.dryingProcess.findMany({
          where: { status: 'IN_PROGRESS' },
          include: { DryingProcessItem: true }
        });

        const expectedUnderDrying = new Map<string, number>();
        for (const process of activeProcesses) {
          if (process.DryingProcessItem && process.DryingProcessItem.length > 0) {
            for (const item of process.DryingProcessItem) {
              const key = `${item.sourceWarehouseId}-${item.woodTypeId}-${item.thickness}`;
              expectedUnderDrying.set(key, (expectedUnderDrying.get(key) || 0) + item.pieceCount);
            }
          } else if (process.useStock && process.sourceWarehouseId && process.woodTypeId && process.stockThickness && process.pieceCount) {
            const key = `${process.sourceWarehouseId}-${process.woodTypeId}-${process.stockThickness}`;
            expectedUnderDrying.set(key, (expectedUnderDrying.get(key) || 0) + process.pieceCount);
          }
        }

        const stockWithUnderDrying = await prisma.stock.findMany({
          where: { statusUnderDrying: { gt: 0 } }
        });

        for (const stock of stockWithUnderDrying) {
          const key = `${stock.warehouseId}-${stock.woodTypeId}-${stock.thickness}`;
          const expected = expectedUnderDrying.get(key) || 0;
          const orphaned = stock.statusUnderDrying - expected;
          if (orphaned > 0) {
            await prisma.stock.update({
              where: { id: stock.id },
              data: {
                statusUnderDrying: { decrement: orphaned },
                statusNotDried: { increment: orphaned }
              }
            });
            console.log(`Auto-fixed orphaned stock: ${orphaned} pieces moved from UnderDrying to NotDried`);
          }
        }
      } catch (fixError) {
        console.error('Error auto-fixing orphaned stock:', fixError);
      }

      const processes = await prisma.dryingProcess.findMany({
        include: {
          WoodType: true,
          DryingReading: {
            orderBy: { readingTime: 'asc' }
          },
          ElectricityRecharge: {
            orderBy: { rechargeDate: 'asc' }
          },
          DryingProcessItem: {
            include: {
              WoodType: true,
              Warehouse: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return processes.map(p => ({
        ...p,
        woodType: (p as any).WoodType,
        readings: (p as any).DryingReading || [],
        recharges: (p as any).ElectricityRecharge || [],
        items: (p as any).DryingProcessItem?.map((item: any) => ({
          ...item,
          woodType: item.WoodType,
          sourceWarehouse: item.Warehouse
        })) || []
      }));
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
          WoodType: true,
          DryingReading: {
            orderBy: { readingTime: 'asc' }
          },
          ElectricityRecharge: {
            orderBy: { rechargeDate: 'asc' }
          },
          DryingProcessItem: {
            include: {
              WoodType: true,
              Warehouse: true
            }
          }
        }
      });

      if (!process) {
        return reply.status(404).send({ error: 'Drying process not found' });
      }

      // Map to camelCase for frontend
      return {
        ...process,
        woodType: (process as any).WoodType,
        readings: (process as any).DryingReading || [],
        recharges: (process as any).ElectricityRecharge || [],
        items: (process as any).DryingProcessItem?.map((item: any) => ({
          ...item,
          woodType: item.WoodType,
          sourceWarehouse: item.Warehouse
        })) || []
      };
    } catch (error) {
      console.error('Error fetching drying process:', error);
      return reply.status(500).send({ error: 'Failed to fetch drying process' });
    }
  });

  // Create new drying process
  fastify.post('/drying-processes', async (request, reply) => {
    try {
      const data = request.body as {
        // OLD FORMAT (single wood - backward compatible)
        woodTypeId?: string;
        thickness?: number;
        thicknessUnit?: string;
        pieceCount?: number;
        useStock?: boolean;
        warehouseId?: string;
        stockThickness?: string;

        // NEW FORMAT (multiple woods)
        items?: Array<{
          woodTypeId: string;
          thickness: string;
          pieceCount: number;
          warehouseId: string;
        }>;

        // Common fields
        startingHumidity?: number;
        startingElectricityUnits?: number;
        startTime: string;
        notes?: string;
      };

      // Get authenticated user info
      const user = (request as any).user;

      // Fetch full user details from database to get name
      const userDetails = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { firstName: true, lastName: true, email: true }
      });

      const userName = userDetails && userDetails.firstName && userDetails.lastName
        ? `${userDetails.firstName} ${userDetails.lastName}`
        : (userDetails?.email || 'System');

      // Determine if using old or new format
      const isMultiWood = data.items && data.items.length > 0;

      // Validate required fields
      if (!isMultiWood && (!data.woodTypeId || !data.thickness || !data.pieceCount)) {
        return reply.status(400).send({ error: 'Missing required fields for single wood process' });
      }
      if (isMultiWood && (!data.items || data.items.length === 0)) {
        return reply.status(400).send({ error: 'Missing items for multi-wood process' });
      }
      if (!data.startTime) {
        return reply.status(400).send({ error: 'Missing start time' });
      }

      // Generate unique batch number (format: UD-DRY-00001)
      const count = await prisma.dryingProcess.count();
      const batchNumber = `UD-DRY-${String(count + 1).padStart(5, '0')}`;

      // Use transaction for stock updates with increased timeout for Neon DB
      const process = await prisma.$transaction(async (tx) => {
        // Create the drying process
        const createdProcess = await tx.dryingProcess.create({
          data: {
            id: crypto.randomUUID(),
            batchNumber,
            // OLD FIELDS - only for backward compatibility
            ...(data.woodTypeId && { woodTypeId: data.woodTypeId }),
            ...(data.thickness && { thickness: data.thickness }),
            ...(data.thicknessUnit && { thicknessUnit: data.thicknessUnit }),
            ...(data.pieceCount && { pieceCount: data.pieceCount }),
            ...(data.warehouseId && { sourceWarehouseId: data.warehouseId }),
            ...(data.stockThickness && { stockThickness: data.stockThickness }),

            startingHumidity: data.startingHumidity,
            startingElectricityUnits: data.startingElectricityUnits,
            startTime: new Date(data.startTime),
            notes: data.notes || '',
            status: 'IN_PROGRESS',
            useStock: isMultiWood || data.useStock || false,
            createdById: user.userId,
            createdByName: userName,
            updatedAt: new Date()
          }
        });

        // If multi-wood, create items and update stock for each
        if (isMultiWood && data.items) {
          for (const item of data.items) {
            // Validate stock availability
            const stock = await tx.stock.findFirst({
              where: {
                warehouseId: item.warehouseId,
                woodTypeId: item.woodTypeId,
                thickness: item.thickness
              }
            });

            if (!stock || stock.statusNotDried < item.pieceCount) {
              throw new Error(`Insufficient stock for wood type at thickness ${item.thickness}`);
            }

            // Create drying process item
            await tx.dryingProcessItem.create({
              data: {
                id: crypto.randomUUID(),
                dryingProcessId: createdProcess.id,
                woodTypeId: item.woodTypeId,
                thickness: item.thickness,
                pieceCount: item.pieceCount,
                sourceWarehouseId: item.warehouseId,
                updatedAt: new Date()
              }
            });

            // Update stock: NotDried -> UnderDrying
            await tx.stock.update({
              where: {
                id: stock.id
              },
              data: {
                statusNotDried: { decrement: item.pieceCount },
                statusUnderDrying: { increment: item.pieceCount }
              }
            });
          }
        }
        // OLD FORMAT - single wood stock update
        else if (data.useStock && data.warehouseId && data.stockThickness && data.woodTypeId) {
          await tx.stock.updateMany({
            where: {
              warehouseId: data.warehouseId,
              woodTypeId: data.woodTypeId,
              thickness: data.stockThickness
            },
            data: {
              statusNotDried: { decrement: data.pieceCount! },
              statusUnderDrying: { increment: data.pieceCount! }
            }
          });
        }

        // Fetch complete process with relations
        const completeProcess = await tx.dryingProcess.findUnique({
          where: { id: createdProcess.id },
          include: {
            WoodType: true,
            DryingReading: true,
            DryingProcessItem: {
              include: {
                WoodType: true,
                Warehouse: true
              }
            }
          }
        });

        // Map to camelCase for frontend
        return {
          ...completeProcess,
          woodType: (completeProcess as any)?.WoodType,
          readings: (completeProcess as any)?.DryingReading || [],
          items: (completeProcess as any)?.DryingProcessItem?.map((item: any) => ({
            ...item,
            woodType: item.WoodType,
            sourceWarehouse: item.Warehouse
          })) || []
        };
      }, {
        maxWait: 30000, // Wait up to 30 seconds for Neon cold starts
        timeout: 30000, // Transaction timeout 30 seconds
      });

      return process;
    } catch (error) {
      console.error('Error creating drying process:', error);
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Failed to create drying process'
      });
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

      // If completing the process, calculate cost and set endTime to last reading time
      let calculatedCost = data.totalCost;
      let autoEndTime = data.endTime;

      if (data.status === 'COMPLETED') {
        // Fetch the process with readings and recharges
        const processWithReadings = await prisma.dryingProcess.findUnique({
          where: { id },
          include: {
            DryingReading: {
              orderBy: { readingTime: 'asc' }
            },
            ElectricityRecharge: {
              orderBy: { rechargeDate: 'asc' }
            },
            DryingProcessItem: true
          }
        });

        // Map PascalCase to local variables for easier access
        const readings = (processWithReadings as any)?.DryingReading || [];
        const recharges = (processWithReadings as any)?.ElectricityRecharge || [];

        if (processWithReadings && readings.length > 0) {
          // Set endTime to last reading time (not button click time)
          const lastReading = readings[readings.length - 1];
          autoEndTime = lastReading.readingTime.toISOString();

          // Get settings for cost calculation
          const settings: Record<string, number> = {};
          const settingsKeys = ['ovenPurchasePrice', 'ovenLifespanYears', 'maintenanceCostPerYear', 'laborCostPerHour'];

          for (const key of settingsKeys) {
            const setting = await prisma.setting.findUnique({ where: { key } });
            settings[key] = setting ? parseFloat(setting.value) : 0;
          }

          // Get electricity rate from most recent recharge
          const latestRecharge = await prisma.electricityRecharge.findFirst({
            orderBy: { rechargeDate: 'desc' }
          });
          const electricityRate = latestRecharge ? (latestRecharge.totalPaid / latestRecharge.kwhAmount) : 292;

          // Calculate cost per hour rates
          const annualDepreciation = settings.ovenPurchasePrice / settings.ovenLifespanYears;
          const depreciationPerHour = annualDepreciation / 8760;
          const maintenancePerHour = settings.maintenanceCostPerYear / 8760;

          // Calculate electricity consumption with recharge awareness
          let totalElectricityUsed = 0;
          const firstReading = readings[0].electricityMeter;

          for (let i = 0; i < readings.length; i++) {
            const currentReading = readings[i];
            const currentTime = new Date(currentReading.readingTime);

            let prevReading: number;
            let prevTime: Date;

            if (i === 0) {
              prevReading = processWithReadings.startingElectricityUnits || firstReading;
              prevTime = new Date(processWithReadings.startTime);
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
              const totalRecharged = rechargesBetween.reduce((sum, r) => sum + r.kwhAmount, 0);
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

          // Calculate running hours using last reading time
          const startTime = new Date(processWithReadings.startTime).getTime();
          const lastReadingTime = new Date(lastReading.readingTime).getTime();
          const runningHours = (lastReadingTime - startTime) / (1000 * 60 * 60);

          // Calculate total cost
          const electricityCost = totalElectricityUsed * electricityRate;
          const depreciationCost = runningHours * depreciationPerHour;
          const maintenanceCost = runningHours * maintenancePerHour;
          const laborCost = runningHours * settings.laborCostPerHour;

          calculatedCost = electricityCost + depreciationCost + maintenanceCost + laborCost;
        }
      }

      // Use transaction to update stock when completing
      const process = await prisma.$transaction(async (tx) => {
        // Get current process to check if it's being completed
        const currentProcess = await tx.dryingProcess.findUnique({
          where: { id }
        });

        const updatedProcess = await tx.dryingProcess.update({
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
            ...(autoEndTime && { endTime: new Date(autoEndTime) }), // Use autoEndTime (last reading time)
            ...(calculatedCost !== undefined && { totalCost: calculatedCost }),
            ...(data.notes !== undefined && { notes: data.notes })
          },
          include: {
            WoodType: true,
            DryingReading: {
              orderBy: { readingTime: 'asc' }
            },
            ElectricityRecharge: {
              orderBy: { rechargeDate: 'asc' }
            }
          }
        });

        // If completing the process, update warehouse stock
        if (data.status === 'COMPLETED' && currentProcess?.useStock) {
          // Check if it's a multi-wood process (has items)
          const processItems = await tx.dryingProcessItem.findMany({
            where: { dryingProcessId: id }
          });

          if (processItems.length > 0) {
            // MULTI-WOOD: Update stock for each item
            for (const item of processItems) {
              await tx.stock.updateMany({
                where: {
                  warehouseId: item.sourceWarehouseId,
                  woodTypeId: item.woodTypeId,
                  thickness: item.thickness
                },
                data: {
                  statusUnderDrying: { decrement: item.pieceCount },
                  statusDried: { increment: item.pieceCount }
                }
              });
            }
          } else if (currentProcess.sourceWarehouseId && currentProcess.stockThickness && currentProcess.woodTypeId) {
            // OLD SINGLE-WOOD: Update stock using old fields
            await tx.stock.updateMany({
              where: {
                warehouseId: currentProcess.sourceWarehouseId,
                woodTypeId: currentProcess.woodTypeId,
                thickness: currentProcess.stockThickness
              },
              data: {
                statusUnderDrying: { decrement: currentProcess.pieceCount! },
                statusDried: { increment: currentProcess.pieceCount! }
              }
            });
          }
        }

        // Fetch updated process with all relations
        const completeProcess = await tx.dryingProcess.findUnique({
          where: { id },
          include: {
            WoodType: true,
            DryingReading: {
              orderBy: { readingTime: 'asc' }
            },
            ElectricityRecharge: {
              orderBy: { rechargeDate: 'asc' }
            },
            DryingProcessItem: {
              include: {
                WoodType: true,
                Warehouse: true
              }
            }
          }
        });

        // Map to camelCase for frontend
        return {
          ...completeProcess,
          woodType: (completeProcess as any)?.WoodType,
          readings: (completeProcess as any)?.DryingReading || [],
          recharges: (completeProcess as any)?.ElectricityRecharge || [],
          items: (completeProcess as any)?.DryingProcessItem?.map((item: any) => ({
            ...item,
            woodType: item.WoodType,
            sourceWarehouse: item.Warehouse
          })) || []
        };
      }, {
        maxWait: 30000, // Wait up to 30 seconds for Neon cold starts
        timeout: 30000, // Transaction timeout 30 seconds
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

      // Use transaction to restore stock before deleting
      await prisma.$transaction(async (tx) => {
        // Get the process with its items
        const process = await tx.dryingProcess.findUnique({
          where: { id },
          include: {
            DryingProcessItem: true
          }
        });

        if (!process) {
          throw new Error('Drying process not found');
        }

        // Only restore stock if process is still IN_PROGRESS (not completed)
        if (process.status === 'IN_PROGRESS') {
          // Restore stock for multi-wood items
          if (process.DryingProcessItem && process.DryingProcessItem.length > 0) {
            for (const item of process.DryingProcessItem) {
              // Find the stock record and restore: UnderDrying -> NotDried
              await tx.stock.updateMany({
                where: {
                  warehouseId: item.sourceWarehouseId,
                  woodTypeId: item.woodTypeId,
                  thickness: item.thickness
                },
                data: {
                  statusUnderDrying: { decrement: item.pieceCount },
                  statusNotDried: { increment: item.pieceCount }
                }
              });
            }
          }
          // Restore stock for old format (single wood)
          else if (process.useStock && process.sourceWarehouseId && process.stockThickness && process.woodTypeId && process.pieceCount) {
            await tx.stock.updateMany({
              where: {
                warehouseId: process.sourceWarehouseId,
                woodTypeId: process.woodTypeId,
                thickness: process.stockThickness
              },
              data: {
                statusUnderDrying: { decrement: process.pieceCount },
                statusNotDried: { increment: process.pieceCount }
              }
            });
          }
        }

        // Delete the process (cascade will delete items and readings)
        await tx.dryingProcess.delete({
          where: { id }
        });
      }, {
        maxWait: 30000,
        timeout: 30000
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting drying process:', error);
      return reply.status(500).send({ error: 'Failed to delete drying process' });
    }
  });

  // Fix orphaned "Under Drying" stock (admin only)
  // This fixes stock that was left in "Under Drying" status when drying processes were deleted without proper cleanup
  fastify.post('/drying-processes/fix-orphaned-stock', async (request, reply) => {
    try {
      // Get all active (IN_PROGRESS) drying processes with their items
      const activeProcesses = await prisma.dryingProcess.findMany({
        where: { status: 'IN_PROGRESS' },
        include: { DryingProcessItem: true }
      });

      // Build a map of what SHOULD be under drying
      const expectedUnderDrying = new Map<string, number>();

      for (const process of activeProcesses) {
        // Multi-wood format
        if (process.DryingProcessItem && process.DryingProcessItem.length > 0) {
          for (const item of process.DryingProcessItem) {
            const key = `${item.warehouseId}-${item.woodTypeId}-${item.thickness}`;
            expectedUnderDrying.set(key, (expectedUnderDrying.get(key) || 0) + item.pieceCount);
          }
        }
        // Old format
        else if (process.useStock && process.sourceWarehouseId && process.woodTypeId && process.stockThickness && process.pieceCount) {
          const key = `${process.sourceWarehouseId}-${process.woodTypeId}-${process.stockThickness}`;
          expectedUnderDrying.set(key, (expectedUnderDrying.get(key) || 0) + process.pieceCount);
        }
      }

      // Get all stock with Under Drying > 0
      const stockWithUnderDrying = await prisma.stock.findMany({
        where: { statusUnderDrying: { gt: 0 } }
      });

      const fixes: any[] = [];

      for (const stock of stockWithUnderDrying) {
        const key = `${stock.warehouseId}-${stock.woodTypeId}-${stock.thickness}`;
        const expected = expectedUnderDrying.get(key) || 0;
        const actual = stock.statusUnderDrying;
        const orphaned = actual - expected;

        if (orphaned > 0) {
          // Move orphaned stock back to Not Dried
          await prisma.stock.update({
            where: { id: stock.id },
            data: {
              statusUnderDrying: { decrement: orphaned },
              statusNotDried: { increment: orphaned }
            }
          });
          fixes.push({
            stockId: stock.id,
            warehouseId: stock.warehouseId,
            woodTypeId: stock.woodTypeId,
            thickness: stock.thickness,
            orphanedCount: orphaned,
            action: 'Moved from UnderDrying to NotDried'
          });
        }
      }

      return {
        success: true,
        message: fixes.length > 0 ? `Fixed ${fixes.length} orphaned stock records` : 'No orphaned stock found',
        fixes
      };
    } catch (error) {
      console.error('Error fixing orphaned stock:', error);
      return reply.status(500).send({ error: 'Failed to fix orphaned stock' });
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
      };

      // Get authenticated user info
      const user = (request as any).user;

      // Fetch full user details from database to get name
      const userDetails = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { firstName: true, lastName: true, email: true }
      });

      const userName = userDetails && userDetails.firstName && userDetails.lastName
        ? `${userDetails.firstName} ${userDetails.lastName}`
        : (userDetails?.email || 'System');

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

      // Frontend sends UTC time in ISO format from parseLocalToUTC()
      const readingTimeISO = data.readingTime || new Date().toISOString();

      const reading = await prisma.dryingReading.create({
        data: {
          id: crypto.randomUUID(),
          dryingProcessId: id,
          electricityMeter: data.electricityMeter,
          humidity: data.humidity,
          readingTime: readingTimeISO,
          notes: data.notes || '',
          createdById: user.userId,
          createdByName: userName,
          updatedById: user.userId,
          updatedByName: userName,
          updatedAt: new Date()
        }
      });

      // Send notifications to subscribed users (excluding the creator)
      try {
        const subscriptions = await prisma.notificationSubscription.findMany({
          where: {
            eventType: 'DRYING_READING_ADDED',
            inApp: true,
            userId: {
              not: user.userId // Don't notify the user who created the reading
            }
          }
        });

        if (subscriptions.length > 0) {
          const notifications = subscriptions.map(sub => ({
            id: crypto.randomUUID(),
            userId: sub.userId,
            type: 'DRYING_READING_ADDED',
            title: 'New Drying Reading Added',
            message: `${userName} added a new reading to ${process.batchNumber} (Humidity: ${data.humidity}%, Electricity: ${data.electricityMeter} units)`,
            linkUrl: `/dashboard/factory/drying-process`,
            isRead: false
          }));

          await prisma.notification.createMany({
            data: notifications
          });
        }
      } catch (notifError) {
        console.error('Error sending drying reading notifications:', notifError);
        // Don't fail the request if notifications fail
      }

      return reading;
    } catch (error) {
      console.error('Error adding reading:', error);
      return reply.status(500).send({ error: 'Failed to add reading' });
    }
  });

  // Generate PDF report for drying process
  fastify.get('/drying-processes/:id/pdf', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      console.log(`[PDF] Starting PDF generation for process ID: ${id}`);

      // Get user info from request
      const user = (request as any).user;

      // Fetch process with all related data
      const process = await prisma.dryingProcess.findUnique({
        where: { id },
        include: {
          WoodType: true,
          DryingReading: {
            orderBy: {
              readingTime: 'asc'
            }
          }
        }
      });

      if (!process) {
        return reply.status(404).send({ error: 'Drying process not found' });
      }

      const readings = (process as any).DryingReading || [];

      // Calculate electricity usage
      const electricityUsed = readings.length > 0 && process.startingElectricityUnits
        ? readings[readings.length - 1].electricityMeter - process.startingElectricityUnits
        : 0;

      // Calculate running hours
      const runningHours = process.endTime
        ? (new Date(process.endTime).getTime() - new Date(process.startTime).getTime()) / (1000 * 60 * 60)
        : (new Date().getTime() - new Date(process.startTime).getTime()) / (1000 * 60 * 60);

      const currentHumidity = readings.length > 0
        ? readings[readings.length - 1].humidity
        : process.startingHumidity || 0;

      // Calculate costs (TODO: fetch from settings table when available)
      const ELECTRICITY_PRICE = 400; // TZS per unit
      const ANNUAL_DEPRECIATION = 2000000; // TZS per year
      const DEPRECIATION_PER_HOUR = ANNUAL_DEPRECIATION / 8760; // per hour

      const electricityCost = Math.abs(electricityUsed) * ELECTRICITY_PRICE;
      const depreciationCost = runningHours * DEPRECIATION_PER_HOUR;
      const totalCost = electricityCost + depreciationCost;

      // Create PDF with Promise-based approach
      const generatePDF = () => {
        return new Promise<Buffer>((resolve, reject) => {
          const doc = new PDFDocument({
            margin: 50,
            bufferPages: true,
            autoFirstPage: true
          });
          const chunks: Buffer[] = [];

          doc.on('data', (chunk) => {
            chunks.push(chunk);
            console.log(`[PDF] Received chunk: ${chunk.length} bytes, total chunks: ${chunks.length}`);
          });

          doc.on('end', () => {
            try {
              const pdfBuffer = Buffer.concat(chunks);
              console.log(`[PDF] Document ended. Generated PDF: ${pdfBuffer.length} bytes from ${chunks.length} chunks`);

              if (pdfBuffer.length === 0) {
                console.error('[PDF] ERROR: PDF buffer is empty!');
                reject(new Error('Generated PDF is empty'));
              } else {
                resolve(pdfBuffer);
              }
            } catch (error) {
              console.error('[PDF] Error in end handler:', error);
              reject(error);
            }
          });

          doc.on('error', (error) => {
            console.error('[PDF] PDFKit error:', error);
            reject(error);
          });

          try {
            // ===== PAGE 1: Professional Layout =====

            // Logo area - "UDesign" text logo
            doc.fontSize(28).fillColor('#dc2626').text('U', 70, 50, { continued: true, lineBreak: false });
            doc.fontSize(28).fillColor('#475569').text('Design', { lineBreak: true });
            doc.moveDown(0.5);

            // Title
            doc.fontSize(24).fillColor('#dc2626').text('Drying Process Report', 50, doc.y, { align: 'center' });
            doc.moveDown(0.3);
            doc.fontSize(12).fillColor('#64748b').text('Professional Wood Solutions', { align: 'center' });
            doc.moveDown(1.5);

            // Generated by and timestamp on same line
            const genY = doc.y;
            doc.fontSize(9).fillColor('#94a3b8').text(`Generated by: ${user?.email || 'system'}`, 50, genY);
            doc.text(new Date().toLocaleString(), 50, genY, { align: 'right', width: 500 });

            // Separator line
            doc.moveTo(50, doc.y + 10).lineTo(545, doc.y + 10).strokeColor('#e2e8f0').lineWidth(1).stroke();
            doc.moveDown(1.5);

            // PROCESS INFORMATION
            doc.fontSize(12).fillColor('#dc2626').text('PROCESS INFORMATION');
            doc.moveDown(0.5);

            const leftCol = 150;
            const labelCol = 50;
            let infoY = doc.y;

            doc.fontSize(10).fillColor('#64748b');
            doc.text('Batch Number:', labelCol, infoY);
            doc.fillColor('#000').text(process.batchNumber, leftCol, infoY);

            infoY += 18;
            doc.fillColor('#64748b').text('Status:', labelCol, infoY);
            doc.fillColor('#000').text(process.status.charAt(0) + process.status.slice(1).toLowerCase(), leftCol, infoY);

            infoY += 18;
            doc.fillColor('#64748b').text('Wood Type:', labelCol, infoY);
            doc.fillColor('#000').text(process.WoodType.name, leftCol, infoY);

            infoY += 18;
            doc.fillColor('#64748b').text('Grade:', labelCol, infoY);
            doc.fillColor('#000').text(process.WoodType.grade, leftCol, infoY);

            infoY += 18;
            doc.fillColor('#64748b').text('Thickness:', labelCol, infoY);
            doc.fillColor('#000').text(`${(process.thickness / 10).toFixed(1)}cm (${(process.thickness / 25.4).toFixed(2)}in)`, leftCol, infoY);

            infoY += 18;
            doc.fillColor('#64748b').text('Piece Count:', labelCol, infoY);
            doc.fillColor('#000').text(`${process.pieceCount}`, leftCol, infoY);

            infoY += 18;
            doc.fillColor('#64748b').text('Start Time:', labelCol, infoY);
            doc.fillColor('#000').text(new Date(process.startTime).toLocaleString(), leftCol, infoY);

            if (process.endTime) {
              infoY += 18;
              doc.fillColor('#64748b').text('End Time:', labelCol, infoY);
              doc.fillColor('#000').text(new Date(process.endTime).toLocaleString(), leftCol, infoY);
            }

            doc.y = infoY + 25;

            // STATISTICS - Card style
            doc.fontSize(12).fillColor('#dc2626').text('STATISTICS', 50);
            doc.moveDown(0.5);

            const card1X = 70;
            const card2X = 310;
            const cardY = doc.y;
            const cardWidth = 170;
            const cardHeight = 60;

            // Card 1 - Electricity Used
            doc.rect(card1X, cardY, cardWidth, cardHeight).fillAndStroke('#f8fafc', '#e2e8f0');
            doc.fontSize(9).fillColor('#64748b').text('Electricity Used', card1X + 10, cardY + 10);
            doc.fontSize(16).fillColor('#dc2626').text(`${Math.abs(electricityUsed).toFixed(2)} Units`, card1X + 10, cardY + 28);

            // Card 2 - Running Hours
            doc.rect(card2X, cardY, cardWidth, cardHeight).fillAndStroke('#f8fafc', '#e2e8f0');
            doc.fontSize(9).fillColor('#64748b').text('Running Hours', card2X + 10, cardY + 10);
            doc.fontSize(16).fillColor('#dc2626').text(`${runningHours.toFixed(1)} hrs`, card2X + 10, cardY + 28);

            const card3Y = cardY + cardHeight + 10;

            // Card 3 - Starting Humidity
            if (process.startingHumidity) {
              doc.rect(card1X, card3Y, cardWidth, cardHeight).fillAndStroke('#f8fafc', '#e2e8f0');
              doc.fontSize(9).fillColor('#64748b').text('Starting Humidity', card1X + 10, card3Y + 10);
              doc.fontSize(16).fillColor('#dc2626').text(`${process.startingHumidity.toFixed(1)}%`, card1X + 10, card3Y + 28);
            }

            // Card 4 - Current Humidity
            doc.rect(card2X, card3Y, cardWidth, cardHeight).fillAndStroke('#f8fafc', '#e2e8f0');
            doc.fontSize(9).fillColor('#64748b').text('Current Humidity', card2X + 10, card3Y + 10);
            doc.fontSize(16).fillColor('#dc2626').text(`${currentHumidity.toFixed(1)}%`, card2X + 10, card3Y + 28);

            doc.y = card3Y + cardHeight + 20;

            // COST BREAKDOWN
            doc.fontSize(12).fillColor('#dc2626').text('COST BREAKDOWN', 50);
            doc.moveDown(0.5);

            const costY = doc.y;
            doc.fontSize(10).fillColor('#64748b').text('Electricity Cost:', 50, costY);
            doc.fillColor('#000').text(`TZS ${electricityCost.toLocaleString()}`, 200, costY);

            doc.fillColor('#64748b').text('Depreciation Cost:', 50, costY + 18);
            doc.fillColor('#000').text(`TZS ${depreciationCost.toLocaleString()}`, 200, costY + 18);

            doc.fillColor('#64748b').text('Total Cost:', 50, costY + 36);
            doc.fontSize(12).fillColor('#dc2626').text(`TZS ${totalCost.toLocaleString()}`, 200, costY + 36);

            doc.y = costY + 60;

            // NOTES
            if (process.notes) {
              doc.fontSize(12).fillColor('#dc2626').text('NOTES', 50);
              doc.moveDown(0.5);
              doc.fontSize(10).fillColor('#000').text(process.notes, 50, doc.y, { width: 500 });
              doc.moveDown(1);
            }

            // Humidity Trend Chart (moved to page 1 if space, otherwise page 2)
            if (process.readings.length > 1 && doc.y < 550) {
              doc.fontSize(12).fillColor('#dc2626').text('HUMIDITY TREND', 50);
              doc.moveDown(0.5);

              const chartX = 100;
              const chartY = doc.y;
              const chartWidth = 380;
              const chartHeight = 100;

              // Get humidity values
              const humidityValues = process.readings.map(r => r.humidity);
              const minHumidity = Math.floor(Math.min(...humidityValues) / 5) * 5;
              const maxHumidity = Math.ceil(Math.max(...humidityValues) / 5) * 5;
              const humidityRange = maxHumidity - minHumidity || 10;

              // Draw axes
              doc.strokeColor('#64748b').lineWidth(2);
              doc.moveTo(chartX, chartY).lineTo(chartX, chartY + chartHeight).stroke(); // Y-axis
              doc.moveTo(chartX, chartY + chartHeight).lineTo(chartX + chartWidth, chartY + chartHeight).stroke(); // X-axis

              // Draw grid lines and Y-axis labels
              doc.strokeColor('#e2e8f0').lineWidth(0.5);
              for (let i = 0; i <= 4; i++) {
                const y = chartY + (i / 4) * chartHeight;
                const humidity = maxHumidity - (i / 4) * humidityRange;

                // Grid line
                doc.moveTo(chartX, y).lineTo(chartX + chartWidth, y).stroke();

                // Label
                doc.fontSize(7).fillColor('#64748b').text(
                  `${humidity.toFixed(0)}%`,
                  chartX - 35,
                  y - 3,
                  { width: 30, align: 'right' }
                );
              }

              // Plot humidity line
              doc.strokeColor('#dc2626').lineWidth(2);
              process.readings.forEach((reading, index) => {
                const x = chartX + (index / Math.max(1, process.readings.length - 1)) * chartWidth;
                const y = chartY + chartHeight - ((reading.humidity - minHumidity) / humidityRange) * chartHeight;

                if (index === 0) {
                  doc.moveTo(x, y);
                } else {
                  doc.lineTo(x, y);
                }
              });
              doc.stroke();

              // Plot data points
              doc.fillColor('#dc2626');
              process.readings.forEach((reading, index) => {
                const x = chartX + (index / Math.max(1, process.readings.length - 1)) * chartWidth;
                const y = chartY + chartHeight - ((reading.humidity - minHumidity) / humidityRange) * chartHeight;
                doc.circle(x, y, 2.5).fill();
              });

              // Axis labels
              doc.fontSize(8).fillColor('#64748b');
              doc.text('Humidity (%)', 50, chartY + chartHeight / 2 - 5);
              doc.text(
                `Reading Progress (${process.readings.length} readings)`,
                chartX,
                chartY + chartHeight + 10,
                { width: chartWidth, align: 'center' }
              );

              doc.y = chartY + chartHeight + 25;
            }

            // Start READINGS HISTORY on Page 1
            doc.fontSize(12).fillColor('#dc2626').text('READINGS HISTORY (' + process.readings.length + ')', 50);
            doc.moveDown(0.5);

            if (process.readings.length > 0) {
              // Table headers
              doc.fontSize(9).fillColor('#64748b');
              const tableTop = doc.y;
              const col1 = 70;
              const col2 = 235;
              const col3 = 360;
              const col4 = 475;

              doc.text('Time', col1, tableTop);
              doc.text('Electricity (U)', col2, tableTop);
              doc.text('Humidity (%)', col3, tableTop);
              doc.text('Notes', col4, tableTop);

              doc.moveDown(0.2);
              doc.strokeColor('#e2e8f0').lineWidth(0.5);
              doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
              doc.moveDown(0.3);

              // Table rows
              doc.fontSize(9).fillColor('#1e293b');
              let isFirstPage = true;

              process.readings.forEach((reading, index) => {
                const y = doc.y;

                // Check if we need a new page
                if (y > 720) {
                  // Add page 2 if this is the first overflow
                  if (isFirstPage) {
                    doc.addPage();
                    isFirstPage = false;
                    doc.y = 50;
                  }
                }

                const readingTime = new Date(reading.readingTime).toLocaleString();
                doc.text(readingTime, col1, doc.y, { width: 155, lineBreak: false });
                doc.text(reading.electricityMeter.toFixed(2), col2, y, { lineBreak: false });
                doc.text(reading.humidity.toFixed(1), col3, y, { lineBreak: false });
                doc.text(reading.notes || '-', col4, y, { width: 70 });
                doc.moveDown(0.6);
              });
            } else {
              doc.fontSize(9).fillColor('#94a3b8').text('No readings recorded yet.');
            }

            // Footer at bottom of last page
            const footerY = doc.page.height - 50;
            doc.fontSize(8).fillColor('#94a3b8').text(
              'U Design v1.0.0 • Developed by Vix',
              50,
              footerY,
              { align: 'center', width: doc.page.width - 100 }
            );

            console.log('[PDF] Calling doc.end()');
            doc.end();
          } catch (error) {
            console.error('[PDF] Error building PDF content:', error);
            reject(error);
          }
        });
      };

      // Generate PDF and send response
      const pdfBuffer = await generatePDF();

      console.log(`[PDF] Sending PDF for ${process.batchNumber}: ${pdfBuffer.length} bytes`);
      reply.type('application/pdf');
      reply.header('Content-Disposition', `attachment; filename="UD - Drying Details (${process.batchNumber}).pdf"`);
      return reply.send(pdfBuffer);
    } catch (error) {
      console.error('[PDF] Error generating PDF:', error);
      return reply.status(500).send({ error: 'Failed to generate PDF' });
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

      // Get authenticated user info
      const user = (request as any).user;

      // Fetch full user details from database to get name
      const userDetails = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { firstName: true, lastName: true, email: true }
      });

      const userName = userDetails && userDetails.firstName && userDetails.lastName
        ? `${userDetails.firstName} ${userDetails.lastName}`
        : (userDetails?.email || 'System');

      const reading = await prisma.dryingReading.update({
        where: { id },
        data: {
          ...(data.electricityMeter !== undefined && { electricityMeter: data.electricityMeter }),
          ...(data.humidity !== undefined && { humidity: data.humidity }),
          ...(data.readingTime !== undefined && { readingTime: data.readingTime }),
          ...(data.notes !== undefined && { notes: data.notes }),
          ...(data.lukuSms !== undefined && { lukuSms: data.lukuSms }),
          updatedById: user.userId,
          updatedByName: userName
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

  // Get sleeper measurements for a receipt
  fastify.get('/measurements', async (request, reply) => {
    try {
      const { receipt_id } = request.query as { receipt_id?: string };

      if (!receipt_id) {
        return reply.status(400).send({ error: 'receipt_id is required' });
      }

      const measurements = await prisma.sleeperMeasurement.findMany({
        where: { receiptId: receipt_id },
        orderBy: { createdAt: 'asc' }
      });

      return measurements;
    } catch (error) {
      console.error('Error fetching measurements:', error);
      return reply.status(500).send({ error: 'Failed to fetch measurements' });
    }
  });

  // Get drafts (optionally filtered by receipt_id)
  fastify.get('/drafts', async (request, reply) => {
    try {
      const { receipt_id } = request.query as { receipt_id?: string };

      console.log(`GET /drafts - receipt_id: ${receipt_id}`);

      const drafts = await prisma.receiptDraft.findMany({
        where: receipt_id ? { receiptId: receipt_id } : undefined,
        orderBy: { updatedAt: 'desc' }
      });

      console.log(`GET /drafts - Found ${drafts.length} drafts${receipt_id ? ` for ${receipt_id}` : ''}`);
      if (drafts.length > 0 && receipt_id) {
        const draft = drafts[0];
        console.log(`GET /drafts - Draft has ${Array.isArray(draft.measurements) ? (draft.measurements as any[]).length : 0} measurements`);
      }

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
        measurement_unit?: string;
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
          id: crypto.randomUUID(),
          receiptId: data.receipt_id,
          measurements: data.measurements,
          measurementUnit: data.measurement_unit || 'imperial',
          updatedBy: data.updated_by,
          updatedAt: new Date()
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

      // Create history entry for draft creation
      if (data.updated_by && data.receipt_id) {
        try {
          const user = await prisma.user.findUnique({
            where: { id: data.updated_by }
          });

          if (user) {
            const measurementCount = Array.isArray(data.measurements) ? data.measurements.length : 0;
            await prisma.receiptHistory.create({
              data: {
                id: crypto.randomUUID(),
                receiptId: data.receipt_id,
                userId: data.updated_by,
                userName: user.email || user.id,
                action: 'DRAFT_CREATED',
                details: `Draft created with ${measurementCount} measurements`,
                timestamp: new Date()
              }
            });
          }
        } catch (historyError) {
          console.error('Error creating draft creation history:', historyError);
        }
      }

      return draft;
    } catch (error) {
      console.error('Error creating draft - Full details:', {
        error: error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        receiptId: (request.body as any)?.receipt_id
      });
      return reply.status(500).send({
        error: 'Failed to create draft',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Update existing draft
  fastify.patch('/drafts/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as {
        measurements?: any[];
        measurement_unit?: string;
        updated_at?: string;
        updated_by?: string;
      };

      const draft = await prisma.receiptDraft.update({
        where: { id },
        data: {
          ...(data.measurements && { measurements: data.measurements }),
          ...(data.measurement_unit && { measurementUnit: data.measurement_unit }),
          ...(data.updated_by && { updatedBy: data.updated_by }),
          updatedAt: new Date()
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

        // Create history entry for draft update
        if (data.updated_by && existingDraft.receiptId) {
          try {
            const user = await prisma.user.findUnique({
              where: { id: data.updated_by }
            });

            if (user) {
              const measurementCount = Array.isArray(data.measurements) ? data.measurements.length : 0;
              await prisma.receiptHistory.create({
                data: {
                  id: crypto.randomUUID(),
                  receiptId: existingDraft.receiptId,
                  userId: data.updated_by,
                  userName: user.email || user.id,
                  action: 'DRAFT_UPDATED',
                  details: `Draft updated with ${measurementCount} measurements`,
                  timestamp: new Date()
                }
              });
            }
          } catch (historyError) {
            console.error('Error creating draft update history:', historyError);
          }
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
          id: crypto.randomUUID(),
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

  // ============= APPROVAL WORKFLOW ENDPOINTS =============

  // Get pending approvals for a specific role
  fastify.get('/approvals/pending', async (request, reply) => {
    try {
      const { role } = request.query as { role?: string };

      if (!role || (role !== 'SUPERVISOR' && role !== 'ADMIN')) {
        return reply.status(400).send({ error: 'Valid role (SUPERVISOR or ADMIN) is required' });
      }

      const approvals = await prisma.approval.findMany({
        where: {
          approverRole: role,
          status: 'pending'
        },
        include: {
          Operation: {
            include: {
              WoodType: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return approvals;
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      return reply.status(500).send({ error: 'Failed to fetch pending approvals' });
    }
  });

  // Approve or reject an approval request
  fastify.patch('/approvals/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as {
        status: 'approved' | 'rejected';
        approver_id: string;
        approver_name: string;
        notes?: string;
      };

      if (!data.status || !data.approver_id || !data.approver_name) {
        return reply.status(400).send({ error: 'status, approver_id, and approver_name are required' });
      }

      // Update the approval record
      const approval = await prisma.approval.update({
        where: { id },
        data: {
          status: data.status,
          approverId: data.approver_id,
          approverName: data.approver_name,
          notes: data.notes || null,
          actionTakenAt: new Date()
        },
        include: {
          Operation: true
        }
      });

      // If approved by supervisor, create admin approval request
      if (data.status === 'approved' && approval.approverRole === 'SUPERVISOR') {
        await prisma.approval.create({
          data: {
            id: crypto.randomUUID(),
            operationId: approval.operationId,
            approverRole: 'ADMIN',
            status: 'pending',
            updatedAt: new Date()
          }
        });

        // Update operation status to supervisor_approved
        await prisma.operation.update({
          where: { id: approval.operationId },
          data: { status: 'supervisor_approved' }
        });
      }

      // If approved by admin, mark operation as completed
      if (data.status === 'approved' && approval.approverRole === 'ADMIN') {
        await prisma.operation.update({
          where: { id: approval.operationId },
          data: {
            status: 'completed',
            endTime: new Date()
          }
        });
      }

      // If rejected, update operation status back to draft
      if (data.status === 'rejected') {
        await prisma.operation.update({
          where: { id: approval.operationId },
          data: { status: 'draft' }
        });
      }

      return approval;
    } catch (error) {
      console.error('Error updating approval:', error);
      return reply.status(500).send({ error: 'Failed to update approval' });
    }
  });

  // Complete Processing - Update stock and send notifications
  fastify.post('/receipts/complete/:lotNumber', async (request, reply) => {
    try {
      const { lotNumber } = request.params as { lotNumber: string };
      const userId = (request as any).user?.userId;

      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      // 1. Get receipt with warehouse
      const receipt = await prisma.woodReceipt.findUnique({
        where: { lotNumber },
        include: {
          WoodType: true,
          Warehouse: true
        }
      });

      if (!receipt) {
        return reply.status(404).send({ error: 'Receipt not found' });
      }

      // Validate warehouse is assigned before completing receipt
      if (!receipt.warehouseId) {
        return reply.status(400).send({ error: 'Cannot complete receipt: No warehouse assigned. Please assign a warehouse first.' });
      }

      // 2. Get draft measurements
      const draft = await prisma.receiptDraft.findFirst({
        where: { receiptId: lotNumber },
        orderBy: { updatedAt: 'desc' }
      });

      if (!draft || !draft.measurements) {
        return reply.status(400).send({ error: 'No measurements found for this receipt' });
      }

      // 3. Calculate total pieces and volume from measurements
      const measurements = draft.measurements as any[];
      const totalPieces = measurements.reduce((sum, m) => sum + (parseInt(m.qty) || 1), 0);
      const totalVolumeM3 = measurements.reduce((sum, m) => sum + (parseFloat(m.m3) || 0), 0);

      // Calculate paid vs complimentary breakdown
      const paidMeasurements = measurements.filter(m => !m.isComplimentary);
      const complimentaryMeasurements = measurements.filter(m => m.isComplimentary);

      const paidPieces = paidMeasurements.reduce((sum, m) => sum + (parseInt(m.qty) || 1), 0);
      const paidVolumeM3 = paidMeasurements.reduce((sum, m) => sum + (parseFloat(m.m3) || 0), 0);

      const complimentaryPieces = complimentaryMeasurements.reduce((sum, m) => sum + (parseInt(m.qty) || 1), 0);
      const complimentaryVolumeM3 = complimentaryMeasurements.reduce((sum, m) => sum + (parseFloat(m.m3) || 0), 0);

      console.log('📊 Receipt Completion Calculation:', {
        lotNumber,
        totalPieces,
        totalVolumeM3,
        paidPieces,
        paidVolumeM3,
        complimentaryPieces,
        complimentaryVolumeM3,
        measurementCount: measurements.length,
        measurements: measurements.map(m => ({ qty: m.qty, m3: m.m3, isComplimentary: m.isComplimentary }))
      });

      // Get measurement unit from draft (for fallback)
      const measurementUnit = (draft.measurementUnit as string) || 'imperial';

      // Group measurements by thickness, respecting isCustom flag
      const stockByThickness = measurements.reduce((acc, m) => {
        let thickness: string;

        // Check if measurement has isCustom flag - handle both boolean and string values from JSON
        const isCustom = m.isCustom === true || m.isCustom === 'true';
        const isNotCustom = m.isCustom === false || m.isCustom === 'false';

        if (isCustom) {
          // User marked as custom → Always "Custom"
          thickness = 'Custom';
        } else if (isNotCustom) {
          // User marked as standard → Use thickness value with Math.round for proper matching
          const thicknessValue = parseFloat(m.thickness);
          const STANDARD_SIZES = [1, 2, 3];
          thickness = STANDARD_SIZES.includes(Math.round(thicknessValue))
            ? `${Math.round(thicknessValue)}"`
            : 'Custom';
        } else {
          // Legacy/fallback: No isCustom field, use auto-detection
          if (measurementUnit === 'metric') {
            thickness = 'Custom';
          } else {
            const thicknessValue = parseFloat(m.thickness);
            const STANDARD_SIZES = [1, 2, 3];
            thickness = STANDARD_SIZES.includes(Math.round(thicknessValue))
              ? `${Math.round(thicknessValue)}"`
              : 'Custom';
          }
        }

        if (!acc[thickness]) {
          acc[thickness] = 0;
        }
        acc[thickness] += parseInt(m.qty) || 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('📦 Stock grouping by thickness:', {
        lotNumber,
        stockByThickness,
        warehouseId: receipt.warehouseId,
        stockControlEnabled: receipt.warehouse?.stockControlEnabled
      });

      // 4-6. Execute all database operations in a single transaction
      // This ensures EITHER everything succeeds OR everything rolls back
      const updatedReceipt = await prisma.$transaction(async (tx) => {
        // 4. Update warehouse stock if warehouse exists and stock control is enabled
        if (receipt.warehouseId && receipt.warehouse?.stockControlEnabled) {
          console.log('🔄 Starting stock sync for LOT', lotNumber);

          // Update stock for each thickness
          for (const [thickness, quantity] of Object.entries(stockByThickness)) {
            const qty = quantity as number; // Type cast from unknown to number

            console.log(`  → Syncing ${thickness}: ${qty} pieces to warehouse ${receipt.warehouseId}`);

            try {
              await tx.stock.upsert({
                where: {
                  warehouseId_woodTypeId_thickness: {
                    warehouseId: receipt.warehouseId,
                    woodTypeId: receipt.woodTypeId,
                    thickness: thickness
                  }
                },
                update: {
                  statusNotDried: { increment: qty },
                  updatedAt: new Date()
                },
                create: {
                  id: crypto.randomUUID(),
                  warehouseId: receipt.warehouseId,
                  woodTypeId: receipt.woodTypeId,
                  thickness: thickness,
                  statusNotDried: qty,
                  statusUnderDrying: 0,
                  statusDried: 0,
                  statusDamaged: 0,
                  updatedAt: new Date()
                }
              });
              console.log(`  ✅ Successfully synced ${thickness}: ${qty} pieces`);

              // Log stock movement
              const { createStockMovement } = await import('../services/stockMovementService.js');
              await createStockMovement({
                warehouseId: receipt.warehouseId,
                woodTypeId: receipt.woodTypeId,
                thickness: thickness,
                movementType: 'RECEIPT_SYNC',
                quantityChange: qty,
                toStatus: 'NOT_DRIED',
                referenceType: 'RECEIPT',
                referenceId: receipt.id,
                referenceNumber: lotNumber,
                userId: userId,
                details: `Receipt ${lotNumber} synced to stock`
              }, tx);

            } catch (stockError) {
              console.error(`  ❌ FAILED to sync ${thickness}: ${qty} pieces`, stockError);
              throw new Error(`Stock sync failed for thickness ${thickness}: ${stockError.message}`);
            }
          }

          console.log('✅ All stock synced successfully for LOT', lotNumber);
        }

        // 5. Save measurements to SleeperMeasurement table
        const receiptRecord = await tx.woodReceipt.findUnique({
          where: { lotNumber }
        });

        if (receiptRecord) {
          console.log('💾 Saving measurements to SleeperMeasurement table');

          // Delete existing measurements for this receipt (if any)
          await tx.sleeperMeasurement.deleteMany({
            where: { receiptId: receiptRecord.id }
          });

          // Create new measurements
          await tx.sleeperMeasurement.createMany({
            data: measurements.map(m => ({
              id: crypto.randomUUID(),
              receiptId: receiptRecord.id,
              thickness: parseFloat(m.thickness) || 0,
              width: parseFloat(m.width) || 0,
              length: parseFloat(m.length) || 0,
              qty: parseInt(m.qty) || 1,
              volumeM3: parseFloat(m.m3) || 0,
              // Handle both boolean and string values from JSON
              isCustom: m.isCustom === true || m.isCustom === 'true',
              isComplimentary: m.isComplimentary === true || m.isComplimentary === 'true',
              updatedAt: new Date()
            }))
          });

          console.log('✅ Measurements saved successfully');
        }

        // 6. Update receipt status to COMPLETED
        // This happens LAST - if we get here, everything else succeeded
        console.log('📝 Updating receipt status to COMPLETED');

        const updated = await tx.woodReceipt.update({
          where: { lotNumber },
          data: {
            status: 'COMPLETED',
            actualPieces: totalPieces,
            actualVolumeM3: totalVolumeM3,
            measurementUnit: measurementUnit,
            receiptConfirmedAt: new Date()
          }
        });

        console.log('✅ Receipt status updated to COMPLETED');

        return updated;
      });

      // Create history entry for completion
      const completingUser = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (completingUser && lotNumber) {
        try {
          await prisma.receiptHistory.create({
            data: {
              id: crypto.randomUUID(),
              receiptId: lotNumber,
              userId: userId,
              userName: completingUser.email || completingUser.id,
              action: 'COMPLETED',
              details: `Receipt completed with ${totalPieces} pieces (${totalVolumeM3.toFixed(2)} m³). ` +
                `Paid: ${paidVolumeM3.toFixed(2)} m³ (${paidPieces} pcs)` +
                (complimentaryPieces > 0 ? `, Complimentary: ${complimentaryVolumeM3.toFixed(2)} m³ (${complimentaryPieces} pcs)` : ''),
              timestamp: new Date()
            }
          });
        } catch (historyError) {
          console.error('Error creating completion history:', historyError);
        }
      }

      // 7. Create notifications for subscribed users
      const subscriptions = await prisma.notificationSubscription.findMany({
        where: {
          eventType: 'RECEIPT_COMPLETED',
          inApp: true // Users who have in-app notifications enabled
        }
      });

      // If no subscriptions exist, fallback to all admin users
      let userIds: string[];
      if (subscriptions.length === 0) {
        const adminUsers = await prisma.user.findMany({
          where: { role: 'ADMIN', isActive: true },
          select: { id: true }
        });
        userIds = adminUsers.map(u => u.id);
      } else {
        userIds = subscriptions.map(s => s.userId);
      }

      // Build thickness breakdown for notification
      const thicknessBreakdown = Object.entries(stockByThickness)
        .map(([thickness, qty]) => `${thickness}: ${qty} pcs`)
        .join(', ');

      const warehouseInfo = receipt.warehouse
        ? ` → ${receipt.Warehouse.name}`
        : '';

      const notifications = userIds.map(userId => ({
        id: crypto.randomUUID(),
        userId,
        type: 'RECEIPT_COMPLETED',
        title: 'Wood Receipt Completed',
        message: `LOT ${lotNumber} (${receipt.WoodType.name})${warehouseInfo} has been completed with ${totalPieces} pieces (${totalVolumeM3.toFixed(2)} m³ total). ` +
          `Paid: ${paidVolumeM3.toFixed(2)} m³ (${paidPieces} pcs)` +
          (complimentaryPieces > 0 ? `, Complimentary: ${complimentaryVolumeM3.toFixed(2)} m³ (${complimentaryPieces} pcs). ` : '. ') +
          `Breakdown: ${thicknessBreakdown}`,
        linkUrl: `/dashboard/factory/receipt-processing?lot=${lotNumber}`,
        isRead: false
      }));

      if (notifications.length > 0) {
        await prisma.notification.createMany({
          data: notifications
        });
      }

      return {
        success: true,
        receipt: updatedReceipt,
        stockUpdated: !!receipt.warehouseId && receipt.warehouse?.stockControlEnabled,
        notificationsSent: notifications.length
      };
    } catch (error) {
      console.error('Error completing receipt processing:', error);
      return reply.status(500).send({ error: 'Failed to complete receipt processing' });
    }
  });
}

export default factoryRoutes; 
