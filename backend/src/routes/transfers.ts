import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import {
  authenticateToken,
  canCreateTransfer,
  canApproveTransfer,
  requireTransferApproval
} from '../middleware/auth.js';

// Helper function to convert wood status to field name (e.g., NOT_DRIED -> statusNotDried)
function getStatusFieldName(woodStatus: string): string {
  return `status${woodStatus.split('_').map((word: string) =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join('')}`;
}

// Prisma include object for Transfer with correct PascalCase relation names
const transferInclude = {
  Warehouse_Transfer_fromWarehouseIdToWarehouse: true,
  Warehouse_Transfer_toWarehouseIdToWarehouse: true,
  TransferItem: {
    include: { WoodType: true }
  },
  User_Transfer_createdByIdToUser: {
    select: { id: true, email: true, firstName: true, lastName: true }
  },
  User_Transfer_approvedByIdToUser: {
    select: { id: true, email: true, firstName: true, lastName: true }
  },
  TransferHistory: {
    orderBy: { timestamp: 'asc' as const }
  }
};

// Map Prisma PascalCase transfer response to camelCase for frontend
function mapTransfer(t: any) {
  if (!t) return t;
  return {
    ...t,
    fromWarehouse: t.Warehouse_Transfer_fromWarehouseIdToWarehouse,
    toWarehouse: t.Warehouse_Transfer_toWarehouseIdToWarehouse,
    items: t.TransferItem?.map((item: any) => ({
      ...item,
      woodType: item.WoodType
    })) || [],
    createdBy: t.User_Transfer_createdByIdToUser,
    approvedBy: t.User_Transfer_approvedByIdToUser,
    history: t.TransferHistory || []
  };
}

