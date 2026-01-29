import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import {
  authenticateToken,
  requireWarehouseManagement,
  requireStockAdjustment,
  requireRole
} from '../middleware/auth.js';

async function managementRoutes(fastify: FastifyInstance) {
  // SECURITY: Protect all management routes with authentication
  fastify.addHook('onRequest', authenticateToken);

  // Generate next LOT number
  fastify.get('/wood-receipts/next-lot', async (request, reply) => {
    try {
      // Get the latest LOT number
      const latestReceipt = await prisma.woodReceipt.findFirst({
        orderBy: { lotNumber: 'desc' },
        select: { lotNumber: true }
      });

      let nextNumber = 1;
      const currentYear = new Date().getFullYear();

      if (latestReceipt && latestReceipt.lotNumber) {
        // Extract number from LOT-YYYY-XXX format
        const match = latestReceipt.lotNumber.match(/LOT-(\d{4})-(\d+)/);
        if (match) {
          const year = parseInt(match[1]);
          const number = parseInt(match[2]);

          // If same year, increment; if new year, reset to 1
          if (year === currentYear) {
            nextNumber = number + 1;
          }
        }
      }

      const nextLotNumber = `LOT-${currentYear}-${String(nextNumber).padStart(3, '0')}`;
      return { lotNumber: nextLotNumber };
    } catch (error) {
      console.error('Error generating next LOT number:', error);
      return reply.status(500).send({ error: 'Failed to generate next LOT number' });
    }
  });

  // Get all wood receipts
  fastify.get('/wood-receipts', async (request, reply) => {
    try {
      const receipts = await prisma.woodReceipt.findMany({
        include: {
          WoodType: true,
          Warehouse: true,
          SleeperMeasurement: true // Include sleeper/plank measurements
        },
        orderBy: { createdAt: 'desc' }
      });

      // Get all drafts to calculate actual values from measurements
      const drafts = await prisma.receiptDraft.findMany({
        orderBy: { updatedAt: 'desc' }
      });

      // Create a map of drafts by receiptId (lotNumber)
      const draftMap = new Map<string, any>();
      drafts.forEach(draft => {
        // Only keep the most recent draft for each receipt
        if (!draftMap.has(draft.receiptId)) {
          draftMap.set(draft.receiptId, draft);
        }
      });

      // Enrich receipts with calculated actual values from drafts
      const enrichedReceipts = receipts.map(receipt => {
        const draft = draftMap.get(receipt.lotNumber);

        let actualVolumeM3 = receipt.actualVolumeM3;
        let actualPieces = receipt.actualPieces;

        // If there's draft data, calculate from measurements (same logic as lot-traceability)
        if (draft && draft.measurements) {
          const measurements = draft.measurements as any[];

          // Calculate total pieces by summing all qty fields
          actualPieces = measurements.reduce((sum: number, m: any) => {
            return sum + (parseInt(m.qty) || 1);
          }, 0);

          // Calculate total volume using the stored measurement unit
          const measurementUnit = draft.measurementUnit || 'imperial';
          actualVolumeM3 = measurements.reduce((sum: number, m: any) => {
            const thickness = parseFloat(m.thickness) || 0;
            const width = parseFloat(m.width) || 0;
            const length = parseFloat(m.length) || 0;
            const qty = parseInt(m.qty) || 1;

            let volumeM3;
            if (measurementUnit === 'imperial') {
              // Imperial: thickness and width in inches, length in feet
              const thicknessM = thickness * 0.0254; // inch to meter
              const widthM = width * 0.0254; // inch to meter
              const lengthM = length * 0.3048; // feet to meter
              volumeM3 = thicknessM * widthM * lengthM * qty;
            } else {
              // Metric: all in cm
              volumeM3 = (thickness / 100) * (width / 100) * (length / 100) * qty;
            }

            return sum + volumeM3;
          }, 0);
        }

        return {
          ...receipt,
          woodType: (receipt as any).WoodType,
          warehouse: (receipt as any).Warehouse,
          measurements: (receipt as any).SleeperMeasurement,
          actualVolumeM3,
          actualPieces
        };
      });

      return enrichedReceipts;
    } catch (error) {
      console.error('Error fetching wood receipts:', error);
      return reply.status(500).send({ error: 'Failed to fetch wood receipts' });
    }
  });

  // Create a new wood receipt
  fastify.post('/wood-receipts', async (request, reply) => {
    try {
      const data = request.body as any;

      if (!data.wood_type_id || !data.supplier || !data.receipt_date) {
        return reply.status(400).send({ error: 'Missing required fields: wood_type_id, supplier, and receipt_date are required' });
      }

      // Auto-generate LOT number if not provided
      let lotNumber = data.lot_number;
      if (!lotNumber) {
        const latestReceipt = await prisma.woodReceipt.findFirst({
          orderBy: { lotNumber: 'desc' },
          select: { lotNumber: true }
        });

        let nextNumber = 1;
        const currentYear = new Date().getFullYear();

        if (latestReceipt && latestReceipt.lotNumber) {
          const match = latestReceipt.lotNumber.match(/LOT-(\d{4})-(\d+)/);
          if (match) {
            const year = parseInt(match[1]);
            const number = parseInt(match[2]);
            if (year === currentYear) {
              nextNumber = number + 1;
            }
          }
        }

        lotNumber = `LOT-${currentYear}-${String(nextNumber).padStart(3, '0')}`;
      }

      const receipt = await prisma.woodReceipt.create({
        data: {
          id: crypto.randomUUID(),
          woodTypeId: data.wood_type_id,
          warehouseId: data.warehouse_id || null,
          supplier: data.supplier,
          receiptDate: new Date(data.receipt_date),
          lotNumber: lotNumber,
          purchaseOrder: data.purchase_order || null,
          woodFormat: data.wood_format || 'SLEEPERS',
          notes: data.notes || null,
          estimatedAmount: data.total_amount || 0,
          estimatedVolumeM3: data.total_volume_m3 || null,
          estimatedPieces: data.total_pieces || null,
          updatedAt: new Date()
        },
        include: {
          WoodType: true,
          Warehouse: true
        }
      });

      return receipt;
    } catch (error) {
      console.error('Error creating wood receipt:', error);
      return reply.status(500).send({ error: 'Failed to create wood receipt' });
    }
  });

  // Update a wood receipt
  fastify.put('/wood-receipts/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as any;

      console.log('PUT /wood-receipts/:id - Received data:', JSON.stringify(data, null, 2));

      // Check if receipt has been confirmed (stock synced) - prevent changes that affect inventory
      // Only lock if warehouse has stock control enabled
      const existingReceipt = await prisma.woodReceipt.findUnique({
        where: { id },
        include: { Warehouse: true }
      });

      if (existingReceipt?.receiptConfirmedAt && existingReceipt?.Warehouse?.stockControlEnabled) {
        const errors: string[] = [];

        if (data.warehouse_id !== existingReceipt.warehouseId) {
          errors.push('warehouse');
        }
        if (data.wood_type_id !== existingReceipt.woodTypeId) {
          errors.push('wood type');
        }
        if (data.wood_format !== existingReceipt.woodFormat) {
          errors.push('format (sleepers/planks)');
        }

        if (errors.length > 0) {
          return reply.status(400).send({
            error: `Cannot change ${errors.join(', ')} after stock has been synced to a stock-controlled warehouse. This would cause inventory mismatch.`
          });
        }
      }

      const receipt = await prisma.woodReceipt.update({
        where: { id },
        data: {
          woodTypeId: data.wood_type_id,
          warehouseId: data.warehouse_id,
          supplier: data.supplier,
          receiptDate: data.receipt_date ? new Date(data.receipt_date) : undefined,
          // LOT number is immutable - don't allow updates
          purchaseOrder: data.purchase_order,
          woodFormat: data.wood_format,
          status: data.status,
          notes: data.notes,
          estimatedAmount: data.total_amount,
          estimatedVolumeM3: data.total_volume_m3,
          estimatedPieces: data.total_pieces
        },
        include: {
          WoodType: true,
          Warehouse: true
        }
      });

      console.log('PUT /wood-receipts/:id - Update successful');
      return receipt;
    } catch (error) {
      console.error('Error updating wood receipt:', error);
      return reply.status(500).send({ error: 'Failed to update wood receipt' });
    }
  });

  // Partial update a wood receipt (PATCH)
  fastify.patch('/wood-receipts/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as any;

      // Check if receipt has been confirmed (stock synced) - prevent changes that affect inventory
      // Only lock if warehouse has stock control enabled
      const hasStockAffectingChanges = data.warehouse_id !== undefined || data.wood_type_id !== undefined || data.wood_format !== undefined;

      if (hasStockAffectingChanges) {
        const existingReceipt = await prisma.woodReceipt.findUnique({
          where: { id },
          include: { Warehouse: true }
        });

        if (existingReceipt?.receiptConfirmedAt && existingReceipt?.Warehouse?.stockControlEnabled) {
          const errors: string[] = [];

          if (data.warehouse_id !== undefined && data.warehouse_id !== existingReceipt.warehouseId) {
            errors.push('warehouse');
          }
          if (data.wood_type_id !== undefined && data.wood_type_id !== existingReceipt.woodTypeId) {
            errors.push('wood type');
          }
          if (data.wood_format !== undefined && data.wood_format !== existingReceipt.woodFormat) {
            errors.push('format (sleepers/planks)');
          }

          if (errors.length > 0) {
            return reply.status(400).send({
              error: `Cannot change ${errors.join(', ')} after stock has been synced to a stock-controlled warehouse. This would cause inventory mismatch.`
            });
          }
        }
      }

      const updateData: any = {};
      if (data.wood_type_id !== undefined) updateData.woodTypeId = data.wood_type_id;
      if (data.warehouse_id !== undefined) updateData.warehouseId = data.warehouse_id;
      if (data.supplier !== undefined) updateData.supplier = data.supplier;
      if (data.receipt_date !== undefined) updateData.receiptDate = new Date(data.receipt_date);
      // LOT number is immutable - ignore any attempts to update it
      if (data.purchase_order !== undefined) updateData.purchaseOrder = data.purchase_order;
      if (data.wood_format !== undefined) updateData.woodFormat = data.wood_format;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.total_amount !== undefined) updateData.estimatedAmount = data.total_amount;
      if (data.total_volume_m3 !== undefined) updateData.estimatedVolumeM3 = data.total_volume_m3;
      if (data.total_pieces !== undefined) updateData.estimatedPieces = data.total_pieces;
      if (data.actual_volume_m3 !== undefined) updateData.actualVolumeM3 = data.actual_volume_m3;
      if (data.actual_pieces !== undefined) updateData.actualPieces = data.actual_pieces;

      const receipt = await prisma.woodReceipt.update({
        where: { id },
        data: updateData,
        include: {
          WoodType: true
        }
      });

      // If status changed to PENDING_APPROVAL, create notifications for admins
      if (data.status === 'PENDING_APPROVAL') {
        // Check for subscriptions to LOT_PENDING_APPROVAL event
        const subscriptions = await prisma.notificationSubscription.findMany({
          where: {
            eventType: 'LOT_PENDING_APPROVAL',
            inApp: true
          }
        });

        // If no subscriptions exist, fallback to all admin users
        let userIds: string[];
        if (subscriptions.length === 0) {
          const adminUsers = await prisma.user.findMany({
            where: {
              role: { in: ['ADMIN', 'SUPERVISOR'] },
              isActive: true
            },
            select: { id: true }
          });
          userIds = adminUsers.map(u => u.id);
        } else {
          userIds = subscriptions.map(s => s.userId);
        }

        const notifications = userIds.map(userId => ({
          id: crypto.randomUUID(),
          userId,
          type: 'LOT_PENDING_APPROVAL',
          title: 'LOT Pending Approval',
          message: `LOT ${receipt.lotNumber} (${receipt.WoodType.name}) is pending approval. ${data.actual_pieces || receipt.actualPieces || 0} pieces (${(data.actual_volume_m3 || receipt.actualVolumeM3 || 0).toFixed(2)} m³)`,
          linkUrl: `/dashboard/management/wood-receipt`,
          isRead: false
        }));

        if (notifications.length > 0) {
          await prisma.notification.createMany({
            data: notifications
          });
          console.log(`Created ${notifications.length} notification(s) for LOT ${receipt.lotNumber} pending approval`);
        }
      }

      return receipt;
    } catch (error) {
      console.error('Error updating wood receipt:', error);
      return reply.status(500).send({ error: 'Failed to update wood receipt' });
    }
  });

  // Delete a wood receipt
  fastify.delete('/wood-receipts/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      await prisma.woodReceipt.delete({
        where: { id }
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting wood receipt:', error);
      return reply.status(500).send({ error: 'Failed to delete wood receipt' });
    }
  });

  // Get LOT traceability - all records related to a LOT number
  fastify.get('/lot-traceability/:lotNumber', async (request, reply) => {
    try {
      const { lotNumber } = request.params as { lotNumber: string };

      if (!lotNumber) {
        return reply.status(400).send({ error: 'LOT number is required' });
      }

      // Get wood receipts for this LOT
      const woodReceipts = await prisma.woodReceipt.findMany({
        where: { lotNumber },
        include: {
          WoodType: true,
          SleeperMeasurement: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      // Get draft data for this LOT
      const drafts = await prisma.receiptDraft.findMany({
        where: { receiptId: lotNumber },
        orderBy: { updatedAt: 'desc' }
      });

      // Get slicing operations for this LOT
      const slicingOperations = await prisma.operation.findMany({
        where: { lotNumber },
        include: {
          WoodType: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      // Get receipt processing history for this LOT
      const receiptHistory = await prisma.receiptHistory.findMany({
        where: { receiptId: lotNumber },
        orderBy: {
          timestamp: 'asc'
        }
      });

      // Get LOT cost information
      const lotCost = await prisma.lotCost.findUnique({
        where: { lotNumber }
      });

      // Enrich wood receipts with draft data
      const enrichedWoodReceipts = await Promise.all(
        woodReceipts.map(async (receipt) => {
          let actualVolumeM3 = receipt.actualVolumeM3;
          let actualPieces = receipt.actualPieces;
          let paidVolumeM3 = 0;
          let complimentaryVolumeM3 = 0;
          let paidPieces = 0;
          let complimentaryPieces = 0;
          let lastWorkedBy = null;
          let lastWorkedAt = null;

          // Helper function to calculate volume for a single measurement
          const calculateVolumeM3 = (m: any, measurementUnit: string): number => {
            const thickness = parseFloat(m.thickness) || 0;
            const width = parseFloat(m.width) || 0;
            const length = parseFloat(m.length) || 0;
            const qty = parseInt(m.qty) || 1;

            if (measurementUnit === 'imperial') {
              // Imperial: thickness and width in inches, length in feet
              const thicknessM = thickness * 0.0254; // inch to meter
              const widthM = width * 0.0254; // inch to meter
              const lengthM = length * 0.3048; // feet to meter
              return thicknessM * widthM * lengthM * qty;
            } else {
              // Metric: all in cm
              return (thickness / 100) * (width / 100) * (length / 100) * qty;
            }
          };

          // If there's draft data, calculate from measurements
          const draft = drafts.find(d => d.receiptId === lotNumber);
          if (draft && draft.measurements) {
            const measurements = draft.measurements as any[];
            const measurementUnit = draft.measurementUnit || 'imperial';

            // Calculate totals separately for paid and complimentary wood
            measurements.forEach((m: any) => {
              const qty = parseInt(m.qty) || 1;
              const volumeM3 = calculateVolumeM3(m, measurementUnit);

              if (m.isComplimentary) {
                complimentaryVolumeM3 += volumeM3;
                complimentaryPieces += qty;
              } else {
                paidVolumeM3 += volumeM3;
                paidPieces += qty;
              }
            });

            actualVolumeM3 = paidVolumeM3 + complimentaryVolumeM3;
            actualPieces = paidPieces + complimentaryPieces;

            // Get the last user who worked on this receipt
            if (draft.updatedBy) {
              // Fetch user information
              const user = await prisma.user.findUnique({
                where: { id: draft.updatedBy }
              });

              // Use full name with role if available, otherwise fall back to email or ID
              if (user) {
                if (user.firstName || user.lastName) {
                  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
                  lastWorkedBy = `${fullName} (${user.role})`;
                } else {
                  lastWorkedBy = `${user.email} (${user.role})`;
                }
              } else {
                lastWorkedBy = draft.updatedBy;
              }

              lastWorkedAt = draft.updatedAt;
            }
          } else if (receipt.SleeperMeasurement && receipt.SleeperMeasurement.length > 0) {
            // Use saved measurements from database
            receipt.SleeperMeasurement.forEach((m: any) => {
              const qty = m.qty || 1;
              const volumeM3 = m.volumeM3 || 0;

              if (m.isComplimentary) {
                complimentaryVolumeM3 += volumeM3;
                complimentaryPieces += qty;
              } else {
                paidVolumeM3 += volumeM3;
                paidPieces += qty;
              }
            });

            actualVolumeM3 = paidVolumeM3 + complimentaryVolumeM3;
            actualPieces = paidPieces + complimentaryPieces;
          } else {
            // No measurements available, use stored values and assume all is paid
            paidVolumeM3 = actualVolumeM3 || 0;
            paidPieces = actualPieces || 0;
          }

          return {
            id: receipt.id,
            woodType: receipt.WoodType.name,
            supplier: receipt.supplier,
            receiptDate: receipt.receiptDate,
            purchaseOrder: receipt.purchaseOrder,
            status: receipt.status,
            woodFormat: receipt.woodFormat,
            // Keep original estimates separate (in RED on frontend)
            estimatedVolumeM3: receipt.estimatedVolumeM3,
            estimatedPieces: receipt.estimatedPieces,
            // Show actual measured values (in GREEN on frontend)
            actualVolumeM3: actualVolumeM3,
            actualPieces: actualPieces,
            // Paid vs Complimentary breakdown (for cost tracking)
            paidVolumeM3: paidVolumeM3,
            paidPieces: paidPieces,
            complimentaryVolumeM3: complimentaryVolumeM3,
            complimentaryPieces: complimentaryPieces,
            estimatedAmount: receipt.estimatedAmount,
            receiptConfirmedAt: receipt.receiptConfirmedAt,
            notes: receipt.notes,
            createdAt: receipt.createdAt,
            updatedAt: receipt.updatedAt,
            // Last user who worked on this receipt
            lastWorkedBy: lastWorkedBy,
            lastWorkedAt: lastWorkedAt,
            // Include the measurements for display and PDF generation
            measurements: draft?.measurements || null,
            measurementUnit: draft?.measurementUnit || 'imperial'
          };
        })
      );

      // TODO: Add other stages here when they're implemented
      // - Drying records
      // - Quality control records
      // - Inventory records

      return {
        lotNumber,
        stages: {
          woodReceipts: enrichedWoodReceipts,
          slicing: slicingOperations.map(op => ({
            id: op.id,
            serialNumber: op.serialNumber,
            woodType: op.WoodType.name,
            status: op.status,
            startTime: op.startTime,
            endTime: op.endTime,
            wastePercentage: op.wastePercentage,
            sleeperSizes: op.sleeperSizes,
            plankSizes: op.plankSizes,
            notes: op.notes,
            createdAt: op.createdAt,
            updatedAt: op.updatedAt
          })),
          // Future stages will be added here
          drying: [],
          qualityControl: [],
          inventory: []
        },
        history: receiptHistory.map(h => ({
          id: h.id,
          userId: h.userId,
          userName: h.userName,
          action: h.action,
          details: h.details,
          timestamp: h.timestamp
        })),
        cost: lotCost ? {
          purchasePrice: lotCost.purchasePrice,
          purchasePriceType: lotCost.purchasePriceType,
          purchasePriceIncVat: lotCost.purchasePriceIncVat,
          transportPrice: lotCost.transportPrice,
          transportPriceType: lotCost.transportPriceType,
          transportPriceIncVat: lotCost.transportPriceIncVat,
          slicingExpenses: lotCost.slicingExpenses,
          slicingExpensesType: lotCost.slicingExpensesType,
          slicingExpensesIncVat: lotCost.slicingExpensesIncVat,
          otherExpenses: lotCost.otherExpenses,
          otherExpensesType: lotCost.otherExpensesType,
          otherExpensesIncVat: lotCost.otherExpensesIncVat,
          notes: lotCost.notes
        } : null
      };
    } catch (error) {
      console.error('Error fetching LOT traceability:', error);
      return reply.status(500).send({ error: 'Failed to fetch LOT traceability' });
    }
  });

  // Get LOT cost information
  fastify.get('/lot-cost/:lotNumber', async (request, reply) => {
    try {
      const { lotNumber } = request.params as { lotNumber: string };

      const lotCost = await prisma.lotCost.findUnique({
        where: { lotNumber }
      });

      return lotCost || {
        lotNumber,
        purchasePrice: null,
        purchasePriceType: 'LUMPSUM',
        transportPrice: null,
        transportPriceType: 'LUMPSUM',
        slicingExpenses: null,
        slicingExpensesType: 'LUMPSUM',
        otherExpenses: null,
        otherExpensesType: 'LUMPSUM',
        notes: null
      };
    } catch (error) {
      console.error('Error fetching LOT cost:', error);
      return reply.status(500).send({ error: 'Failed to fetch LOT cost' });
    }
  });

  // Update LOT cost information
  fastify.put('/lot-cost/:lotNumber', async (request, reply) => {
    try {
      const { lotNumber } = request.params as { lotNumber: string };
      const data = request.body as {
        purchasePrice?: number;
        purchasePriceType?: string;
        purchasePriceIncVat?: boolean;
        transportPrice?: number;
        transportPriceType?: string;
        transportPriceIncVat?: boolean;
        slicingExpenses?: number;
        slicingExpensesType?: string;
        slicingExpensesIncVat?: boolean;
        otherExpenses?: number;
        otherExpensesType?: string;
        otherExpensesIncVat?: boolean;
        notes?: string;
      };

      const lotCost = await prisma.lotCost.upsert({
        where: { lotNumber },
        update: {
          ...data,
          updatedAt: new Date()
        },
        create: {
          id: crypto.randomUUID(),
          lotNumber,
          ...data,
          updatedAt: new Date()
        }
      });

      return lotCost;
    } catch (error) {
      console.error('Error updating LOT cost:', error);
      return reply.status(500).send({ error: 'Failed to update LOT cost' });
    }
  });

  // Get all approvals (LOT and factory operations)
  fastify.get('/approvals', async (request, reply) => {
    try {
      // Get wood receipts pending approval (LOT approvals)
      const lotApprovals = await prisma.woodReceipt.findMany({
        where: {
          status: 'PENDING_APPROVAL'
        },
        include: {
          WoodType: true,
          Warehouse: true
        },
        orderBy: { createdAt: 'desc' }
      });

      // Get factory operation approvals
      const operationApprovals = await prisma.approval.findMany({
        where: {
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

      // Transform LOT approvals to match the approval structure
      const transformedLotApprovals = lotApprovals.map(receipt => ({
        id: receipt.id,
        type: 'LOT_APPROVAL',
        module: 'WOOD_RECEIPT',
        referenceId: receipt.id,
        lotNumber: receipt.lotNumber,
        woodType: receipt.WoodType,
        supplier: receipt.supplier,
        receiptDate: receipt.receiptDate,
        estimatedAmount: receipt.estimatedAmount,
        estimatedVolumeM3: receipt.estimatedVolumeM3,
        estimatedPieces: receipt.estimatedPieces,
        actualVolumeM3: receipt.actualVolumeM3,
        actualPieces: receipt.actualPieces,
        woodFormat: receipt.woodFormat,
        warehouse: receipt.Warehouse,
        status: 'pending',
        createdAt: receipt.createdAt,
        updatedAt: receipt.updatedAt
      }));

      // Transform operation approvals
      const transformedOperationApprovals = operationApprovals.map(approval => ({
        id: approval.id,
        type: 'OPERATION_APPROVAL',
        module: approval.Operation.serialNumber.startsWith('WS-') ? 'WOOD_SLICER' : 'WOOD_CALCULATOR',
        referenceId: approval.operationId,
        operation: approval.Operation,
        approverRole: approval.approverRole,
        status: approval.status,
        createdAt: approval.createdAt,
        updatedAt: approval.updatedAt
      }));

      return {
        lotApprovals: transformedLotApprovals,
        operationApprovals: transformedOperationApprovals,
        all: [...transformedLotApprovals, ...transformedOperationApprovals]
      };
    } catch (error) {
      console.error('Error fetching approvals:', error);
      return reply.status(500).send({ error: 'Failed to fetch approvals' });
    }
  });

  // Get pending approvals count
  fastify.get('/approvals/pending-count', async (request, reply) => {
    try {
      // Count wood receipts with status PENDING_APPROVAL (waiting for admin approval)
      const lotCount = await prisma.woodReceipt.count({
        where: {
          status: 'PENDING_APPROVAL'
        }
      });

      // Count factory operation approvals
      const operationCount = await prisma.approval.count({
        where: {
          status: 'pending'
        }
      });

      return { count: lotCount + operationCount, lotCount, operationCount };
    } catch (error) {
      console.error('Error fetching pending count:', error);
      return reply.status(500).send({ error: 'Failed to fetch pending count' });
    }
  });

  // Approve a wood receipt (change status to COMPLETED and sync stock)
  fastify.post('/wood-receipts/:id/approve', { onRequest: requireRole('ADMIN', 'SUPERVISOR') }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const user = (request as any).user;

      // Get the receipt with warehouse info
      const existingReceipt = await prisma.woodReceipt.findUnique({
        where: { id },
        include: {
          WoodType: true,
          Warehouse: true
        }
      });

      if (!existingReceipt) {
        return reply.status(404).send({ error: 'Receipt not found' });
      }

      // Get draft measurements
      const draft = await prisma.receiptDraft.findFirst({
        where: { receiptId: existingReceipt.lotNumber },
        orderBy: { updatedAt: 'desc' }
      });

      const measurementUnit = draft?.measurementUnit || 'imperial';
      const measurements = (draft?.measurements as any[]) || [];

      if (measurements.length === 0) {
        return reply.status(400).send({ error: 'No measurements found. Cannot approve receipt without measurements.' });
      }

      // Calculate totals and group by thickness for stock
      let totalPieces = 0;
      let totalVolumeM3 = 0;
      const stockByThickness: Record<string, number> = {};

      measurements.forEach((m: any) => {
        const qty = parseInt(m.qty) || 1;
        const volumeM3 = parseFloat(m.m3) || 0;

        totalPieces += qty;
        totalVolumeM3 += volumeM3;

        // Determine thickness category for stock
        let thickness: string;
        if (m.isCustom === true) {
          thickness = 'Custom';
        } else {
          const thicknessValue = parseFloat(m.thickness);
          const STANDARD_SIZES = [1, 2, 3];
          thickness = STANDARD_SIZES.includes(thicknessValue) ? `${thicknessValue}"` : 'Custom';
        }

        if (!stockByThickness[thickness]) {
          stockByThickness[thickness] = 0;
        }
        stockByThickness[thickness] += qty;
      });

      console.log('📦 Approval - Stock grouping by thickness:', {
        lotNumber: existingReceipt.lotNumber,
        stockByThickness,
        warehouseId: existingReceipt.warehouseId,
        stockControlEnabled: existingReceipt.Warehouse?.stockControlEnabled
      });

      // Execute all operations in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // 1. Delete existing measurements and create new ones
        await tx.sleeperMeasurement.deleteMany({
          where: { receiptId: id }
        });

        await tx.sleeperMeasurement.createMany({
          data: measurements.map(m => ({
            id: crypto.randomUUID(),
            receiptId: id,
            thickness: parseFloat(m.thickness) || 0,
            width: parseFloat(m.width) || 0,
            length: parseFloat(m.length) || 0,
            qty: parseInt(m.qty) || 1,
            volumeM3: parseFloat(m.m3) || 0,
            isCustom: m.isCustom === true,
            isComplimentary: m.isComplimentary === true,
            updatedAt: new Date()
          }))
        });

        // 2. Sync stock if warehouse has stock control enabled
        if (existingReceipt.warehouseId && existingReceipt.Warehouse?.stockControlEnabled) {
          console.log('🔄 Starting stock sync for approved LOT', existingReceipt.lotNumber);

          for (const [thickness, quantity] of Object.entries(stockByThickness)) {
            const qty = quantity as number;
            console.log(`  → Syncing ${thickness}: ${qty} pieces to warehouse ${existingReceipt.warehouseId}`);

            try {
              await tx.stock.upsert({
                where: {
                  warehouseId_woodTypeId_thickness: {
                    warehouseId: existingReceipt.warehouseId,
                    woodTypeId: existingReceipt.woodTypeId,
                    thickness: thickness
                  }
                },
                update: {
                  statusNotDried: { increment: qty },
                  updatedAt: new Date()
                },
                create: {
                  id: crypto.randomUUID(),
                  warehouseId: existingReceipt.warehouseId,
                  woodTypeId: existingReceipt.woodTypeId,
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
                warehouseId: existingReceipt.warehouseId,
                woodTypeId: existingReceipt.woodTypeId,
                thickness: thickness,
                movementType: 'RECEIPT_SYNC',
                quantityChange: qty,
                toStatus: 'NOT_DRIED',
                referenceType: 'RECEIPT',
                referenceId: existingReceipt.id,
                referenceNumber: existingReceipt.lotNumber,
                userId: user?.userId,
                details: `Receipt ${existingReceipt.lotNumber} approved and synced to stock`
              }, tx);

            } catch (stockError: any) {
              console.error(`  ❌ FAILED to sync ${thickness}: ${qty} pieces`, stockError);
              throw new Error(`Stock sync failed for thickness ${thickness}: ${stockError.message}`);
            }
          }

          console.log('✅ All stock synced successfully for approved LOT', existingReceipt.lotNumber);
        }

        // 3. Update the receipt status and actual values
        const updatedReceipt = await tx.woodReceipt.update({
          where: { id },
          data: {
            status: 'COMPLETED',
            actualPieces: totalPieces,
            actualVolumeM3: totalVolumeM3,
            measurementUnit: measurementUnit,
            receiptConfirmedAt: new Date()
          },
          include: {
            WoodType: true
          }
        });

        // 4. Create history entry for approval
        if (user && existingReceipt.lotNumber) {
          await tx.receiptHistory.create({
            data: {
              id: crypto.randomUUID(),
              receiptId: existingReceipt.lotNumber,
              userId: user.userId,
              userName: user.email || user.userId,
              action: 'APPROVED',
              details: `Receipt approved and completed. ${totalPieces} pieces (${totalVolumeM3.toFixed(4)} m³)${existingReceipt.Warehouse?.stockControlEnabled ? '. Stock synced to warehouse.' : ''}`,
              timestamp: new Date()
            }
          });
        }

        return updatedReceipt;
      });

      console.log(`Wood Receipt ${result.lotNumber} approved by admin, status set to COMPLETED, stock synced`);
      return result;
    } catch (error: any) {
      console.error('Error approving wood receipt:', error);
      return reply.status(500).send({ error: error.message || 'Failed to approve wood receipt' });
    }
  });

  // Reject a wood receipt (you can customize the rejected status)
  fastify.post('/wood-receipts/:id/reject', { onRequest: requireRole('ADMIN', 'SUPERVISOR') }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { notes } = request.body as { notes?: string };

      // Get current receipt first to preserve existing notes
      const currentReceipt = await prisma.woodReceipt.findUnique({
        where: { id }
      });

      const receipt = await prisma.woodReceipt.update({
        where: { id },
        data: {
          status: 'REJECTED',
          notes: notes || currentReceipt?.notes
        },
        include: {
          WoodType: true
        }
      });

      console.log(`Wood Receipt ${receipt.lotNumber} rejected`);
      return receipt;
    } catch (error) {
      console.error('Error rejecting wood receipt:', error);
      return reply.status(500).send({ error: 'Failed to reject wood receipt' });
    }
  });

  // Fix a completed LOT - sync stock to warehouse (use when LOT was completed without warehouse or stock wasn't updated)
  fastify.post('/wood-receipts/:id/sync-stock', { onRequest: requireRole('ADMIN') }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = (request.body || {}) as { warehouse_id?: string; force?: boolean };
      const warehouse_id = body.warehouse_id;
      const force = body.force === true;

      // Get the receipt
      const receipt = await prisma.woodReceipt.findUnique({
        where: { id },
        include: { WoodType: true, Warehouse: true }
      });

      if (!receipt) {
        return reply.status(404).send({ error: 'Receipt not found' });
      }

      if (receipt.status !== 'COMPLETED') {
        return reply.status(400).send({ error: 'This endpoint is only for COMPLETED receipts' });
      }

      // Use provided warehouse_id or the one already on the receipt
      const targetWarehouseId = warehouse_id || receipt.warehouseId;

      if (!targetWarehouseId) {
        return reply.status(400).send({ error: 'No warehouse assigned to this LOT. Please provide warehouse_id.' });
      }

      // TypeScript assertion - we've verified targetWarehouseId is defined above
      const warehouseId: string = targetWarehouseId;

      // Get the warehouse
      const warehouse = await prisma.warehouse.findUnique({
        where: { id: warehouseId }
      });

      if (!warehouse) {
        return reply.status(404).send({ error: 'Warehouse not found' });
      }

      if (!warehouse.stockControlEnabled) {
        return reply.status(400).send({ error: `Warehouse ${warehouse.name} does not have stock control enabled` });
      }

      // Get the draft measurements to calculate stock
      const draft = await prisma.receiptDraft.findFirst({
        where: { receiptId: receipt.lotNumber },
        orderBy: { updatedAt: 'desc' }
      });

      if (!draft || !draft.measurements) {
        return reply.status(400).send({ error: 'No measurements found for this receipt' });
      }

      const measurements = draft.measurements as any[];
      const measurementUnit = (draft.measurementUnit as string) || 'imperial';

      // Group measurements by thickness
      const stockByThickness = measurements.reduce((acc, m) => {
        let thickness: string;

        if (m.isCustom === true) {
          thickness = 'Custom';
        } else if (m.isCustom === false) {
          const thicknessValue = parseFloat(m.thickness);
          thickness = `${Math.round(thicknessValue)}"`;
        } else {
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

      // Check if stock was already synced by looking at receiptConfirmedAt
      if (receipt.receiptConfirmedAt && !force) {
        return reply.status(400).send({
          error: 'Stock has already been synced for this LOT. Use force: true to re-sync.',
          syncedAt: receipt.receiptConfirmedAt
        });
      }

      if (force) {
        console.log(`⚠️ Force re-syncing stock for LOT ${receipt.lotNumber} (previously synced at ${receipt.receiptConfirmedAt})`);
      }

      // Update the receipt with the warehouse if not already set
      if (!receipt.warehouseId || receipt.warehouseId !== warehouseId) {
        await prisma.woodReceipt.update({
          where: { id },
          data: { warehouseId: warehouseId }
        });
      }

      // Update stock
      const user = (request as any).user;
      const { createStockMovement } = await import('../services/stockMovementService.js');

      for (const [thickness, quantity] of Object.entries(stockByThickness)) {
        const qty = quantity as number;
        await prisma.stock.upsert({
          where: {
            warehouseId_woodTypeId_thickness: {
              warehouseId: warehouseId,
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
            warehouseId: warehouseId,
            woodTypeId: receipt.woodTypeId,
            thickness: thickness,
            statusNotDried: qty,
            statusUnderDrying: 0,
            statusDried: 0,
            statusDamaged: 0,
            updatedAt: new Date()
          }
        });

        // Log stock movement
        await createStockMovement({
          warehouseId: warehouseId,
          woodTypeId: receipt.woodTypeId,
          thickness: thickness,
          movementType: force ? 'RECEIPT_RESYNC' : 'RECEIPT_SYNC',
          quantityChange: qty,
          toStatus: 'NOT_DRIED',
          referenceType: 'RECEIPT',
          referenceId: receipt.id,
          referenceNumber: receipt.lotNumber,
          userId: user?.userId,
          details: `Manual stock sync for ${receipt.lotNumber}${force ? ' (forced re-sync)' : ''}`
        });
      }

      // Mark receipt as confirmed to prevent double-sync
      await prisma.woodReceipt.update({
        where: { id },
        data: { receiptConfirmedAt: new Date() }
      });

      console.log(`✅ Synced stock for LOT ${receipt.lotNumber} to warehouse ${warehouse.name}${force ? ' (forced)' : ''}`);

      return {
        success: true,
        message: `LOT ${receipt.lotNumber} stock synced to ${warehouse.name}.`,
        stockUpdated: stockByThickness
      };
    } catch (error: any) {
      console.error('Error syncing stock:', error);
      return reply.status(500).send({
        error: 'Failed to sync stock',
        details: error?.message || 'Unknown error'
      });
    }
  });

  // ==================== APPROVAL RULES ====================

  // Get all approval rules
  fastify.get('/approval-rules', async (request, reply) => {
    try {
      const { module } = request.query as { module?: string };

      const whereClause: any = {};
      if (module) {
        whereClause.module = module;
      }

      const rules = await prisma.approvalRule.findMany({
        where: whereClause,
        orderBy: [
          { module: 'asc' },
          { conditionField: 'asc' }
        ]
      });

      return rules;
    } catch (error) {
      console.error('Error fetching approval rules:', error);
      return reply.status(500).send({ error: 'Failed to fetch approval rules' });
    }
  });

  // Create a new approval rule
  fastify.post('/approval-rules', { onRequest: requireRole('ADMIN') }, async (request, reply) => {
    try {
      const data = request.body as any;

      if (!data.module || !data.conditionField || !data.operator || data.threshold === undefined) {
        return reply.status(400).send({
          error: 'Missing required fields: module, conditionField, operator, and threshold are required'
        });
      }

      const rule = await prisma.approvalRule.create({
        data: {
          id: crypto.randomUUID(),
          module: data.module,
          conditionField: data.conditionField,
          operator: data.operator,
          threshold: parseFloat(data.threshold),
          isActive: data.isActive ?? true,
          updatedAt: new Date()
        }
      });

      return rule;
    } catch (error) {
      console.error('Error creating approval rule:', error);
      return reply.status(500).send({ error: 'Failed to create approval rule' });
    }
  });

  // Update an approval rule
  fastify.put('/approval-rules/:id', { onRequest: requireRole('ADMIN') }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as any;

      const rule = await prisma.approvalRule.update({
        where: { id },
        data: {
          module: data.module,
          conditionField: data.conditionField,
          operator: data.operator,
          threshold: data.threshold !== undefined ? parseFloat(data.threshold) : undefined,
          isActive: data.isActive
        }
      });

      return rule;
    } catch (error) {
      console.error('Error updating approval rule:', error);
      return reply.status(500).send({ error: 'Failed to update approval rule' });
    }
  });

  // Delete an approval rule
  fastify.delete('/approval-rules/:id', { onRequest: requireRole('ADMIN') }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      await prisma.approvalRule.delete({
        where: { id }
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting approval rule:', error);
      return reply.status(500).send({ error: 'Failed to delete approval rule' });
    }
  });

  // ==================== WAREHOUSE MANAGEMENT ====================

  // Get all warehouses (including archived if query param is set)
  fastify.get('/warehouses', async (request, reply) => {
    try {
      const { includeArchived } = request.query as { includeArchived?: string };

      const whereClause: any = includeArchived === 'true'
        ? {}
        : { status: 'ACTIVE' as const };

      const warehouses = await prisma.warehouse.findMany({
        where: whereClause,
        include: {
          WarehouseUser: {
            include: {
              User: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                  role: true
                }
              }
            }
          },
          _count: {
            select: {
              Stock: true,
              Transfer_Transfer_fromWarehouseIdToWarehouse: true,
              Transfer_Transfer_toWarehouseIdToWarehouse: true
            }
          }
        },
        orderBy: [
          { status: 'asc' },
          { code: 'asc' }
        ]
      });

      // Map PascalCase relation names to camelCase for frontend compatibility
      return warehouses.map(w => ({
        ...w,
        assignedUsers: (w as any).WarehouseUser?.map((wu: any) => ({
          ...wu,
          user: wu.User
        })) || [],
        _count: {
          stock: (w as any)._count?.Stock || 0,
          transfersFrom: (w as any)._count?.Transfer_Transfer_fromWarehouseIdToWarehouse || 0,
          transfersTo: (w as any)._count?.Transfer_Transfer_toWarehouseIdToWarehouse || 0
        }
      }));
    } catch (error) {
      console.error('Error fetching warehouses:', error);
      return reply.status(500).send({ error: 'Failed to fetch warehouses' });
    }
  });

  // Get a single warehouse by ID
  fastify.get('/warehouses/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const warehouse = await prisma.warehouse.findUnique({
        where: { id },
        include: {
          WarehouseUser: {
            include: {
              User: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                  role: true
                }
              }
            }
          },
          Stock: {
            include: {
              WoodType: true
            }
          },
          _count: {
            select: {
              Transfer_Transfer_fromWarehouseIdToWarehouse: true,
              Transfer_Transfer_toWarehouseIdToWarehouse: true,
              StockAdjustment: true
            }
          }
        }
      });

      if (!warehouse) {
        return reply.status(404).send({ error: 'Warehouse not found' });
      }

      // Map PascalCase to camelCase for frontend
      return {
        ...warehouse,
        assignedUsers: (warehouse as any).WarehouseUser?.map((wu: any) => ({
          ...wu,
          user: wu.User
        })) || [],
        stock: (warehouse as any).Stock || [],
        _count: {
          transfersFrom: (warehouse as any)._count?.Transfer_Transfer_fromWarehouseIdToWarehouse || 0,
          transfersTo: (warehouse as any)._count?.Transfer_Transfer_toWarehouseIdToWarehouse || 0,
          stockAdjustments: (warehouse as any)._count?.StockAdjustment || 0
        }
      };
    } catch (error) {
      console.error('Error fetching warehouse:', error);
      return reply.status(500).send({ error: 'Failed to fetch warehouse' });
    }
  });

  // Create a new warehouse
  fastify.post('/warehouses', { onRequest: requireWarehouseManagement() }, async (request, reply) => {
    try {
      const data = request.body as any;

      if (!data.code || !data.name) {
        return reply.status(400).send({
          error: 'Missing required fields: code and name are required'
        });
      }

      // Check if code already exists
      const existing = await prisma.warehouse.findUnique({
        where: { code: data.code }
      });

      if (existing) {
        return reply.status(400).send({
          error: 'Warehouse code already exists'
        });
      }

      const warehouse = await prisma.warehouse.create({
        data: {
          id: crypto.randomUUID(),
          code: data.code,
          name: data.name,
          address: data.address || null,
          contactPerson: data.contactPerson || null,
          stockControlEnabled: data.stockControlEnabled ?? false,
          requiresApproval: data.requiresApproval ?? false,
          status: 'ACTIVE',
          updatedAt: new Date()
        },
        include: {
          WarehouseUser: true
        }
      });

      // Map to frontend format
      return {
        ...warehouse,
        assignedUsers: (warehouse as any).WarehouseUser || []
      };
    } catch (error) {
      console.error('Error creating warehouse:', error);
      return reply.status(500).send({ error: 'Failed to create warehouse' });
    }
  });

  // Update a warehouse
  fastify.put('/warehouses/:id', { onRequest: requireWarehouseManagement() }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as any;

      // If updating code, check it doesn't conflict with existing
      if (data.code) {
        const existing = await prisma.warehouse.findUnique({
          where: { code: data.code }
        });

        if (existing && existing.id !== id) {
          return reply.status(400).send({
            error: 'Warehouse code already exists'
          });
        }
      }

      const warehouse = await prisma.warehouse.update({
        where: { id },
        data: {
          code: data.code,
          name: data.name,
          address: data.address,
          contactPerson: data.contactPerson,
          stockControlEnabled: data.stockControlEnabled,
          requiresApproval: data.requiresApproval
        },
        include: {
          WarehouseUser: true
        }
      });

      return warehouse;
    } catch (error) {
      console.error('Error updating warehouse:', error);
      return reply.status(500).send({ error: 'Failed to update warehouse' });
    }
  });

  // Archive a warehouse (soft delete)
  fastify.patch('/warehouses/:id/archive', { onRequest: requireWarehouseManagement() }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const warehouse = await prisma.warehouse.update({
        where: { id },
        data: {
          status: 'ARCHIVED'
        }
      });

      return warehouse;
    } catch (error) {
      console.error('Error archiving warehouse:', error);
      return reply.status(500).send({ error: 'Failed to archive warehouse' });
    }
  });

  // Restore an archived warehouse
  fastify.patch('/warehouses/:id/restore', { onRequest: requireWarehouseManagement() }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const warehouse = await prisma.warehouse.update({
        where: { id },
        data: {
          status: 'ACTIVE'
        }
      });

      return warehouse;
    } catch (error) {
      console.error('Error restoring warehouse:', error);
      return reply.status(500).send({ error: 'Failed to restore warehouse' });
    }
  });

  // Update assigned users for a warehouse
  fastify.put('/warehouses/:id/assigned-users', { onRequest: requireWarehouseManagement() }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { userIds } = request.body as { userIds: string[] };

      // Delete all existing user assignments
      await prisma.warehouseUser.deleteMany({
        where: { warehouseId: id }
      });

      // Create new user assignments
      if (userIds && userIds.length > 0) {
        await prisma.warehouseUser.createMany({
          data: userIds.map(userId => ({
            id: crypto.randomUUID(),
            warehouseId: id,
            userId
          }))
        });
      }

      // Fetch and return the updated warehouse with users
      const warehouse = await prisma.warehouse.findUnique({
        where: { id },
        include: {
          WarehouseUser: {
            include: {
              User: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                  role: true
                }
              }
            }
          }
        }
      });

      // Map to frontend format
      return warehouse ? {
        ...warehouse,
        assignedUsers: (warehouse as any).WarehouseUser?.map((wu: any) => ({
          ...wu,
          user: wu.User
        })) || []
      } : warehouse;
    } catch (error) {
      console.error('Error updating assigned users:', error);
      return reply.status(500).send({ error: 'Failed to update assigned users' });
    }
  });

  // ==================== STOCK MANAGEMENT ====================

  // Get stock for a specific warehouse
  fastify.get('/warehouses/:id/stock', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const stock = await prisma.stock.findMany({
        where: { warehouseId: id },
        include: {
          WoodType: true,
          Warehouse: {
            select: {
              code: true,
              name: true
            }
          }
        },
        orderBy: [
          { WoodType: { name: 'asc' } },
          { thickness: 'asc' }
        ]
      });

      return stock.map(s => ({
        ...s,
        woodType: (s as any).WoodType,
        warehouse: (s as any).Warehouse
      }));
    } catch (error) {
      console.error('Error fetching stock:', error);
      return reply.status(500).send({ error: 'Failed to fetch stock' });
    }
  });

  // Get consolidated stock across all active warehouses
  fastify.get('/stock/consolidated', async (request, reply) => {
    try {
      const stock = await prisma.stock.findMany({
        where: {
          Warehouse: {
            status: 'ACTIVE'
          }
        },
        include: {
          WoodType: true,
          Warehouse: {
            select: {
              code: true,
              name: true,
              stockControlEnabled: true
            }
          }
        },
        orderBy: [
          { WoodType: { name: 'asc' } },
          { thickness: 'asc' },
          { Warehouse: { name: 'asc' } }
        ]
      });

      // Group by wood type and thickness for summary
      const summary = stock.reduce((acc: any, item) => {
        const key = `${item.woodTypeId}_${item.thickness}`;
        if (!acc[key]) {
          acc[key] = {
            woodType: (item as any).WoodType,
            thickness: item.thickness,
            totalNotDried: 0,
            totalUnderDrying: 0,
            totalDried: 0,
            totalDamaged: 0,
            totalInTransit: 0,
            warehouses: []
          };
        }

        acc[key].totalNotDried += item.statusNotDried;
        acc[key].totalUnderDrying += item.statusUnderDrying;
        acc[key].totalDried += item.statusDried;
        acc[key].totalDamaged += item.statusDamaged;
        acc[key].totalInTransit += item.statusInTransitOut + item.statusInTransitIn;
        acc[key].warehouses.push({
          warehouse: (item as any).Warehouse,
          quantities: {
            notDried: item.statusNotDried,
            underDrying: item.statusUnderDrying,
            dried: item.statusDried,
            damaged: item.statusDamaged,
            inTransitOut: item.statusInTransitOut,
            inTransitIn: item.statusInTransitIn
          }
        });

        return acc;
      }, {});

      return {
        detailed: stock.map(s => ({
          ...s,
          woodType: (s as any).WoodType,
          warehouse: (s as any).Warehouse
        })),
        summary: Object.values(summary)
      };
    } catch (error) {
      console.error('Error fetching consolidated stock:', error);
      return reply.status(500).send({ error: 'Failed to fetch consolidated stock' });
    }
  });

  // Get low stock alerts
  fastify.get('/stock/alerts', async (request, reply) => {
    try {
      const lowStockItems = await prisma.stock.findMany({
        where: {
          Warehouse: {
            status: 'ACTIVE',
            stockControlEnabled: true
          },
          minimumStockLevel: {
            not: null
          }
        },
        include: {
          WoodType: true,
          Warehouse: {
            select: {
              code: true,
              name: true
            }
          }
        }
      });

      // Filter items where total available stock is below minimum
      const alerts = lowStockItems.filter(item => {
        const totalAvailable = item.statusNotDried + item.statusDried;
        return item.minimumStockLevel && totalAvailable < item.minimumStockLevel;
      }).map(item => ({
        ...item,
        woodType: (item as any).WoodType,
        warehouse: (item as any).Warehouse,
        currentStock: item.statusNotDried + item.statusDried,
        shortfall: item.minimumStockLevel! - (item.statusNotDried + item.statusDried)
      }));

      return alerts;
    } catch (error) {
      console.error('Error fetching stock alerts:', error);
      return reply.status(500).send({ error: 'Failed to fetch stock alerts' });
    }
  });

  // Create or update stock (for initial setup or minimum level updates)
  fastify.post('/stock', { onRequest: requireStockAdjustment() }, async (request, reply) => {
    try {
      const data = request.body as any;

      if (!data.warehouseId || !data.woodTypeId || !data.thickness) {
        return reply.status(400).send({
          error: 'Missing required fields: warehouseId, woodTypeId, and thickness are required'
        });
      }

      // Check if stock record exists
      const existing = await prisma.stock.findUnique({
        where: {
          warehouseId_woodTypeId_thickness: {
            warehouseId: data.warehouseId,
            woodTypeId: data.woodTypeId,
            thickness: data.thickness
          }
        }
      });

      let stock;
      if (existing) {
        // Update existing record
        stock = await prisma.stock.update({
          where: { id: existing.id },
          data: {
            minimumStockLevel: data.minimumStockLevel
          },
          include: {
            WoodType: true,
            Warehouse: true
          }
        });
      } else {
        // Create new record
        stock = await prisma.stock.create({
          data: {
            id: crypto.randomUUID(),
            warehouseId: data.warehouseId,
            woodTypeId: data.woodTypeId,
            thickness: data.thickness,
            minimumStockLevel: data.minimumStockLevel || null,
            statusNotDried: 0,
            statusUnderDrying: 0,
            statusDried: 0,
            statusDamaged: 0,
            statusInTransitOut: 0,
            statusInTransitIn: 0,
            updatedAt: new Date()
          },
          include: {
            WoodType: true,
            Warehouse: true
          }
        });
      }

      return stock;
    } catch (error) {
      console.error('Error creating/updating stock:', error);
      return reply.status(500).send({ error: 'Failed to create/update stock' });
    }
  });

  // Physical stock adjustment
  fastify.post('/stock/adjust', { onRequest: requireStockAdjustment() }, async (request, reply) => {
    try {
      const data = request.body as any;
      const userId = (request as any).user?.userId;

      if (!data.warehouseId || !data.woodTypeId || !data.thickness || !data.woodStatus || data.quantityAfter === undefined || !data.reason) {
        return reply.status(400).send({
          error: 'Missing required fields: warehouseId, woodTypeId, thickness, woodStatus, quantityAfter, and reason are required'
        });
      }

      // Get or create stock record
      let stock = await prisma.stock.findUnique({
        where: {
          warehouseId_woodTypeId_thickness: {
            warehouseId: data.warehouseId,
            woodTypeId: data.woodTypeId,
            thickness: data.thickness
          }
        }
      });

      if (!stock) {
        stock = await prisma.stock.create({
          data: {
            id: crypto.randomUUID(),
            warehouseId: data.warehouseId,
            woodTypeId: data.woodTypeId,
            thickness: data.thickness,
            statusNotDried: 0,
            statusUnderDrying: 0,
            statusDried: 0,
            statusDamaged: 0,
            statusInTransitOut: 0,
            statusInTransitIn: 0,
            updatedAt: new Date()
          }
        });
      }

      // Get current quantity for the specified status
      // Map WoodStatus enum to stock field names
      const statusFieldMap: Record<string, keyof typeof stock> = {
        'NOT_DRIED': 'statusNotDried',
        'UNDER_DRYING': 'statusUnderDrying',
        'DRIED': 'statusDried',
        'DAMAGED': 'statusDamaged'
      };

      const statusField = statusFieldMap[data.woodStatus];
      if (!statusField) {
        return reply.status(400).send({ error: `Invalid wood status: ${data.woodStatus}` });
      }

      const quantityBefore = stock[statusField] as number;
      const quantityChange = data.quantityAfter - quantityBefore;

      // Update stock and create adjustment record in a transaction
      const result = await prisma.$transaction([
        prisma.stock.update({
          where: { id: stock.id },
          data: {
            [statusField]: data.quantityAfter
          }
        }),
        prisma.stockAdjustment.create({
          data: {
            id: crypto.randomUUID(),
            warehouseId: data.warehouseId,
            woodTypeId: data.woodTypeId,
            thickness: data.thickness,
            woodStatus: data.woodStatus,
            quantityBefore,
            quantityAfter: data.quantityAfter,
            quantityChange,
            reason: data.reason,
            notes: data.notes || null,
            adjustedById: userId
          },
          include: {
            WoodType: true,
            Warehouse: true,
            User: {
              select: {
                email: true,
                firstName: true,
                lastName: true
              }
            }
          }
        })
      ]);

      // Map to frontend format
      const adjustment = result[1];
      return {
        ...adjustment,
        woodType: (adjustment as any).WoodType,
        warehouse: (adjustment as any).Warehouse,
        adjustedBy: (adjustment as any).User
      };
    } catch (error) {
      console.error('Error adjusting stock:', error);
      return reply.status(500).send({ error: 'Failed to adjust stock' });
    }
  });

  // Get stock adjustment history
  fastify.get('/stock/adjustments', async (request, reply) => {
    try {
      const { warehouseId } = request.query as { warehouseId?: string };

      const whereClause = warehouseId ? { warehouseId } : {};

      const adjustments = await prisma.stockAdjustment.findMany({
        where: whereClause,
        include: {
          WoodType: true,
          Warehouse: true,
          User: {
            select: {
              email: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { adjustedAt: 'desc' },
        take: 100 // Limit to last 100 adjustments
      });

      // Map to camelCase for frontend
      return adjustments.map(adj => ({
        ...adj,
        woodType: (adj as any).WoodType,
        warehouse: (adj as any).Warehouse,
        adjustedBy: (adj as any).User
      }));
    } catch (error) {
      console.error('Error fetching adjustments:', error);
      return reply.status(500).send({ error: 'Failed to fetch adjustments' });
    }
  });

  // Get stock movements with filters
  fastify.get('/stock/movements', async (request, reply) => {
    try {
      const { warehouseId, woodTypeId, thickness, movementType, days } = request.query as {
        warehouseId?: string;
        woodTypeId?: string;
        thickness?: string;
        movementType?: string;
        days?: string;
      };

      const filters: any = {
        warehouseId,
        woodTypeId,
        thickness,
        movementType: movementType as any
      };

      if (days) {
        const daysNum = parseInt(days);
        if (!isNaN(daysNum)) {
          filters.startDate = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);
          filters.endDate = new Date();
        }
      }

      const { getStockMovements } = await import('../services/stockMovementService.js');
      const movements = await getStockMovements(filters);

      return movements;
    } catch (error) {
      console.error('Error fetching stock movements:', error);
      return reply.status(500).send({ error: 'Failed to fetch stock movements' });
    }
  });

  // Get stock movements for a specific wood type
  fastify.get('/stock/movements/:woodTypeId', async (request, reply) => {
    try {
      const { woodTypeId } = request.params as { woodTypeId: string };
      const { days, warehouseId, movementType, thickness } = request.query as {
        days?: string;
        warehouseId?: string;
        movementType?: string;
        thickness?: string;
      };

      const filters: any = {
        woodTypeId,
        warehouseId,
        thickness,
        movementType: movementType as any
      };

      if (days) {
        const daysNum = parseInt(days);
        if (!isNaN(daysNum)) {
          filters.startDate = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);
          filters.endDate = new Date();
        }
      }

      const { getStockMovements } = await import('../services/stockMovementService.js');
      const movements = await getStockMovements(filters);

      return movements;
    } catch (error) {
      console.error('Error fetching stock movements for wood type:', error);
      return reply.status(500).send({ error: 'Failed to fetch stock movements' });
    }
  });

  // ===== NOTIFICATION SETTINGS =====

  // Get all active users (for user selection)
  fastify.get('/notification-settings/users', async (request, reply) => {
    try {
      const users = await prisma.user.findMany({
        where: { isActive: true },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true
        },
        orderBy: [
          { firstName: 'asc' },
          { lastName: 'asc' },
          { email: 'asc' }
        ]
      });

      return users;
    } catch (error) {
      console.error('Error fetching users:', error);
      return reply.status(500).send({ error: 'Failed to fetch users' });
    }
  });

  // Get all notification event types (grouped by category)
  fastify.get('/notification-settings/event-types', async (request, reply) => {
    try {
      const eventTypes = await prisma.notificationEventType.findMany({
        where: { isActive: true },
        orderBy: [
          { category: 'asc' },
          { name: 'asc' }
        ]
      });

      // Group by category
      const grouped = eventTypes.reduce((acc: any, event) => {
        if (!acc[event.category]) {
          acc[event.category] = [];
        }
        acc[event.category].push(event);
        return acc;
      }, {});

      return grouped;
    } catch (error) {
      console.error('Error fetching event types:', error);
      return reply.status(500).send({ error: 'Failed to fetch event types' });
    }
  });

  // Get notification preferences for a specific user
  fastify.get('/notification-settings/user/:userId', async (request, reply) => {
    try {
      const { userId } = request.params as { userId: string };

      // Get all event types
      const eventTypes = await prisma.notificationEventType.findMany({
        where: { isActive: true }
      });

      // Get user's subscriptions
      const subscriptions = await prisma.notificationSubscription.findMany({
        where: { userId }
      });

      // Map event types with user's preferences
      const preferences = eventTypes.map(event => {
        const subscription = subscriptions.find(s => s.eventType === event.code);
        return {
          eventType: event.code,
          eventName: event.name,
          eventDescription: event.description,
          category: event.category,
          inApp: subscription?.inApp ?? false,
          email: subscription?.email ?? false
        };
      });

      return preferences;
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      return reply.status(500).send({ error: 'Failed to fetch user preferences' });
    }
  });

  // Update notification preferences for a user
  fastify.post('/notification-settings/user/:userId', async (request, reply) => {
    try {
      const { userId } = request.params as { userId: string };
      const { preferences } = request.body as {
        preferences: Array<{
          eventType: string;
          inApp: boolean;
          email: boolean;
        }>;
      };

      // Update or create subscriptions for each preference
      for (const pref of preferences) {
        await prisma.notificationSubscription.upsert({
          where: {
            userId_eventType: {
              userId,
              eventType: pref.eventType
            }
          },
          update: {
            inApp: pref.inApp,
            email: pref.email
          },
          create: {
            userId,
            eventType: pref.eventType,
            inApp: pref.inApp,
            email: pref.email
          }
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return reply.status(500).send({ error: 'Failed to update notification preferences' });
    }
  });
}

export default managementRoutes;
