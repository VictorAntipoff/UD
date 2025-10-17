import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';

async function transferRoutes(fastify: FastifyInstance) {
  // SECURITY: Protect all transfer routes with authentication
  fastify.addHook('onRequest', authenticateToken);

  // Get all transfers with filters
  fastify.get('/', async (request, reply) => {
    try {
      const { status, warehouseId, fromDate, toDate } = request.query as {
        status?: string;
        warehouseId?: string;
        fromDate?: string;
        toDate?: string;
      };

      const whereClause: any = {};

      if (status) {
        whereClause.status = status;
      }

      if (warehouseId) {
        whereClause.OR = [
          { fromWarehouseId: warehouseId },
          { toWarehouseId: warehouseId }
        ];
      }

      if (fromDate || toDate) {
        whereClause.createdAt = {};
        if (fromDate) whereClause.createdAt.gte = new Date(fromDate);
        if (toDate) whereClause.createdAt.lte = new Date(toDate);
      }

      const transfers = await prisma.transfer.findMany({
        where: whereClause,
        include: {
          fromWarehouse: {
            select: {
              id: true,
              code: true,
              name: true,
              stockControlEnabled: true
            }
          },
          toWarehouse: {
            select: {
              id: true,
              code: true,
              name: true,
              stockControlEnabled: true
            }
          },
          items: {
            include: {
              woodType: true
            }
          },
          createdBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          },
          approvedBy: {
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

      return transfers;
    } catch (error) {
      console.error('Error fetching transfers:', error);
      return reply.status(500).send({ error: 'Failed to fetch transfers' });
    }
  });

  // Get a single transfer by ID
  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const transfer = await prisma.transfer.findUnique({
        where: { id },
        include: {
          fromWarehouse: true,
          toWarehouse: true,
          items: {
            include: {
              woodType: true
            }
          },
          createdBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          },
          approvedBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      if (!transfer) {
        return reply.status(404).send({ error: 'Transfer not found' });
      }

      return transfer;
    } catch (error) {
      console.error('Error fetching transfer:', error);
      return reply.status(500).send({ error: 'Failed to fetch transfer' });
    }
  });

  // Create a new transfer
  fastify.post('/', async (request, reply) => {
    try {
      const data = request.body as any;
      const userId = (request as any).user?.userId;

      if (!data.fromWarehouseId || !data.toWarehouseId || !data.items || !Array.isArray(data.items) || data.items.length === 0) {
        return reply.status(400).send({
          error: 'Missing required fields: fromWarehouseId, toWarehouseId, and items array are required'
        });
      }

      if (data.fromWarehouseId === data.toWarehouseId) {
        return reply.status(400).send({
          error: 'Cannot transfer to the same warehouse'
        });
      }

      // Validate each item has required fields
      for (const item of data.items) {
        if (!item.woodTypeId || !item.thickness || !item.quantity || !item.woodStatus) {
          return reply.status(400).send({
            error: 'Each item must have: woodTypeId, thickness, quantity, and woodStatus'
          });
        }
      }

      // Get source and destination warehouses
      const [fromWarehouse, toWarehouse] = await Promise.all([
        prisma.warehouse.findUnique({ where: { id: data.fromWarehouseId } }),
        prisma.warehouse.findUnique({ where: { id: data.toWarehouseId } })
      ]);

      if (!fromWarehouse || !toWarehouse) {
        return reply.status(404).send({ error: 'Warehouse not found' });
      }

      // Check if FROM warehouse has stock control enabled
      if (fromWarehouse.stockControlEnabled) {
        // Check stock availability for each item
        for (const item of data.items) {
          const stock = await prisma.stock.findUnique({
            where: {
              warehouseId_woodTypeId_thickness: {
                warehouseId: data.fromWarehouseId,
                woodTypeId: item.woodTypeId,
                thickness: item.thickness
              }
            }
          });

          if (!stock) {
            return reply.status(400).send({
              error: `Stock not found in source warehouse for wood type ${item.woodTypeId}, thickness ${item.thickness}`
            });
          }

          // Check if sufficient quantity available based on wood status
          const statusField = `status${item.woodStatus.charAt(0) + item.woodStatus.slice(1).toLowerCase().replace(/_/g, '')}` as keyof typeof stock;
          const availableQuantity = stock[statusField] as number;

          if (availableQuantity < item.quantity) {
            return reply.status(400).send({
              error: `Insufficient stock for wood type ${item.woodTypeId}. Available: ${availableQuantity}, Requested: ${item.quantity}`
            });
          }
        }
      }

      // Generate transfer number (format: TRF-YYYYMMDD-XXXX)
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      const count = await prisma.transfer.count({
        where: {
          transferNumber: {
            startsWith: `TRF-${dateStr}`
          }
        }
      });
      const transferNumber = `TRF-${dateStr}-${String(count + 1).padStart(4, '0')}`;

      // Determine initial status based on whether approval is required
      const initialStatus = fromWarehouse.requiresApproval ? 'PENDING' : 'APPROVED';

      // Create transfer in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create the transfer
        const transfer = await tx.transfer.create({
          data: {
            transferNumber,
            fromWarehouseId: data.fromWarehouseId,
            toWarehouseId: data.toWarehouseId,
            transferDate: data.transferDate ? new Date(data.transferDate) : new Date(),
            status: initialStatus,
            notes: data.notes || null,
            createdById: userId,
            approvedById: initialStatus === 'APPROVED' ? userId : null,
            approvedAt: initialStatus === 'APPROVED' ? new Date() : null,
            items: {
              create: data.items.map((item: any) => ({
                woodTypeId: item.woodTypeId,
                thickness: item.thickness,
                quantity: item.quantity,
                woodStatus: item.woodStatus,
                remarks: item.remarks || null
              }))
            }
          },
          include: {
            fromWarehouse: true,
            toWarehouse: true,
            items: {
              include: {
                woodType: true
              }
            },
            createdBy: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              }
            }
          }
        });

        // If source warehouse has stock control AND transfer is auto-approved, deduct from source
        if (fromWarehouse.stockControlEnabled && initialStatus === 'APPROVED') {
          for (const item of data.items) {
            const statusField = `status${item.woodStatus.charAt(0) + item.woodStatus.slice(1).toLowerCase().replace(/_/g, '')}`;

            // Deduct from source warehouse
            await tx.stock.updateMany({
              where: {
                warehouseId: data.fromWarehouseId,
                woodTypeId: item.woodTypeId,
                thickness: item.thickness
              },
              data: {
                [statusField]: { decrement: item.quantity },
                statusInTransitOut: { increment: item.quantity }
              }
            });

            // If destination warehouse has stock control, mark as in-transit-in
            if (toWarehouse.stockControlEnabled) {
              await tx.stock.upsert({
                where: {
                  warehouseId_woodTypeId_thickness: {
                    warehouseId: data.toWarehouseId,
                    woodTypeId: item.woodTypeId,
                    thickness: item.thickness
                  }
                },
                create: {
                  warehouseId: data.toWarehouseId,
                  woodTypeId: item.woodTypeId,
                  thickness: item.thickness,
                  statusNotDried: 0,
                  statusUnderDrying: 0,
                  statusDried: 0,
                  statusDamaged: 0,
                  statusInTransitOut: 0,
                  statusInTransitIn: item.quantity
                },
                update: {
                  statusInTransitIn: { increment: item.quantity }
                }
              });
            }
          }

          // Update transfer status to IN_TRANSIT
          await tx.transfer.update({
            where: { id: transfer.id },
            data: { status: 'IN_TRANSIT' }
          });
        }

        return transfer;
      });

      return result;
    } catch (error) {
      console.error('Error creating transfer:', error);
      return reply.status(500).send({ error: 'Failed to create transfer' });
    }
  });

  // Approve a transfer
  fastify.post('/:id/approve', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = (request as any).user?.userId;

      const transfer = await prisma.transfer.findUnique({
        where: { id },
        include: {
          fromWarehouse: true,
          toWarehouse: true,
          items: true
        }
      });

      if (!transfer) {
        return reply.status(404).send({ error: 'Transfer not found' });
      }

      if (transfer.status !== 'PENDING') {
        return reply.status(400).send({
          error: `Cannot approve transfer with status: ${transfer.status}`
        });
      }

      // Check stock availability again if source has stock control
      if (transfer.fromWarehouse.stockControlEnabled) {
        for (const item of transfer.items) {
          const stock = await prisma.stock.findUnique({
            where: {
              warehouseId_woodTypeId_thickness: {
                warehouseId: transfer.fromWarehouseId,
                woodTypeId: item.woodTypeId,
                thickness: item.thickness
              }
            }
          });

          if (!stock) {
            return reply.status(400).send({
              error: `Stock not found in source warehouse for item ${item.id}`
            });
          }

          const statusField = `status${item.woodStatus.charAt(0) + item.woodStatus.slice(1).toLowerCase().replace(/_/g, '')}` as keyof typeof stock;
          const availableQuantity = stock[statusField] as number;

          if (availableQuantity < item.quantity) {
            return reply.status(400).send({
              error: `Insufficient stock for item ${item.id}. Available: ${availableQuantity}, Requested: ${item.quantity}`
            });
          }
        }
      }

      // Approve and update stock in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Update transfer status
        const updatedTransfer = await tx.transfer.update({
          where: { id },
          data: {
            status: 'IN_TRANSIT',
            approvedById: userId,
            approvedAt: new Date()
          },
          include: {
            fromWarehouse: true,
            toWarehouse: true,
            items: {
              include: {
                woodType: true
              }
            },
            createdBy: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              }
            },
            approvedBy: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              }
            }
          }
        });

        // If source warehouse has stock control, deduct from source
        if (transfer.fromWarehouse.stockControlEnabled) {
          for (const item of transfer.items) {
            const statusField = `status${item.woodStatus.charAt(0) + item.woodStatus.slice(1).toLowerCase().replace(/_/g, '')}`;

            await tx.stock.updateMany({
              where: {
                warehouseId: transfer.fromWarehouseId,
                woodTypeId: item.woodTypeId,
                thickness: item.thickness
              },
              data: {
                [statusField]: { decrement: item.quantity },
                statusInTransitOut: { increment: item.quantity }
              }
            });

            // If destination warehouse has stock control, mark as in-transit-in
            if (transfer.toWarehouse.stockControlEnabled) {
              await tx.stock.upsert({
                where: {
                  warehouseId_woodTypeId_thickness: {
                    warehouseId: transfer.toWarehouseId,
                    woodTypeId: item.woodTypeId,
                    thickness: item.thickness
                  }
                },
                create: {
                  warehouseId: transfer.toWarehouseId,
                  woodTypeId: item.woodTypeId,
                  thickness: item.thickness,
                  statusNotDried: 0,
                  statusUnderDrying: 0,
                  statusDried: 0,
                  statusDamaged: 0,
                  statusInTransitOut: 0,
                  statusInTransitIn: item.quantity
                },
                update: {
                  statusInTransitIn: { increment: item.quantity }
                }
              });
            }
          }
        }

        return updatedTransfer;
      });

      return result;
    } catch (error) {
      console.error('Error approving transfer:', error);
      return reply.status(500).send({ error: 'Failed to approve transfer' });
    }
  });

  // Reject a transfer
  fastify.post('/:id/reject', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { rejectionReason } = request.body as { rejectionReason?: string };
      const userId = (request as any).user?.userId;

      const transfer = await prisma.transfer.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              woodType: true
            }
          }
        }
      });

      if (!transfer) {
        return reply.status(404).send({ error: 'Transfer not found' });
      }

      if (transfer.status !== 'PENDING') {
        return reply.status(400).send({
          error: `Cannot reject transfer with status: ${transfer.status}`
        });
      }

      const updatedTransfer = await prisma.transfer.update({
        where: { id },
        data: {
          status: 'REJECTED',
          notes: rejectionReason ? `${transfer.notes ? transfer.notes + '\n' : ''}REJECTED: ${rejectionReason}` : transfer.notes,
          approvedById: userId,
          approvedAt: new Date()
        },
        include: {
          fromWarehouse: true,
          toWarehouse: true,
          items: {
            include: {
              woodType: true
            }
          },
          createdBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          },
          approvedBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      return updatedTransfer;
    } catch (error) {
      console.error('Error rejecting transfer:', error);
      return reply.status(500).send({ error: 'Failed to reject transfer' });
    }
  });

  // Complete a transfer (mark as received at destination)
  fastify.post('/:id/complete', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const transfer = await prisma.transfer.findUnique({
        where: { id },
        include: {
          fromWarehouse: true,
          toWarehouse: true,
          items: true
        }
      });

      if (!transfer) {
        return reply.status(404).send({ error: 'Transfer not found' });
      }

      if (transfer.status !== 'IN_TRANSIT' && transfer.status !== 'APPROVED') {
        return reply.status(400).send({
          error: `Cannot complete transfer with status: ${transfer.status}`
        });
      }

      // Complete transfer and update stock in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Update transfer status
        const updatedTransfer = await tx.transfer.update({
          where: { id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date()
          },
          include: {
            fromWarehouse: true,
            toWarehouse: true,
            items: {
              include: {
                woodType: true
              }
            },
            createdBy: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              }
            },
            approvedBy: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              }
            }
          }
        });

        // Update stock for each item
        for (const item of transfer.items) {
          const statusField = `status${item.woodStatus.charAt(0) + item.woodStatus.slice(1).toLowerCase().replace(/_/g, '')}`;

          // If source warehouse has stock control, remove from in-transit-out
          if (transfer.fromWarehouse.stockControlEnabled) {
            await tx.stock.updateMany({
              where: {
                warehouseId: transfer.fromWarehouseId,
                woodTypeId: item.woodTypeId,
                thickness: item.thickness
              },
              data: {
                statusInTransitOut: { decrement: item.quantity }
              }
            });
          }

          // If destination warehouse has stock control, add to stock and remove from in-transit-in
          if (transfer.toWarehouse.stockControlEnabled) {
            await tx.stock.upsert({
              where: {
                warehouseId_woodTypeId_thickness: {
                  warehouseId: transfer.toWarehouseId,
                  woodTypeId: item.woodTypeId,
                  thickness: item.thickness
                }
              },
              create: {
                warehouseId: transfer.toWarehouseId,
                woodTypeId: item.woodTypeId,
                thickness: item.thickness,
                statusNotDried: 0,
                statusUnderDrying: 0,
                statusDried: 0,
                statusDamaged: 0,
                statusInTransitOut: 0,
                statusInTransitIn: 0,
                [statusField]: item.quantity
              },
              update: {
                [statusField]: { increment: item.quantity },
                statusInTransitIn: { decrement: item.quantity }
              }
            });
          }
        }

        return updatedTransfer;
      });

      return result;
    } catch (error) {
      console.error('Error completing transfer:', error);
      return reply.status(500).send({ error: 'Failed to complete transfer' });
    }
  });

  // Get pending approvals for current user's assigned warehouses
  fastify.get('/pending-approvals', async (request, reply) => {
    try {
      const userId = (request as any).user?.userId;

      // Get warehouses assigned to current user
      const userWarehouses = await prisma.warehouse.findMany({
        where: {
          assignedUsers: {
            some: {
              userId: userId
            }
          }
        },
        select: {
          id: true
        }
      });

      const warehouseIds = userWarehouses.map(w => w.id);

      // Get pending transfers from those warehouses
      const pendingTransfers = await prisma.transfer.findMany({
        where: {
          status: 'PENDING',
          fromWarehouseId: {
            in: warehouseIds
          }
        },
        include: {
          fromWarehouse: {
            select: {
              code: true,
              name: true
            }
          },
          toWarehouse: {
            select: {
              code: true,
              name: true
            }
          },
          items: {
            include: {
              woodType: true
            }
          },
          createdBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      });

      return pendingTransfers;
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      return reply.status(500).send({ error: 'Failed to fetch pending approvals' });
    }
  });
}

export default transferRoutes;
