import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';

async function managementRoutes(fastify: FastifyInstance) {
  // SECURITY: Protect all management routes with authentication
  fastify.addHook('onRequest', authenticateToken);

  // Get all wood receipts
  fastify.get('/wood-receipts', async (request, reply) => {
    try {
      const receipts = await prisma.woodReceipt.findMany({
        include: {
          woodType: true
        },
        orderBy: { createdAt: 'desc' }
      });

      return receipts;
    } catch (error) {
      console.error('Error fetching wood receipts:', error);
      return reply.status(500).send({ error: 'Failed to fetch wood receipts' });
    }
  });

  // Create a new wood receipt
  fastify.post('/wood-receipts', async (request, reply) => {
    try {
      const data = request.body as any;

      if (!data.wood_type_id || !data.supplier || !data.receipt_date || !data.lot_number) {
        return reply.status(400).send({ error: 'Missing required fields: wood_type_id, supplier, receipt_date, and lot_number are required' });
      }

      const receipt = await prisma.woodReceipt.create({
        data: {
          woodTypeId: data.wood_type_id,
          supplier: data.supplier,
          receiptDate: new Date(data.receipt_date),
          lotNumber: data.lot_number,
          purchaseOrder: data.purchase_order || null,
          woodFormat: data.wood_format || 'SLEEPERS',
          notes: data.notes || null,
          estimatedAmount: data.total_amount || 0,
          estimatedVolumeM3: data.total_volume_m3 || null,
          estimatedPieces: data.total_pieces || null
        },
        include: {
          woodType: true
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

      const receipt = await prisma.woodReceipt.update({
        where: { id },
        data: {
          woodTypeId: data.wood_type_id,
          supplier: data.supplier,
          receiptDate: data.receipt_date ? new Date(data.receipt_date) : undefined,
          lotNumber: data.lot_number,
          purchaseOrder: data.purchase_order,
          woodFormat: data.wood_format,
          status: data.status,
          notes: data.notes,
          estimatedAmount: data.total_amount,
          estimatedVolumeM3: data.total_volume_m3,
          estimatedPieces: data.total_pieces
        },
        include: {
          woodType: true
        }
      });

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

      const updateData: any = {};
      if (data.wood_type_id !== undefined) updateData.woodTypeId = data.wood_type_id;
      if (data.supplier !== undefined) updateData.supplier = data.supplier;
      if (data.receipt_date !== undefined) updateData.receiptDate = new Date(data.receipt_date);
      if (data.lot_number !== undefined) updateData.lotNumber = data.lot_number;
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
          woodType: true
        }
      });

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
          woodType: true
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
          woodType: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      // Enrich wood receipts with draft data
      const enrichedWoodReceipts = await Promise.all(
        woodReceipts.map(async (receipt) => {
          let actualVolumeM3 = receipt.actualVolumeM3;
          let actualPieces = receipt.actualPieces;
          let lastWorkedBy = null;
          let lastWorkedAt = null;

          // If there's draft data, calculate from measurements
          const draft = drafts.find(d => d.receiptId === lotNumber);
          if (draft && draft.measurements) {
            const measurements = draft.measurements as any[];
            actualPieces = measurements.length;
            actualVolumeM3 = measurements.reduce((sum: number, m: any) => {
              const thickness = parseFloat(m.thickness) || 0;
              const width = parseFloat(m.width) || 0;
              const length = parseFloat(m.length) || 0;
              const qty = parseInt(m.qty) || 1;
              return sum + ((thickness / 100) * (width / 100) * (length / 100) * qty);
            }, 0);

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
          }

          return {
            id: receipt.id,
            woodType: receipt.woodType.name,
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
            estimatedAmount: receipt.estimatedAmount,
            receiptConfirmedAt: receipt.receiptConfirmedAt,
            notes: receipt.notes,
            createdAt: receipt.createdAt,
            updatedAt: receipt.updatedAt,
            // Last user who worked on this receipt
            lastWorkedBy: lastWorkedBy,
            lastWorkedAt: lastWorkedAt
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
            woodType: op.woodType.name,
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
        }
      };
    } catch (error) {
      console.error('Error fetching LOT traceability:', error);
      return reply.status(500).send({ error: 'Failed to fetch LOT traceability' });
    }
  });

  // Get pending approvals count
  fastify.get('/approvals/pending-count', async (request, reply) => {
    try {
      // For now, return 0 since approval workflow is not fully implemented
      // TODO: Implement proper approval workflow with approval_request table
      return { count: 0 };
    } catch (error) {
      console.error('Error fetching pending count:', error);
      return reply.status(500).send({ error: 'Failed to fetch pending count' });
    }
  });

  // Approve a wood receipt (change status to CONFIRMED)
  fastify.post('/wood-receipts/:id/approve', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const receipt = await prisma.woodReceipt.update({
        where: { id },
        data: {
          status: 'CONFIRMED',
          receiptConfirmedAt: new Date()
        },
        include: {
          woodType: true
        }
      });

      console.log(`Wood Receipt ${receipt.lotNumber} approved and status set to CONFIRMED`);
      return receipt;
    } catch (error) {
      console.error('Error approving wood receipt:', error);
      return reply.status(500).send({ error: 'Failed to approve wood receipt' });
    }
  });

  // Reject a wood receipt (you can customize the rejected status)
  fastify.post('/wood-receipts/:id/reject', async (request, reply) => {
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
          woodType: true
        }
      });

      console.log(`Wood Receipt ${receipt.lotNumber} rejected`);
      return receipt;
    } catch (error) {
      console.error('Error rejecting wood receipt:', error);
      return reply.status(500).send({ error: 'Failed to reject wood receipt' });
    }
  });
}

export default managementRoutes;
