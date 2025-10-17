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
  fastify.post('/wood-receipts/:id/approve', { onRequest: requireRole('ADMIN', 'SUPERVISOR') }, async (request, reply) => {
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
          assignedUsers: {
            include: {
              user: {
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
              stock: true,
              transfersFrom: true,
              transfersTo: true
            }
          }
        },
        orderBy: [
          { status: 'asc' },
          { code: 'asc' }
        ]
      });

      return warehouses;
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
          assignedUsers: {
            include: {
              user: {
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
          stock: {
            include: {
              woodType: true
            }
          },
          _count: {
            select: {
              transfersFrom: true,
              transfersTo: true,
              stockAdjustments: true
            }
          }
        }
      });

      if (!warehouse) {
        return reply.status(404).send({ error: 'Warehouse not found' });
      }

      return warehouse;
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
          code: data.code,
          name: data.name,
          address: data.address || null,
          contactPerson: data.contactPerson || null,
          stockControlEnabled: data.stockControlEnabled ?? false,
          requiresApproval: data.requiresApproval ?? false,
          status: 'ACTIVE'
        },
        include: {
          assignedUsers: true
        }
      });

      return warehouse;
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
          assignedUsers: true
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
            warehouseId: id,
            userId
          }))
        });
      }

      // Fetch and return the updated warehouse with users
      const warehouse = await prisma.warehouse.findUnique({
        where: { id },
        include: {
          assignedUsers: {
            include: {
              user: {
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

      return warehouse;
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
          woodType: true,
          warehouse: {
            select: {
              code: true,
              name: true
            }
          }
        },
        orderBy: [
          { woodType: { name: 'asc' } },
          { thickness: 'asc' }
        ]
      });

      return stock;
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
          warehouse: {
            status: 'ACTIVE'
          }
        },
        include: {
          woodType: true,
          warehouse: {
            select: {
              code: true,
              name: true,
              stockControlEnabled: true
            }
          }
        },
        orderBy: [
          { woodType: { name: 'asc' } },
          { thickness: 'asc' },
          { warehouse: { name: 'asc' } }
        ]
      });

      // Group by wood type and thickness for summary
      const summary = stock.reduce((acc: any, item) => {
        const key = `${item.woodTypeId}_${item.thickness}`;
        if (!acc[key]) {
          acc[key] = {
            woodType: item.woodType,
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
          warehouse: item.warehouse,
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
        detailed: stock,
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
          warehouse: {
            status: 'ACTIVE',
            stockControlEnabled: true
          },
          minimumStockLevel: {
            not: null
          }
        },
        include: {
          woodType: true,
          warehouse: {
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
            woodType: true,
            warehouse: true
          }
        });
      } else {
        // Create new record
        stock = await prisma.stock.create({
          data: {
            warehouseId: data.warehouseId,
            woodTypeId: data.woodTypeId,
            thickness: data.thickness,
            minimumStockLevel: data.minimumStockLevel || null,
            statusNotDried: 0,
            statusUnderDrying: 0,
            statusDried: 0,
            statusDamaged: 0,
            statusInTransitOut: 0,
            statusInTransitIn: 0
          },
          include: {
            woodType: true,
            warehouse: true
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
            warehouseId: data.warehouseId,
            woodTypeId: data.woodTypeId,
            thickness: data.thickness,
            statusNotDried: 0,
            statusUnderDrying: 0,
            statusDried: 0,
            statusDamaged: 0,
            statusInTransitOut: 0,
            statusInTransitIn: 0
          }
        });
      }

      // Get current quantity for the specified status
      const statusField = `status${data.woodStatus.charAt(0) + data.woodStatus.slice(1).toLowerCase().replace(/_/g, '')}` as keyof typeof stock;
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
            woodType: true,
            warehouse: true,
            adjustedBy: {
              select: {
                email: true,
                firstName: true,
                lastName: true
              }
            }
          }
        })
      ]);

      return result[1]; // Return the adjustment record
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
          woodType: true,
          warehouse: true,
          adjustedBy: {
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

      return adjustments;
    } catch (error) {
      console.error('Error fetching adjustments:', error);
      return reply.status(500).send({ error: 'Failed to fetch adjustments' });
    }
  });
}

export default managementRoutes;