// Helper function to log transfer history
async function logTransferHistory(
  transferId: string,
  transferNumber: string,
  userId: string,
  userName: string,
  userEmail: string,
  action: string,
  details?: string
) {
  await prisma.transferHistory.create({
    data: {
      id: crypto.randomUUID(),
      transferId,
      transferNumber,
      userId,
      userName,
      userEmail,
      action,
      details,
    },
  });
}

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
          Warehouse_Transfer_fromWarehouseIdToWarehouse: {
            select: {
              id: true,
              code: true,
              name: true,
              stockControlEnabled: true
            }
          },
          Warehouse_Transfer_toWarehouseIdToWarehouse: {
            select: {
              id: true,
              code: true,
              name: true,
              stockControlEnabled: true
            }
          },
          TransferItem: {
            include: {
              WoodType: true
            }
          },
          User_Transfer_createdByIdToUser: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          },
          User_Transfer_approvedByIdToUser: {
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

      // Map PascalCase relations to camelCase for frontend
      return transfers.map(t => ({
        ...t,
        fromWarehouse: (t as any).Warehouse_Transfer_fromWarehouseIdToWarehouse,
        toWarehouse: (t as any).Warehouse_Transfer_toWarehouseIdToWarehouse,
        items: (t as any).TransferItem?.map((item: any) => ({
          ...item,
          woodType: item.WoodType
        })) || [],
        createdBy: (t as any).User_Transfer_createdByIdToUser,
        approvedBy: (t as any).User_Transfer_approvedByIdToUser
      }));
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
          Warehouse_Transfer_fromWarehouseIdToWarehouse: true,
          Warehouse_Transfer_toWarehouseIdToWarehouse: true,
          TransferItem: {
            include: {
              WoodType: true
            }
          },
          User_Transfer_createdByIdToUser: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          },
          User_Transfer_approvedByIdToUser: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          },
          TransferHistory: {
            orderBy: { timestamp: 'asc' }
          }
        }
      });

      if (!transfer) {
        return reply.status(404).send({ error: 'Transfer not found' });
      }

      return {
        ...transfer,
        fromWarehouse: (transfer as any).Warehouse_Transfer_fromWarehouseIdToWarehouse,
        toWarehouse: (transfer as any).Warehouse_Transfer_toWarehouseIdToWarehouse,
        items: (transfer as any).TransferItem?.map((item: any) => ({
          ...item,
          woodType: item.WoodType
        })) || [],
        createdBy: (transfer as any).User_Transfer_createdByIdToUser,
        approvedBy: (transfer as any).User_Transfer_approvedByIdToUser,
        history: (transfer as any).TransferHistory || []
      };
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
      const userRole = (request as any).user?.role;

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

      // SECURITY: Check if user has permission to create transfer between these warehouses
      const accessCheck = await canCreateTransfer(userId, data.fromWarehouseId, data.toWarehouseId, userRole);
      if (!accessCheck.allowed) {
        return reply.status(403).send({
          error: 'Insufficient permissions',
          message: accessCheck.reason
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
          const statusField = `status${item.woodStatus.split('_').map((word: string) =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          ).join('')}` as keyof typeof stock;
          const availableQuantity = stock[statusField] as number;

          if (availableQuantity < item.quantity) {
            return reply.status(400).send({
              error: `Insufficient stock for wood type ${item.woodTypeId}. Available: ${availableQuantity}, Requested: ${item.quantity}`
            });
          }
        }
      }

      // Generate transfer number (format: UD-TRF-00001)
      const count = await prisma.transfer.count();
      const transferNumber = `UD-TRF-${String(count + 1).padStart(5, '0')}`;

      // Determine initial status based on whether approval is required
      const initialStatus = fromWarehouse.requiresApproval ? 'PENDING' : 'APPROVED';

      // Create transfer in a transaction with increased timeout
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
            TransferItem: {
              create: data.items.map((item: any) => ({
                woodTypeId: item.woodTypeId,
                thickness: item.thickness,
                quantity: item.quantity,
                woodStatus: item.woodStatus,
                remarks: item.remarks || null
              }))
            }
          },
          include: transferInclude
        });

        // If source warehouse has stock control AND transfer is auto-approved, deduct from source
        if (fromWarehouse.stockControlEnabled && initialStatus === 'APPROVED') {
          for (const item of data.items) {
            // Convert NOT_DRIED -> NotDried, UNDER_DRYING -> UnderDrying, etc.
            const statusField = `status${item.woodStatus.split('_').map((word: string) =>
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            ).join('')}`;

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

        // Log history
        const user = (transfer as any).User_Transfer_createdByIdToUser;
        const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
        await tx.transferHistory.create({
          data: {
            id: crypto.randomUUID(),
            transferId: transfer.id,
            transferNumber: transfer.transferNumber,
            userId: user.id,
            userName,
            userEmail: user.email,
            action: 'CREATED',
            details: `Transfer created from ${fromWarehouse.name} to ${toWarehouse.name} with ${(transfer as any).TransferItem.length} item(s)`
          }
        });

        // Log auto-approval if applicable
        if (initialStatus === 'APPROVED') {
          await tx.transferHistory.create({
            data: {
              id: crypto.randomUUID(),
              transferId: transfer.id,
              transferNumber: transfer.transferNumber,
              userId: user.id,
              userName,
              userEmail: user.email,
              action: 'APPROVED',
              details: 'Transfer auto-approved (no approval required)'
            }
          });
        }

        // Create notifications
        const notifyUserIds: string[] = [];

        // If specific user is selected to notify, add them
        if (data.notifyUserId) {
          notifyUserIds.push(data.notifyUserId);
        } else {
          // Otherwise, notify all active admins
          const admins = await tx.user.findMany({
            where: {
              role: 'ADMIN',
              isActive: true
            },
            select: {
              id: true
            }
          });
          notifyUserIds.push(...admins.map(admin => admin.id));
        }

        // Send notification to each selected user
        for (const userId of notifyUserIds) {
          await tx.notification.create({
            data: {
              userId: userId,
              type: 'TRANSFER_CREATED',
              title: 'New Transfer Created',
              message: `${userName} created transfer ${transfer.transferNumber} from ${fromWarehouse.name} to ${toWarehouse.name}`,
              linkUrl: `/dashboard/factory/wood-transfer?transfer=${transfer.id}`
            }
          });
        }

        return transfer;
      }, {
        maxWait: 10000, // 10 seconds max wait to get a connection
        timeout: 15000, // 15 seconds transaction timeout
      });

      return mapTransfer(result);
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
      const userRole = (request as any).user?.role;

      const transfer = await prisma.transfer.findUnique({
        where: { id },
        include: {
          Warehouse_Transfer_fromWarehouseIdToWarehouse: true,
          Warehouse_Transfer_toWarehouseIdToWarehouse: true,
          TransferItem: true
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

      // SECURITY: Check if user has permission to approve transfers for this warehouse
      const canApprove = await canApproveTransfer(userId, transfer.fromWarehouseId, userRole);
      if (!canApprove) {
        return reply.status(403).send({
          error: 'Insufficient permissions',
          message: 'You do not have permission to approve transfers for this warehouse'
        });
      }

      // Check stock availability again if source has stock control
      if ((transfer as any).Warehouse_Transfer_fromWarehouseIdToWarehouse.stockControlEnabled) {
        for (const item of (transfer as any).TransferItem) {
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

          const statusField = getStatusFieldName(item.woodStatus) as keyof typeof stock;
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
          include: transferInclude
        });

        // If source warehouse has stock control, deduct from source
        if ((transfer as any).Warehouse_Transfer_fromWarehouseIdToWarehouse.stockControlEnabled) {
          for (const item of (transfer as any).TransferItem) {
            const statusField = getStatusFieldName(item.woodStatus);

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
            if ((transfer as any).Warehouse_Transfer_toWarehouseIdToWarehouse.stockControlEnabled) {
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

        // Log approval history
        const approver = (updatedTransfer as any).User_Transfer_approvedByIdToUser!;
        const approverName = `${approver.firstName || ''} ${approver.lastName || ''}`.trim() || approver.email;
        await tx.transferHistory.create({
          data: {
            id: crypto.randomUUID(),
            transferId: updatedTransfer.id,
            transferNumber: updatedTransfer.transferNumber,
            userId: approver.id,
            userName: approverName,
            userEmail: approver.email,
            action: 'APPROVED',
            details: 'Transfer approved and moved to IN_TRANSIT status'
          }
        });

        return updatedTransfer;
      });

      return mapTransfer(result);
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
          TransferItem: {
            include: {
              WoodType: true
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
        include: transferInclude
      });

      // Log rejection history
      const rejector = (updatedTransfer as any).User_Transfer_approvedByIdToUser!;
      const rejectorName = `${rejector.firstName || ''} ${rejector.lastName || ''}`.trim() || rejector.email;
      await prisma.transferHistory.create({
        data: {
          id: crypto.randomUUID(),
          transferId: updatedTransfer.id,
          transferNumber: updatedTransfer.transferNumber,
          userId: rejector.id,
          userName: rejectorName,
          userEmail: rejector.email,
          action: 'REJECTED',
          details: rejectionReason || 'Transfer rejected'
        }
      });

      return mapTransfer(updatedTransfer);
    } catch (error) {
      console.error('Error rejecting transfer:', error);
      return reply.status(500).send({ error: 'Failed to reject transfer' });
    }
  });

  // Complete a transfer (mark as received at destination)
  fastify.post('/:id/complete', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { notifyUserId } = request.body as { notifyUserId?: string };
      const userId = (request as any).user?.userId;

      // Get user info for history logging
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, firstName: true, lastName: true }
      });

      if (!currentUser) {
        return reply.status(401).send({ error: 'User not found' });
      }

      const transfer = await prisma.transfer.findUnique({
        where: { id },
        include: {
          Warehouse_Transfer_fromWarehouseIdToWarehouse: true,
          Warehouse_Transfer_toWarehouseIdToWarehouse: true,
          TransferItem: true
        }
      });

      if (!transfer) {
        return reply.status(404).send({ error: 'Transfer not found' });
      }

      // Prevent double completion
      if (transfer.status === 'COMPLETED') {
        return reply.status(400).send({
          error: 'Transfer has already been completed',
          completedAt: transfer.completedAt
        });
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
          include: transferInclude
        });

        // Update stock for each item
        for (const item of (transfer as any).TransferItem) {
          // Convert wood status to proper camelCase field name
          // e.g. NOT_DRIED -> statusNotDried, UNDER_DRYING -> statusUnderDrying
          const statusField = `status${item.woodStatus.split('_').map((word, index) =>
            index === 0 ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() :
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          ).join('')}`;

          // If source warehouse has stock control, remove from in-transit-out
          if ((transfer as any).Warehouse_Transfer_fromWarehouseIdToWarehouse.stockControlEnabled) {
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

            // Log stock movement OUT
            const { createStockMovement } = await import('../services/stockMovementService.js');
            await createStockMovement({
              warehouseId: transfer.fromWarehouseId,
              woodTypeId: item.woodTypeId,
              thickness: item.thickness,
              movementType: 'TRANSFER_OUT',
              quantityChange: -item.quantity,
              fromStatus: item.woodStatus as any,
              referenceType: 'TRANSFER',
              referenceId: transfer.id,
              referenceNumber: transfer.transferNumber,
              userId: currentUser.id,
              details: `Transfer to ${(transfer as any).Warehouse_Transfer_toWarehouseIdToWarehouse.name}`
            }, tx);
          }

          // If destination warehouse has stock control, add to stock and remove from in-transit-in
          if ((transfer as any).Warehouse_Transfer_toWarehouseIdToWarehouse.stockControlEnabled) {
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

            // Log stock movement IN
            const { createStockMovement } = await import('../services/stockMovementService.js');
            await createStockMovement({
              warehouseId: transfer.toWarehouseId,
              woodTypeId: item.woodTypeId,
              thickness: item.thickness,
              movementType: 'TRANSFER_IN',
              quantityChange: item.quantity,
              toStatus: item.woodStatus as any,
              referenceType: 'TRANSFER',
              referenceId: transfer.id,
              referenceNumber: transfer.transferNumber,
              userId: currentUser.id,
              details: `Transfer from ${(transfer as any).Warehouse_Transfer_fromWarehouseIdToWarehouse.name}`
            }, tx);
          }
        }

        // Log completion history
        const userName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email;
        await tx.transferHistory.create({
          data: {
            id: crypto.randomUUID(),
            transferId: updatedTransfer.id,
            transferNumber: updatedTransfer.transferNumber,
            userId: currentUser.id,
            userName,
            userEmail: currentUser.email,
            action: 'COMPLETED',
            details: `Transfer completed and stock updated at ${(transfer as any).Warehouse_Transfer_toWarehouseIdToWarehouse.name}`
          }
        });

        // Send notification if user is specified
        if (notifyUserId) {
          await tx.notification.create({
            data: {
              userId: notifyUserId,
              type: 'TRANSFER_COMPLETED',
              title: 'Transfer Completed',
              message: `${userName} completed transfer ${updatedTransfer.transferNumber} from ${(transfer as any).Warehouse_Transfer_fromWarehouseIdToWarehouse.name} to ${(transfer as any).Warehouse_Transfer_toWarehouseIdToWarehouse.name}`,
              linkUrl: `/dashboard/factory/wood-transfer?transfer=${updatedTransfer.id}`
            }
          });
        }

        return updatedTransfer;
      });

      return mapTransfer(result);
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
        include: transferInclude,
        orderBy: { createdAt: 'asc' }
      });

      return pendingTransfers.map(mapTransfer);
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      return reply.status(500).send({ error: 'Failed to fetch pending approvals' });
    }
  });

  // Get transfer history/audit trail
  fastify.get('/:id/history', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const history = await prisma.transferHistory.findMany({
        where: { transferId: id },
        orderBy: { timestamp: 'asc' }
      });

      return history;
    } catch (error) {
      console.error('Error fetching transfer history:', error);
      return reply.status(500).send({ error: 'Failed to fetch transfer history' });
    }
  });

  // Edit a transfer (only if NOT completed)
  fastify.put('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as any;
      const userId = (request as any).user?.userId;
      const userRole = (request as any).user?.role;

      // SECURITY: Only ADMIN, FACTORY_MANAGER, or WAREHOUSE_MANAGER can edit transfers
      if (!['ADMIN', 'FACTORY_MANAGER', 'WAREHOUSE_MANAGER'].includes(userRole)) {
        return reply.status(403).send({
          error: 'Access denied',
          message: 'You do not have permission to edit transfers'
        });
      }

      // Get current user info for history
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, firstName: true, lastName: true }
      });

      if (!currentUser) {
        return reply.status(401).send({ error: 'User not found' });
      }

      // Get existing transfer with all details
      const existingTransfer = await prisma.transfer.findUnique({
        where: { id },
        include: {
          Warehouse_Transfer_fromWarehouseIdToWarehouse: true,
          Warehouse_Transfer_toWarehouseIdToWarehouse: true,
          TransferItem: {
            include: {
              WoodType: true
            }
          }
        }
      });

      if (!existingTransfer) {
        return reply.status(404).send({ error: 'Transfer not found' });
      }

      // SECURITY: Cannot edit completed transfers (only admin can via admin-edit endpoint)
      if (existingTransfer.status === 'COMPLETED') {
        return reply.status(403).send({
          error: 'Cannot edit completed transfer',
          message: 'Only administrators can edit completed transfers'
        });
      }

      // Track changes for history
      const changes: string[] = [];

      // Check what changed
      if (data.transferDate && new Date(data.transferDate).getTime() !== new Date(existingTransfer.transferDate).getTime()) {
        changes.push(`Transfer date changed from ${new Date(existingTransfer.transferDate).toLocaleDateString()} to ${new Date(data.transferDate).toLocaleDateString()}`);
      }

      if (data.notes !== undefined && data.notes !== existingTransfer.notes) {
        changes.push(`Notes updated`);
      }

      if (data.fromWarehouseId && data.fromWarehouseId !== existingTransfer.fromWarehouseId) {
        changes.push(`Source warehouse changed`);
      }

      if (data.toWarehouseId && data.toWarehouseId !== existingTransfer.toWarehouseId) {
        changes.push(`Destination warehouse changed`);
      }

      // Update transfer and log history in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Update the transfer
        const updatedTransfer = await tx.transfer.update({
          where: { id },
          data: {
            transferDate: data.transferDate ? new Date(data.transferDate) : undefined,
            notes: data.notes !== undefined ? data.notes : undefined,
            fromWarehouseId: data.fromWarehouseId || undefined,
            toWarehouseId: data.toWarehouseId || undefined
          },
          include: transferInclude
        });

        // Log history only if changes were made
        if (changes.length > 0) {
          const userName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email;
          await tx.transferHistory.create({
            data: {
              id: crypto.randomUUID(),
              transferId: updatedTransfer.id,
              transferNumber: updatedTransfer.transferNumber,
              userId: currentUser.id,
              userName,
              userEmail: currentUser.email,
              action: 'EDITED',
              details: changes.join(', ')
            }
          });
        }

        return updatedTransfer;
      });

      return mapTransfer(result);
    } catch (error) {
      console.error('Error editing transfer:', error);
      return reply.status(500).send({ error: 'Failed to edit transfer' });
    }
  });

  // Admin-only: Edit a transfer (even if completed)
  fastify.put('/:id/admin-edit', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as any;
      const userId = (request as any).user?.userId;
      const userRole = (request as any).user?.role;

      // SECURITY: Only ADMIN can edit transfers
      if (userRole !== 'ADMIN') {
        return reply.status(403).send({
          error: 'Access denied',
          message: 'Only administrators can edit transfers'
        });
      }

      // Get current user info for history
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, firstName: true, lastName: true }
      });

      if (!currentUser) {
        return reply.status(401).send({ error: 'User not found' });
      }

      // Get existing transfer with all details
      const existingTransfer = await prisma.transfer.findUnique({
        where: { id },
        include: {
          Warehouse_Transfer_fromWarehouseIdToWarehouse: true,
          Warehouse_Transfer_toWarehouseIdToWarehouse: true,
          TransferItem: {
            include: {
              WoodType: true
            }
          }
        }
      });

      if (!existingTransfer) {
        return reply.status(404).send({ error: 'Transfer not found' });
      }

      // Track changes for history
      const changes: string[] = [];

      // Check what changed
      if (data.transferDate && new Date(data.transferDate).getTime() !== new Date(existingTransfer.transferDate).getTime()) {
        changes.push(`Transfer date changed from ${new Date(existingTransfer.transferDate).toLocaleDateString()} to ${new Date(data.transferDate).toLocaleDateString()}`);
      }

      if (data.notes !== undefined && data.notes !== existingTransfer.notes) {
        changes.push(`Notes updated`);
      }

      if (data.fromWarehouseId && data.fromWarehouseId !== existingTransfer.fromWarehouseId) {
        changes.push(`Source warehouse changed`);
      }

      if (data.toWarehouseId && data.toWarehouseId !== existingTransfer.toWarehouseId) {
        changes.push(`Destination warehouse changed`);
      }

      // Update transfer and log history in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Update the transfer
        const updatedTransfer = await tx.transfer.update({
          where: { id },
          data: {
            transferDate: data.transferDate ? new Date(data.transferDate) : undefined,
            notes: data.notes !== undefined ? data.notes : undefined,
            fromWarehouseId: data.fromWarehouseId || undefined,
            toWarehouseId: data.toWarehouseId || undefined
          },
          include: transferInclude
        });

        // Log the edit in history
        if (changes.length > 0) {
          const userName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email;
          await tx.transferHistory.create({
            data: {
              id: crypto.randomUUID(),
              transferId: updatedTransfer.id,
              transferNumber: updatedTransfer.transferNumber,
              userId: currentUser.id,
              userName,
              userEmail: currentUser.email,
              action: 'EDITED',
              details: `Admin edit: ${changes.join(', ')}`
            }
          });
        }

        return updatedTransfer;
      });

      return mapTransfer(result);
    } catch (error) {
      console.error('Error editing transfer:', error);
      return reply.status(500).send({ error: 'Failed to edit transfer' });
    }
  });

  // Add new item to existing transfer
  fastify.post('/:id/items', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as any;
      const userId = (request as any).user?.userId;
      const userRole = (request as any).user?.role;

      // SECURITY: Only ADMIN, FACTORY_MANAGER, or WAREHOUSE_MANAGER can add items
      if (!['ADMIN', 'FACTORY_MANAGER', 'WAREHOUSE_MANAGER'].includes(userRole)) {
        return reply.status(403).send({
          error: 'Access denied',
          message: 'You do not have permission to add transfer items'
        });
      }

      // Get current user info
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, firstName: true, lastName: true }
      });

      if (!currentUser) {
        return reply.status(401).send({ error: 'User not found' });
      }

      // Get transfer details
      const transfer = await prisma.transfer.findUnique({
        where: { id },
        include: {
          Warehouse_Transfer_fromWarehouseIdToWarehouse: true,
          Warehouse_Transfer_toWarehouseIdToWarehouse: true
        }
      });

      if (!transfer) {
        return reply.status(404).send({ error: 'Transfer not found' });
      }

      // Can only add items to IN_TRANSIT transfers
      if (transfer.status !== 'IN_TRANSIT') {
        return reply.status(400).send({
          error: 'Cannot add items',
          message: 'Items can only be added to transfers that are IN_TRANSIT'
        });
      }

      // Validate required fields
      if (!data.woodTypeId || !data.thickness || !data.quantity || !data.woodStatus) {
        return reply.status(400).send({ error: 'Missing required fields: woodTypeId, thickness, quantity, woodStatus' });
      }

      // Get wood type info
      const woodType = await prisma.woodType.findUnique({
        where: { id: data.woodTypeId }
      });

      if (!woodType) {
        return reply.status(404).send({ error: 'Wood type not found' });
      }

      // Check stock availability if source warehouse has stock control
      if ((transfer as any).Warehouse_Transfer_fromWarehouseIdToWarehouse.stockControlEnabled) {
        const stock = await prisma.stock.findUnique({
          where: {
            warehouseId_woodTypeId_thickness: {
              warehouseId: transfer.fromWarehouseId,
              woodTypeId: data.woodTypeId,
              thickness: data.thickness
            }
          }
        });

        if (!stock) {
          return reply.status(400).send({
            error: `Stock not found in source warehouse for ${woodType.name}`
          });
        }

        const statusField = getStatusFieldName(data.woodStatus) as keyof typeof stock;
        const availableQuantity = stock[statusField] as number;

        if (availableQuantity < data.quantity) {
          return reply.status(400).send({
            error: `Insufficient stock. Available: ${availableQuantity}, Required: ${data.quantity}`
          });
        }
      }

      // Create item and adjust stock
      const result = await prisma.$transaction(async (tx) => {
        // Create the transfer item
        const newItem = await tx.transferItem.create({
          data: {
            transferId: id,
            woodTypeId: data.woodTypeId,
            thickness: data.thickness,
            quantity: data.quantity,
            woodStatus: data.woodStatus,
            remarks: data.remarks || null
          },
          include: {
            WoodType: true
          }
        });

        // Adjust stock for IN_TRANSIT transfer
        const statusField = getStatusFieldName(data.woodStatus);

        // Deduct from source warehouse (if stock control enabled)
        if ((transfer as any).Warehouse_Transfer_fromWarehouseIdToWarehouse.stockControlEnabled) {
          await tx.stock.updateMany({
            where: {
              warehouseId: transfer.fromWarehouseId,
              woodTypeId: data.woodTypeId,
              thickness: data.thickness
            },
            data: {
              [statusField]: { decrement: data.quantity },
              statusInTransitOut: { increment: data.quantity }
            }
          });
        }

        // Add to destination warehouse in-transit (if stock control enabled)
        if ((transfer as any).Warehouse_Transfer_toWarehouseIdToWarehouse.stockControlEnabled) {
          await tx.stock.updateMany({
            where: {
              warehouseId: transfer.toWarehouseId,
              woodTypeId: data.woodTypeId,
              thickness: data.thickness
            },
            data: {
              statusInTransitIn: { increment: data.quantity }
            }
          });
        }

        // Log the addition
        const userName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email;
        await tx.transferHistory.create({
          data: {
            id: crypto.randomUUID(),
            transferId: id,
            transferNumber: transfer.transferNumber,
            userId: currentUser.id,
            userName,
            userEmail: currentUser.email,
            action: 'ITEM_ADDED',
            details: `Added item: ${woodType.name} (${data.thickness}) - ${data.quantity} pcs`
          }
        });

        return newItem;
      });

      return result;
    } catch (error) {
      console.error('Error adding transfer item:', error);
      return reply.status(500).send({ error: 'Failed to add transfer item' });
    }
  });

  // Edit transfer items (only for non-completed transfers)
  fastify.put('/:id/items/:itemId', async (request, reply) => {
    try {
      const { id, itemId } = request.params as { id: string; itemId: string };
      const data = request.body as any;
      const userId = (request as any).user?.userId;
      const userRole = (request as any).user?.role;

      // SECURITY: Only ADMIN, FACTORY_MANAGER, or WAREHOUSE_MANAGER can edit transfer items
      if (!['ADMIN', 'FACTORY_MANAGER', 'WAREHOUSE_MANAGER'].includes(userRole)) {
        return reply.status(403).send({
          error: 'Access denied',
          message: 'You do not have permission to edit transfer items'
        });
      }

      // Get current user info for history
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, firstName: true, lastName: true }
      });

      if (!currentUser) {
        return reply.status(401).send({ error: 'User not found' });
      }

      // Get existing item with transfer details
      const existingItem = await prisma.transferItem.findUnique({
        where: { id: itemId },
        include: {
          transfer: {
            include: {
              Warehouse_Transfer_fromWarehouseIdToWarehouse: true,
              Warehouse_Transfer_toWarehouseIdToWarehouse: true
            }
          },
          WoodType: true
        }
      });

      if (!existingItem || existingItem.transferId !== id) {
        return reply.status(404).send({ error: 'Transfer item not found' });
      }

      // SECURITY: Cannot edit items in completed transfers (only admin can)
      if (existingItem.transfer.status === 'COMPLETED' && userRole !== 'ADMIN') {
        return reply.status(403).send({
          error: 'Cannot edit completed transfer',
          message: 'Only administrators can edit items in completed transfers'
        });
      }

      // If transfer is IN_TRANSIT and quantity is increasing, check stock availability
      if (existingItem.transfer.status === 'IN_TRANSIT' &&
          (existingItem.transfer as any).Warehouse_Transfer_fromWarehouseIdToWarehouse.stockControlEnabled &&
          data.quantity > existingItem.quantity) {
        const additionalQuantity = data.quantity - existingItem.quantity;

        // Check available stock
        const stock = await prisma.stock.findUnique({
          where: {
            warehouseId_woodTypeId_thickness: {
              warehouseId: existingItem.transfer.fromWarehouseId,
              woodTypeId: existingItem.woodTypeId,
              thickness: existingItem.thickness
            }
          }
        });

        if (!stock) {
          return reply.status(400).send({
            error: `Stock not found in source warehouse for ${(existingItem as any).WoodType.name}`
          });
        }

        const statusField = getStatusFieldName(existingItem.woodStatus) as keyof typeof stock;
        const availableQuantity = stock[statusField] as number;

        if (availableQuantity < additionalQuantity) {
          return reply.status(400).send({
            error: `Insufficient stock. Available: ${availableQuantity}, Additional needed: ${additionalQuantity}`
          });
        }
      }

      // Track changes
      const changes: string[] = [];
      const newWoodType = data.woodTypeId ? await prisma.woodType.findUnique({ where: { id: data.woodTypeId } }) : null;

      if (data.woodTypeId && data.woodTypeId !== existingItem.woodTypeId) {
        changes.push(`Wood type changed from ${(existingItem as any).WoodType.name} to ${newWoodType?.name}`);
      }
      if (data.quantity && data.quantity !== existingItem.quantity) {
        changes.push(`Quantity changed from ${existingItem.quantity} to ${data.quantity}`);
      }
      if (data.thickness && data.thickness !== existingItem.thickness) {
        changes.push(`Thickness changed from ${existingItem.thickness} to ${data.thickness}`);
      }
      if (data.woodStatus && data.woodStatus !== existingItem.woodStatus) {
        changes.push(`Status changed from ${existingItem.woodStatus} to ${data.woodStatus}`);
      }

      // Update item, adjust stock if needed, and log history
      const result = await prisma.$transaction(async (tx) => {
        // If transfer is IN_TRANSIT, adjust stock based on changes
        if (existingItem.transfer.status === 'IN_TRANSIT') {
          const statusField = getStatusFieldName(existingItem.woodStatus);
          const woodTypeChanged = data.woodTypeId && data.woodTypeId !== existingItem.woodTypeId;
          const quantityChanged = data.quantity && data.quantity !== existingItem.quantity;

          // Handle wood type change
          if (woodTypeChanged) {
            // Return the entire quantity of the old wood type to source warehouse
            if ((existingItem.transfer as any).Warehouse_Transfer_fromWarehouseIdToWarehouse.stockControlEnabled) {
              await tx.stock.updateMany({
                where: {
                  warehouseId: existingItem.transfer.fromWarehouseId,
                  woodTypeId: existingItem.woodTypeId,
                  thickness: existingItem.thickness
                },
                data: {
                  [statusField]: { increment: existingItem.quantity },
                  statusInTransitOut: { decrement: existingItem.quantity }
                }
              });

              // Deduct the new quantity of the new wood type from source warehouse
              const newQuantity = data.quantity || existingItem.quantity;

              // Check stock availability for new wood type
              const newStock = await tx.stock.findUnique({
                where: {
                  warehouseId_woodTypeId_thickness: {
                    warehouseId: existingItem.transfer.fromWarehouseId,
                    woodTypeId: data.woodTypeId,
                    thickness: existingItem.thickness
                  }
                }
              });

              if (!newStock) {
                throw new Error(`Stock not found for ${newWoodType?.name} in source warehouse`);
              }

              const availableQuantity = newStock[statusField as keyof typeof newStock] as number;
              if (availableQuantity < newQuantity) {
                throw new Error(`Insufficient stock for ${newWoodType?.name}. Available: ${availableQuantity}, Required: ${newQuantity}`);
              }

              await tx.stock.updateMany({
                where: {
                  warehouseId: existingItem.transfer.fromWarehouseId,
                  woodTypeId: data.woodTypeId,
                  thickness: existingItem.thickness
                },
                data: {
                  [statusField]: { decrement: newQuantity },
                  statusInTransitOut: { increment: newQuantity }
                }
              });
            }

            // Adjust destination warehouse in-transit stock
            if ((existingItem.transfer as any).Warehouse_Transfer_toWarehouseIdToWarehouse.stockControlEnabled) {
              // Remove old wood type from in-transit
              await tx.stock.updateMany({
                where: {
                  warehouseId: existingItem.transfer.toWarehouseId,
                  woodTypeId: existingItem.woodTypeId,
                  thickness: existingItem.thickness
                },
                data: {
                  statusInTransitIn: { decrement: existingItem.quantity }
                }
              });

              // Add new wood type to in-transit
              const newQuantity = data.quantity || existingItem.quantity;
              await tx.stock.updateMany({
                where: {
                  warehouseId: existingItem.transfer.toWarehouseId,
                  woodTypeId: data.woodTypeId,
                  thickness: existingItem.thickness
                },
                data: {
                  statusInTransitIn: { increment: newQuantity }
                }
              });
            }
          }
          // Handle quantity change only (no wood type change)
          else if (quantityChanged) {
            const quantityDelta = data.quantity - existingItem.quantity;

            // Adjust source warehouse stock (only if source has stock control)
            if ((existingItem.transfer as any).Warehouse_Transfer_fromWarehouseIdToWarehouse.stockControlEnabled) {
              if (quantityDelta > 0) {
                // Quantity increased - deduct more from source
                await tx.stock.updateMany({
                  where: {
                    warehouseId: existingItem.transfer.fromWarehouseId,
                    woodTypeId: existingItem.woodTypeId,
                    thickness: existingItem.thickness
                  },
                  data: {
                    [statusField]: { decrement: quantityDelta },
                    statusInTransitOut: { increment: quantityDelta }
                  }
                });
              } else {
                // Quantity decreased - return to source
                await tx.stock.updateMany({
                  where: {
                    warehouseId: existingItem.transfer.fromWarehouseId,
                    woodTypeId: existingItem.woodTypeId,
                    thickness: existingItem.thickness
                  },
                  data: {
                    [statusField]: { increment: Math.abs(quantityDelta) },
                    statusInTransitOut: { decrement: Math.abs(quantityDelta) }
                  }
                });
              }
            }

            // Adjust destination warehouse in-transit stock (only if destination has stock control)
            if ((existingItem.transfer as any).Warehouse_Transfer_toWarehouseIdToWarehouse.stockControlEnabled) {
              await tx.stock.updateMany({
                where: {
                  warehouseId: existingItem.transfer.toWarehouseId,
                  woodTypeId: existingItem.woodTypeId,
                  thickness: existingItem.thickness
                },
                data: {
                  statusInTransitIn: { increment: quantityDelta }
                }
              });
            }
          }
        }

        // Update the item
        const updatedItem = await tx.transferItem.update({
          where: { id: itemId },
          data: {
            woodTypeId: data.woodTypeId || undefined,
            thickness: data.thickness || undefined,
            quantity: data.quantity || undefined,
            woodStatus: data.woodStatus || undefined,
            remarks: data.remarks !== undefined ? data.remarks : undefined
          },
          include: {
            WoodType: true
          }
        });

        // Log the edit
        if (changes.length > 0) {
          const userName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email;
          await tx.transferHistory.create({
            data: {
              id: crypto.randomUUID(),
              transferId: id,
              transferNumber: existingItem.transfer.transferNumber,
              userId: currentUser.id,
              userName,
              userEmail: currentUser.email,
              action: 'ITEM_EDITED',
              details: `Item edit (${(existingItem as any).WoodType.name}): ${changes.join(', ')}`
            }
          });
        }

        return updatedItem;
      });

      return result;
    } catch (error) {
      console.error('Error editing transfer item:', error);
      return reply.status(500).send({ error: 'Failed to edit transfer item' });
    }
  });

  // Send notification for a transfer
  fastify.post('/:id/notify', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { userId } = request.body as { userId: string };
      const currentUserId = (request as any).user?.userId;

      if (!userId) {
        return reply.status(400).send({ error: 'User ID is required' });
      }

      // Get current user info
      const currentUser = await prisma.user.findUnique({
        where: { id: currentUserId },
        select: { id: true, email: true, firstName: true, lastName: true }
      });

      if (!currentUser) {
        return reply.status(401).send({ error: 'User not found' });
      }

      // Get transfer details
      const transfer = await prisma.transfer.findUnique({
        where: { id },
        include: {
          Warehouse_Transfer_fromWarehouseIdToWarehouse: {
            select: { name: true }
          },
          Warehouse_Transfer_toWarehouseIdToWarehouse: {
            select: { name: true }
          }
        }
      });

      if (!transfer) {
        return reply.status(404).send({ error: 'Transfer not found' });
      }

      // Verify the target user exists
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true }
      });

      if (!targetUser) {
        return reply.status(404).send({ error: 'Target user not found' });
      }

      // Create notification
      const currentUserName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email;

      // Determine notification type based on transfer status
      let notificationType = 'TRANSFER_NOTIFICATION';
      let notificationTitle = 'Transfer Notification';

      switch (transfer.status) {
        case 'COMPLETED':
          notificationType = 'TRANSFER_COMPLETED';
          notificationTitle = 'Transfer Completed';
          break;
        case 'IN_TRANSIT':
          notificationType = 'TRANSFER_IN_TRANSIT';
          notificationTitle = 'Transfer In Transit';
          break;
        case 'PENDING':
          notificationType = 'TRANSFER_PENDING';
          notificationTitle = 'Transfer Pending Approval';
          break;
        default:
          notificationType = 'TRANSFER_NOTIFICATION';
          notificationTitle = 'Transfer Update';
      }

      await prisma.notification.create({
        data: {
          userId: userId,
          type: notificationType,
          title: notificationTitle,
          message: `${currentUserName} sent you notification about transfer ${transfer.transferNumber} from ${(transfer as any).Warehouse_Transfer_fromWarehouseIdToWarehouse.name} to ${(transfer as any).Warehouse_Transfer_toWarehouseIdToWarehouse.name}`,
          linkUrl: `/dashboard/factory/wood-transfer?transfer=${transfer.id}`
        }
      });

      return { message: 'Notification sent successfully' };
    } catch (error) {
      console.error('Error sending notification:', error);
      return reply.status(500).send({ error: 'Failed to send notification' });
    }
  });
}

export default transferRoutes;
