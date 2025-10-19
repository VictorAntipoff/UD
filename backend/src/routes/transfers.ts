import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import {
  authenticateToken,
  canCreateTransfer,
  canApproveTransfer,
  requireTransferApproval
} from '../middleware/auth.js';

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
          },
          history: {
            orderBy: { timestamp: 'asc' }
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
          const statusField = `status${item.woodStatus.charAt(0) + item.woodStatus.slice(1).toLowerCase().replace(/_/g, '')}` as keyof typeof stock;
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

        // Log history
        const user = transfer.createdBy;
        const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
        await tx.transferHistory.create({
          data: {
            transferId: transfer.id,
            transferNumber: transfer.transferNumber,
            userId: user.id,
            userName,
            userEmail: user.email,
            action: 'CREATED',
            details: `Transfer created from ${fromWarehouse.name} to ${toWarehouse.name} with ${transfer.items.length} item(s)`
          }
        });

        // Log auto-approval if applicable
        if (initialStatus === 'APPROVED') {
          await tx.transferHistory.create({
            data: {
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

        return transfer;
      }, {
        maxWait: 10000, // 10 seconds max wait to get a connection
        timeout: 15000, // 15 seconds transaction timeout
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
      const userRole = (request as any).user?.role;

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

      // SECURITY: Check if user has permission to approve transfers for this warehouse
      const canApprove = await canApproveTransfer(userId, transfer.fromWarehouseId, userRole);
      if (!canApprove) {
        return reply.status(403).send({
          error: 'Insufficient permissions',
          message: 'You do not have permission to approve transfers for this warehouse'
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

        // Log approval history
        const approver = updatedTransfer.approvedBy!;
        const approverName = `${approver.firstName || ''} ${approver.lastName || ''}`.trim() || approver.email;
        await tx.transferHistory.create({
          data: {
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

      // Log rejection history
      const rejector = updatedTransfer.approvedBy!;
      const rejectorName = `${rejector.firstName || ''} ${rejector.lastName || ''}`.trim() || rejector.email;
      await prisma.transferHistory.create({
        data: {
          transferId: updatedTransfer.id,
          transferNumber: updatedTransfer.transferNumber,
          userId: rejector.id,
          userName: rejectorName,
          userEmail: rejector.email,
          action: 'REJECTED',
          details: rejectionReason || 'Transfer rejected'
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
          // Convert wood status to proper camelCase field name
          // e.g. NOT_DRIED -> statusNotDried, UNDER_DRYING -> statusUnderDrying
          const statusField = `status${item.woodStatus.split('_').map((word, index) =>
            index === 0 ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() :
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          ).join('')}`;

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

        // Log completion history
        const userName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email;
        await tx.transferHistory.create({
          data: {
            transferId: updatedTransfer.id,
            transferNumber: updatedTransfer.transferNumber,
            userId: currentUser.id,
            userName,
            userEmail: currentUser.email,
            action: 'COMPLETED',
            details: `Transfer completed and stock updated at ${transfer.toWarehouse.name}`
          }
        });

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
          fromWarehouse: true,
          toWarehouse: true,
          items: {
            include: {
              woodType: true
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

        // Log the edit in history
        if (changes.length > 0) {
          const userName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email;
          await tx.transferHistory.create({
            data: {
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

      return result;
    } catch (error) {
      console.error('Error editing transfer:', error);
      return reply.status(500).send({ error: 'Failed to edit transfer' });
    }
  });

  // Admin-only: Edit transfer items
  fastify.put('/:id/items/:itemId', async (request, reply) => {
    try {
      const { id, itemId } = request.params as { id: string; itemId: string };
      const data = request.body as any;
      const userId = (request as any).user?.userId;
      const userRole = (request as any).user?.role;

      // SECURITY: Only ADMIN can edit transfer items
      if (userRole !== 'ADMIN') {
        return reply.status(403).send({
          error: 'Access denied',
          message: 'Only administrators can edit transfer items'
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

      // Get existing item
      const existingItem = await prisma.transferItem.findUnique({
        where: { id: itemId },
        include: {
          transfer: true,
          woodType: true
        }
      });

      if (!existingItem || existingItem.transferId !== id) {
        return reply.status(404).send({ error: 'Transfer item not found' });
      }

      // Track changes
      const changes: string[] = [];
      if (data.quantity && data.quantity !== existingItem.quantity) {
        changes.push(`Quantity changed from ${existingItem.quantity} to ${data.quantity}`);
      }
      if (data.thickness && data.thickness !== existingItem.thickness) {
        changes.push(`Thickness changed from ${existingItem.thickness} to ${data.thickness}`);
      }
      if (data.woodStatus && data.woodStatus !== existingItem.woodStatus) {
        changes.push(`Status changed from ${existingItem.woodStatus} to ${data.woodStatus}`);
      }

      // Update item and log history
      const result = await prisma.$transaction(async (tx) => {
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
            woodType: true
          }
        });

        // Log the edit
        if (changes.length > 0) {
          const userName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email;
          await tx.transferHistory.create({
            data: {
              transferId: id,
              transferNumber: existingItem.transfer.transferNumber,
              userId: currentUser.id,
              userName,
              userEmail: currentUser.email,
              action: 'ITEM_EDITED',
              details: `Admin edit (${existingItem.woodType.name}): ${changes.join(', ')}`
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
}

export default transferRoutes;
