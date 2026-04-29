import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import {
  authenticateToken,
  canCreateTransfer,
  canApproveTransfer,
  requireTransferApproval
} from '../middleware/auth.js';
import {
  postTransferStartSourceSide,
  postTransferStartDestSide,
  postTransferCompleteSourceSide,
  postTransferCompleteDestSide,
  postTransferCancelSourceSide,
  postTransferCancelDestSide,
  postTransferReverseDestSide,
  postTransferReverseSourceSide,
} from '../services/stockLedger.js';
import { sendTelegramMessage, TELEGRAM_ICONS } from '../services/telegramNotify.js';
import { filterRecipientsByPreference, userWantsChannel, excludeActorUnlessOptedIn } from '../services/notificationPreferences.js';
import type { WoodStatus } from '@prisma/client';
import crypto from 'node:crypto';

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

      // Generate transfer number (format: UD-TRF-00001)
      const count = await prisma.transfer.count();
      const transferNumber = `UD-TRF-${String(count + 1).padStart(5, '0')}`;

      // Determine initial status based on whether approval is required
      const initialStatus = fromWarehouse.requiresApproval ? 'PENDING' : 'APPROVED';

      // Create transfer in a transaction with stock validation inside for atomicity
      const result = await prisma.$transaction(async (tx) => {
        // Validate stock availability inside the transaction to prevent race conditions
        if (fromWarehouse.stockControlEnabled) {
          for (const item of data.items) {
            const stock = await tx.stock.findUnique({
              where: {
                warehouseId_woodTypeId_thickness: {
                  warehouseId: data.fromWarehouseId,
                  woodTypeId: item.woodTypeId,
                  thickness: item.thickness
                }
              }
            });

            if (!stock) {
              throw new Error(`Stock not found in source warehouse for wood type ${item.woodTypeId}, thickness ${item.thickness}`);
            }

            const statusField = getStatusFieldName(item.woodStatus) as keyof typeof stock;
            const availableQuantity = stock[statusField] as number;

            if (availableQuantity < item.quantity) {
              throw new Error(`Insufficient stock. Available: ${availableQuantity}, Requested: ${item.quantity}`);
            }
          }
        }

        // Create the transfer
        const transfer = await tx.transfer.create({
          data: {
            id: crypto.randomUUID(),
            transferNumber,
            fromWarehouseId: data.fromWarehouseId,
            toWarehouseId: data.toWarehouseId,
            transferDate: data.transferDate ? new Date(data.transferDate) : new Date(),
            status: initialStatus,
            notes: data.notes || null,
            createdById: userId,
            approvedById: initialStatus === 'APPROVED' ? userId : null,
            approvedAt: initialStatus === 'APPROVED' ? new Date() : null,
            updatedAt: new Date(),
            TransferItem: {
              create: data.items.map((item: any) => ({
                id: crypto.randomUUID(),
                woodTypeId: item.woodTypeId,
                thickness: item.thickness,
                quantity: item.quantity,
                woodStatus: item.woodStatus,
                remarks: item.remarks || null,
                updatedAt: new Date()
              }))
            }
          },
          include: transferInclude
        });

        // If transfer is auto-approved and either warehouse has stock control,
        // post stock entries via the ledger helper. src and dest are independent.
        if (initialStatus === 'APPROVED' && (fromWarehouse.stockControlEnabled || toWarehouse.stockControlEnabled)) {
          for (const item of data.items) {
            // Source side: woodStatus → IN_TRANSIT_OUT (balanced group), if src has stock control
            if (fromWarehouse.stockControlEnabled) {
              await postTransferStartSourceSide({
                warehouseId: data.fromWarehouseId,
                woodTypeId: item.woodTypeId,
                thickness: item.thickness,
                pieceCount: item.quantity,
                woodStatus: item.woodStatus as WoodStatus,
                transferId: transfer.id,
                transferNumber: transfer.transferNumber,
                user: { id: userId },
              }, tx);
            }
            // Destination side: IN_TRANSIT_IN (single-leg), if dest has stock control
            if (toWarehouse.stockControlEnabled) {
              await postTransferStartDestSide({
                warehouseId: data.toWarehouseId,
                woodTypeId: item.woodTypeId,
                thickness: item.thickness,
                pieceCount: item.quantity,
                woodStatus: item.woodStatus as WoodStatus,
                transferId: transfer.id,
                transferNumber: transfer.transferNumber,
                user: { id: userId },
              }, tx);
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
        for (const notifyUserId of notifyUserIds) {
          await tx.notification.create({
            data: {
              id: crypto.randomUUID(),
              userId: notifyUserId,
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
    } catch (error: any) {
      console.error('Error creating transfer:', error);
      const message = error?.message || '';
      if (message.includes('Insufficient stock') || message.includes('Stock not found')) {
        return reply.status(400).send({ error: message });
      }
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

      // Approve and update stock in a transaction (validation inside for atomicity)
      const result = await prisma.$transaction(async (tx) => {
        // Validate stock availability inside transaction to prevent race conditions
        if ((transfer as any).Warehouse_Transfer_fromWarehouseIdToWarehouse.stockControlEnabled) {
          for (const item of (transfer as any).TransferItem) {
            const stock = await tx.stock.findUnique({
              where: {
                warehouseId_woodTypeId_thickness: {
                  warehouseId: transfer.fromWarehouseId,
                  woodTypeId: item.woodTypeId,
                  thickness: item.thickness
                }
              }
            });

            if (!stock) {
              throw new Error(`Stock not found in source warehouse for item ${item.id}`);
            }

            const statusField = getStatusFieldName(item.woodStatus) as keyof typeof stock;
            const availableQuantity = stock[statusField] as number;

            if (availableQuantity < item.quantity) {
              throw new Error(`Insufficient stock. Available: ${availableQuantity}, Requested: ${item.quantity}`);
            }
          }
        }

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

        const fromWh = (transfer as any).Warehouse_Transfer_fromWarehouseIdToWarehouse;
        const toWh   = (transfer as any).Warehouse_Transfer_toWarehouseIdToWarehouse;
        for (const item of (transfer as any).TransferItem) {
          if (fromWh.stockControlEnabled) {
            await postTransferStartSourceSide({
              warehouseId: transfer.fromWarehouseId,
              woodTypeId: item.woodTypeId,
              thickness: item.thickness,
              pieceCount: item.quantity,
              woodStatus: item.woodStatus as WoodStatus,
              transferId: transfer.id,
              transferNumber: transfer.transferNumber,
              user: { id: userId },
            }, tx);
          }
          if (toWh.stockControlEnabled) {
            await postTransferStartDestSide({
              warehouseId: transfer.toWarehouseId,
              woodTypeId: item.woodTypeId,
              thickness: item.thickness,
              pieceCount: item.quantity,
              woodStatus: item.woodStatus as WoodStatus,
              transferId: transfer.id,
              transferNumber: transfer.transferNumber,
              user: { id: userId },
            }, tx);
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

      // Notify the transfer creator (in-app + Telegram), respecting their preferences.
      try {
        const creatorId = transfer.createdById;
        if (creatorId && creatorId !== userId) {
          const approver = (result as any).User_Transfer_approvedByIdToUser;
          const approverName = approver
            ? (`${approver.firstName || ''} ${approver.lastName || ''}`.trim() || approver.email)
            : 'An admin';
          const fromName = (transfer as any).Warehouse_Transfer_fromWarehouseIdToWarehouse?.name ?? '?';
          const toName   = (transfer as any).Warehouse_Transfer_toWarehouseIdToWarehouse?.name ?? '?';
          if (await userWantsChannel(creatorId, 'TRANSFER_APPROVED', 'inApp')) {
            await prisma.notification.create({
              data: {
                id: crypto.randomUUID(),
                userId: creatorId,
                type: 'TRANSFER_APPROVED',
                title: 'Transfer approved',
                message: `${approverName} approved transfer ${transfer.transferNumber} (${fromName} → ${toName}). It is now IN TRANSIT.`,
                linkUrl: `/dashboard/factory/wood-transfer?transfer=${transfer.id}`,
                isRead: false,
              },
            });
          }
          if (await userWantsChannel(creatorId, 'TRANSFER_APPROVED', 'telegram')) {
            void sendTelegramMessage({
              userId: creatorId,
              iconUrl: TELEGRAM_ICONS.woodTransfer,
              text:
                `*Transfer approved*\n` +
                `Transfer: *${transfer.transferNumber}*\n` +
                `${fromName} → ${toName}\n` +
                `Approved by: ${approverName}\n\n` +
                `Status: IN TRANSIT`,
              parseMode: 'Markdown',
            });
          }
        }
      } catch (notifyError) {
        console.error('Error sending transfer-approved notification:', notifyError);
      }

      return mapTransfer(result);
    } catch (error: any) {
      console.error('Error approving transfer:', error);
      const message = error?.message || '';
      if (message.includes('Insufficient stock') || message.includes('Stock not found')) {
        return reply.status(400).send({ error: message });
      }
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
          TransferItem: { include: { WoodType: true } },
          Warehouse_Transfer_fromWarehouseIdToWarehouse: true,
          Warehouse_Transfer_toWarehouseIdToWarehouse: true,
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

      // Notify the transfer creator (in-app + Telegram), respecting their preferences.
      try {
        const creatorId = transfer.createdById;
        if (creatorId && creatorId !== userId) {
          const fromName = (transfer as any).Warehouse_Transfer_fromWarehouseIdToWarehouse?.name ?? '?';
          const toName   = (transfer as any).Warehouse_Transfer_toWarehouseIdToWarehouse?.name ?? '?';
          const reasonLine = rejectionReason ? `Reason: ${rejectionReason}\n\n` : '';
          if (await userWantsChannel(creatorId, 'TRANSFER_REJECTED', 'inApp')) {
            await prisma.notification.create({
              data: {
                id: crypto.randomUUID(),
                userId: creatorId,
                type: 'TRANSFER_REJECTED',
                title: 'Transfer rejected',
                message: `${rejectorName} rejected transfer ${transfer.transferNumber} (${fromName} → ${toName}).${rejectionReason ? ' Reason: ' + rejectionReason : ''}`,
                linkUrl: `/dashboard/factory/wood-transfer?transfer=${transfer.id}`,
                isRead: false,
              },
            });
          }
          if (await userWantsChannel(creatorId, 'TRANSFER_REJECTED', 'telegram')) {
            void sendTelegramMessage({
              userId: creatorId,
              iconUrl: TELEGRAM_ICONS.woodTransfer,
              text:
                `*Transfer rejected*\n` +
                `Transfer: *${transfer.transferNumber}*\n` +
                `${fromName} → ${toName}\n` +
                `Rejected by: ${rejectorName}\n\n` +
                reasonLine +
                `You can edit and re-submit the transfer if needed.`,
              parseMode: 'Markdown',
            });
          }
        }
      } catch (notifyError) {
        console.error('Error sending transfer-rejected notification:', notifyError);
      }

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
        // Re-fetch transfer items inside transaction to get current quantities
        // (items may have been edited since the transfer was created)
        const currentTransferData = await tx.transfer.findUnique({
          where: { id },
          include: { TransferItem: true }
        });

        if (!currentTransferData) {
          throw new Error('Transfer not found');
        }

        // Update transfer status
        const updatedTransfer = await tx.transfer.update({
          where: { id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date()
          },
          include: transferInclude
        });

        // Update stock via the ledger helper (independent src/dest blocks).
        const fromWh = (transfer as any).Warehouse_Transfer_fromWarehouseIdToWarehouse;
        const toWh   = (transfer as any).Warehouse_Transfer_toWarehouseIdToWarehouse;
        for (const item of currentTransferData.TransferItem) {
          // Source side: drain IN_TRANSIT_OUT
          if (fromWh.stockControlEnabled) {
            await postTransferCompleteSourceSide({
              warehouseId: transfer.fromWarehouseId,
              woodTypeId: item.woodTypeId,
              thickness: item.thickness,
              pieceCount: item.quantity,
              woodStatus: item.woodStatus as WoodStatus,
              transferId: transfer.id,
              transferNumber: transfer.transferNumber,
              user: { id: currentUser.id },
              details: `Transfer to ${toWh.name}`,
            }, tx);
          }
          // Destination side: IN_TRANSIT_IN → woodStatus (balanced)
          if (toWh.stockControlEnabled) {
            await postTransferCompleteDestSide({
              warehouseId: transfer.toWarehouseId,
              woodTypeId: item.woodTypeId,
              thickness: item.thickness,
              pieceCount: item.quantity,
              woodStatus: item.woodStatus as WoodStatus,
              transferId: transfer.id,
              transferNumber: transfer.transferNumber,
              user: { id: currentUser.id },
              details: `Transfer from ${fromWh.name}`,
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

        // Compute recipient list — creator + optional notifyUserId, dedup'd, exclude self.
        const fromName = (transfer as any).Warehouse_Transfer_fromWarehouseIdToWarehouse?.name ?? '?';
        const toName   = (transfer as any).Warehouse_Transfer_toWarehouseIdToWarehouse?.name ?? '?';
        const candidates = [...new Set(
          [transfer.createdById, notifyUserId].filter((id): id is string => Boolean(id))
        )];
        const recipientIds = await excludeActorUnlessOptedIn(candidates, currentUser.id);
        // Filter by per-user inApp preference
        const inAppIds = await filterRecipientsByPreference(recipientIds, 'TRANSFER_COMPLETED', 'inApp');
        for (const rid of inAppIds) {
          await tx.notification.create({
            data: {
              id: crypto.randomUUID(),
              userId: rid,
              type: 'TRANSFER_COMPLETED',
              title: 'Transfer Completed',
              message: `${userName} completed transfer ${updatedTransfer.transferNumber} from ${fromName} to ${toName}`,
              linkUrl: `/dashboard/factory/wood-transfer?transfer=${updatedTransfer.id}`,
            },
          });
        }

        return { updatedTransfer, recipientIds, fromName, toName, userName };
      });

      // Telegram dispatch outside the transaction (fire-and-forget), filtered by preference.
      try {
        const { recipientIds, fromName, toName, userName } = result;
        const telegramIds = await filterRecipientsByPreference(recipientIds, 'TRANSFER_COMPLETED', 'telegram');
        for (const rid of telegramIds) {
          void sendTelegramMessage({
            userId: rid,
            iconUrl: TELEGRAM_ICONS.woodTransfer,
            text:
              `*Transfer completed*\n` +
              `Transfer: *${(result as any).updatedTransfer.transferNumber}*\n` +
              `${fromName} → ${toName}\n` +
              `Received by: ${userName}\n\n` +
              `Stock has been updated at the destination warehouse.`,
            parseMode: 'Markdown',
          });
        }
      } catch (notifyError) {
        console.error('Error sending transfer-completed Telegram:', notifyError);
      }

      return mapTransfer(result.updatedTransfer);
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
            id: crypto.randomUUID(),
            transferId: id,
            woodTypeId: data.woodTypeId,
            thickness: data.thickness,
            quantity: data.quantity,
            woodStatus: data.woodStatus,
            remarks: data.remarks || null,
            updatedAt: new Date()
          },
          include: {
            WoodType: true
          }
        });

        // Stock change via ledger helper. Only IN_TRANSIT transfers reach here.
        if ((transfer as any).Warehouse_Transfer_fromWarehouseIdToWarehouse.stockControlEnabled) {
          await postTransferStartSourceSide({
            warehouseId: transfer.fromWarehouseId,
            woodTypeId: data.woodTypeId,
            thickness: data.thickness,
            pieceCount: data.quantity,
            woodStatus: data.woodStatus as WoodStatus,
            transferId: transfer.id,
            transferNumber: transfer.transferNumber,
            user: { id: currentUser.id },
            details: `Item added to ${transfer.transferNumber}`,
          }, tx);
        }
        if ((transfer as any).Warehouse_Transfer_toWarehouseIdToWarehouse.stockControlEnabled) {
          await postTransferStartDestSide({
            warehouseId: transfer.toWarehouseId,
            woodTypeId: data.woodTypeId,
            thickness: data.thickness,
            pieceCount: data.quantity,
            woodStatus: data.woodStatus as WoodStatus,
            transferId: transfer.id,
            transferNumber: transfer.transferNumber,
            user: { id: currentUser.id },
            details: `Item added to ${transfer.transferNumber}`,
          }, tx);
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
          Transfer: {
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
      if (existingItem.Transfer.status === 'COMPLETED' && userRole !== 'ADMIN') {
        return reply.status(403).send({
          error: 'Cannot edit completed transfer',
          message: 'Only administrators can edit items in completed transfers'
        });
      }

      // If transfer is IN_TRANSIT and quantity is increasing, check stock availability
      if (existingItem.Transfer.status === 'IN_TRANSIT' &&
          (existingItem.Transfer as any).Warehouse_Transfer_fromWarehouseIdToWarehouse.stockControlEnabled &&
          data.quantity > existingItem.quantity) {
        const additionalQuantity = data.quantity - existingItem.quantity;

        // Check available stock
        const stock = await prisma.stock.findUnique({
          where: {
            warehouseId_woodTypeId_thickness: {
              warehouseId: existingItem.Transfer.fromWarehouseId,
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
        if (existingItem.Transfer.status === 'IN_TRANSIT') {
          const oldStatusField = getStatusFieldName(existingItem.woodStatus);
          const newWoodTypeId = data.woodTypeId || existingItem.woodTypeId;
          const newThickness = data.thickness || existingItem.thickness;
          const newQuantity = data.quantity || existingItem.quantity;
          const newWoodStatus = data.woodStatus || existingItem.woodStatus;
          const newStatusField = getStatusFieldName(newWoodStatus);

          const itemChanged = newWoodTypeId !== existingItem.woodTypeId ||
                              newThickness !== existingItem.thickness ||
                              newWoodStatus !== existingItem.woodStatus;
          const quantityChanged = newQuantity !== existingItem.quantity;

          const fromWh = (existingItem.Transfer as any).Warehouse_Transfer_fromWarehouseIdToWarehouse;
          const toWh   = (existingItem.Transfer as any).Warehouse_Transfer_toWarehouseIdToWarehouse;

          if (itemChanged) {
            // FULL SWAP: woodType / thickness / woodStatus changed.
            // Reverse the OLD item, then apply the NEW item, on each side independently.
            if (fromWh.stockControlEnabled) {
              // 1. Return old item to source (IN_TRANSIT_OUT -> oldWoodStatus)
              await postTransferCancelSourceSide({
                warehouseId: existingItem.Transfer.fromWarehouseId,
                woodTypeId: existingItem.woodTypeId,
                thickness: existingItem.thickness,
                pieceCount: existingItem.quantity,
                woodStatus: existingItem.woodStatus as WoodStatus,
                transferId: existingItem.Transfer.id,
                transferNumber: existingItem.Transfer.transferNumber,
                user: { id: currentUser.id },
                details: `Edit (revert old): ${changes.join(', ')}`,
              }, tx);
              // 2. Deduct new item from source (newWoodStatus -> IN_TRANSIT_OUT)
              await postTransferStartSourceSide({
                warehouseId: existingItem.Transfer.fromWarehouseId,
                woodTypeId: newWoodTypeId,
                thickness: newThickness,
                pieceCount: newQuantity,
                woodStatus: newWoodStatus as WoodStatus,
                transferId: existingItem.Transfer.id,
                transferNumber: existingItem.Transfer.transferNumber,
                user: { id: currentUser.id },
                details: `Edit (apply new): ${changes.join(', ')}`,
              }, tx);
            }
            if (toWh.stockControlEnabled) {
              // 1. Remove OLD from destination IN_TRANSIT_IN
              await postTransferCancelDestSide({
                warehouseId: existingItem.Transfer.toWarehouseId,
                woodTypeId: existingItem.woodTypeId,
                thickness: existingItem.thickness,
                pieceCount: existingItem.quantity,
                woodStatus: existingItem.woodStatus as WoodStatus,
                transferId: existingItem.Transfer.id,
                transferNumber: existingItem.Transfer.transferNumber,
                user: { id: currentUser.id },
                details: `Edit (revert old): ${changes.join(', ')}`,
              }, tx);
              // 2. Add NEW to destination IN_TRANSIT_IN
              await postTransferStartDestSide({
                warehouseId: existingItem.Transfer.toWarehouseId,
                woodTypeId: newWoodTypeId,
                thickness: newThickness,
                pieceCount: newQuantity,
                woodStatus: newWoodStatus as WoodStatus,
                transferId: existingItem.Transfer.id,
                transferNumber: existingItem.Transfer.transferNumber,
                user: { id: currentUser.id },
                details: `Edit (apply new): ${changes.join(', ')}`,
              }, tx);
            }
          }
          // QTY-ONLY DELTA: same wood/thickness/status, just quantity changed.
          else if (quantityChanged) {
            const quantityDelta = newQuantity - existingItem.quantity;
            const absDelta = Math.abs(quantityDelta);

            if (fromWh.stockControlEnabled) {
              if (quantityDelta > 0) {
                // Increase: deduct more from source (woodStatus -> IN_TRANSIT_OUT)
                await postTransferStartSourceSide({
                  warehouseId: existingItem.Transfer.fromWarehouseId,
                  woodTypeId: existingItem.woodTypeId,
                  thickness: existingItem.thickness,
                  pieceCount: absDelta,
                  woodStatus: existingItem.woodStatus as WoodStatus,
                  transferId: existingItem.Transfer.id,
                  transferNumber: existingItem.Transfer.transferNumber,
                  user: { id: currentUser.id },
                  details: `Edit qty: +${absDelta} pieces`,
                }, tx);
              } else {
                // Decrease: return to source (IN_TRANSIT_OUT -> woodStatus)
                await postTransferCancelSourceSide({
                  warehouseId: existingItem.Transfer.fromWarehouseId,
                  woodTypeId: existingItem.woodTypeId,
                  thickness: existingItem.thickness,
                  pieceCount: absDelta,
                  woodStatus: existingItem.woodStatus as WoodStatus,
                  transferId: existingItem.Transfer.id,
                  transferNumber: existingItem.Transfer.transferNumber,
                  user: { id: currentUser.id },
                  details: `Edit qty: -${absDelta} pieces returned`,
                }, tx);
              }
            }
            if (toWh.stockControlEnabled) {
              if (quantityDelta > 0) {
                await postTransferStartDestSide({
                  warehouseId: existingItem.Transfer.toWarehouseId,
                  woodTypeId: existingItem.woodTypeId,
                  thickness: existingItem.thickness,
                  pieceCount: absDelta,
                  woodStatus: existingItem.woodStatus as WoodStatus,
                  transferId: existingItem.Transfer.id,
                  transferNumber: existingItem.Transfer.transferNumber,
                  user: { id: currentUser.id },
                  details: `Edit qty: +${absDelta} in transit`,
                }, tx);
              } else {
                await postTransferCancelDestSide({
                  warehouseId: existingItem.Transfer.toWarehouseId,
                  woodTypeId: existingItem.woodTypeId,
                  thickness: existingItem.thickness,
                  pieceCount: absDelta,
                  woodStatus: existingItem.woodStatus as WoodStatus,
                  transferId: existingItem.Transfer.id,
                  transferNumber: existingItem.Transfer.transferNumber,
                  user: { id: currentUser.id },
                  details: `Edit qty: -${absDelta} from in transit`,
                }, tx);
              }
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
              transferNumber: existingItem.Transfer.transferNumber,
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

  // Delete a transfer item
  fastify.delete('/:id/items/:itemId', async (request, reply) => {
    try {
      const { id, itemId } = request.params as { id: string; itemId: string };
      const userId = (request as any).user?.userId;
      const userRole = (request as any).user?.role;

      if (!['ADMIN', 'FACTORY_MANAGER', 'WAREHOUSE_MANAGER'].includes(userRole)) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, firstName: true, lastName: true }
      });

      if (!currentUser) {
        return reply.status(401).send({ error: 'User not found' });
      }

      // Get the item with transfer and wood type
      const existingItem = await prisma.transferItem.findUnique({
        where: { id: itemId },
        include: {
          Transfer: {
            include: {
              Warehouse_Transfer_fromWarehouseIdToWarehouse: true,
              Warehouse_Transfer_toWarehouseIdToWarehouse: true,
              TransferItem: true
            }
          },
          WoodType: true
        }
      });

      if (!existingItem || existingItem.transferId !== id) {
        return reply.status(404).send({ error: 'Transfer item not found' });
      }

      if (existingItem.Transfer.status === 'COMPLETED') {
        return reply.status(400).send({ error: 'Cannot delete items from a completed transfer' });
      }

      // Must have at least 1 item remaining
      if (existingItem.Transfer.TransferItem.length <= 1) {
        return reply.status(400).send({ error: 'Cannot delete the last item. Cancel the transfer instead.' });
      }

      await prisma.$transaction(async (tx) => {
        // If IN_TRANSIT, reverse the stock movements
        if (existingItem.Transfer.status === 'IN_TRANSIT') {
          const fromWarehouse = (existingItem.Transfer as any).Warehouse_Transfer_fromWarehouseIdToWarehouse;
          const toWarehouse = (existingItem.Transfer as any).Warehouse_Transfer_toWarehouseIdToWarehouse;
          const statusField = getStatusFieldName(existingItem.woodStatus);

          // Return source pieces (IN_TRANSIT_OUT → woodStatus) and clear dest in-transit.
          if (fromWarehouse.stockControlEnabled) {
            await postTransferCancelSourceSide({
              warehouseId: existingItem.Transfer.fromWarehouseId,
              woodTypeId: existingItem.woodTypeId,
              thickness: existingItem.thickness,
              pieceCount: existingItem.quantity,
              woodStatus: existingItem.woodStatus as WoodStatus,
              transferId: existingItem.Transfer.id,
              transferNumber: existingItem.Transfer.transferNumber,
              user: { id: currentUser.id },
              details: `Item removed from ${existingItem.Transfer.transferNumber}`,
            }, tx);
          }
          if (toWarehouse.stockControlEnabled) {
            await postTransferCancelDestSide({
              warehouseId: existingItem.Transfer.toWarehouseId,
              woodTypeId: existingItem.woodTypeId,
              thickness: existingItem.thickness,
              pieceCount: existingItem.quantity,
              woodStatus: existingItem.woodStatus as WoodStatus,
              transferId: existingItem.Transfer.id,
              transferNumber: existingItem.Transfer.transferNumber,
              user: { id: currentUser.id },
              details: `Item removed from ${existingItem.Transfer.transferNumber}`,
            }, tx);
          }
        }

        // Delete the item
        await tx.transferItem.delete({ where: { id: itemId } });

        // Log history
        const userName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email;
        await tx.transferHistory.create({
          data: {
            id: crypto.randomUUID(),
            transferId: id,
            transferNumber: existingItem.Transfer.transferNumber,
            userId: currentUser.id,
            userName,
            userEmail: currentUser.email,
            action: 'ITEM_DELETED',
            details: `Removed item: ${(existingItem as any).WoodType.name} - ${existingItem.thickness} x ${existingItem.quantity} pcs (${existingItem.woodStatus})`
          }
        });
      });

      return { message: 'Item deleted successfully' };
    } catch (error) {
      console.error('Error deleting transfer item:', error);
      return reply.status(500).send({ error: 'Failed to delete transfer item' });
    }
  });

  // Cancel a transfer (PENDING, APPROVED, or IN_TRANSIT)
  fastify.post('/:id/cancel', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { reason } = request.body as { reason?: string };
      const userId = (request as any).user?.userId;
      const userRole = (request as any).user?.role;

      if (!['ADMIN', 'FACTORY_MANAGER', 'WAREHOUSE_MANAGER'].includes(userRole)) {
        return reply.status(403).send({ error: 'Access denied' });
      }

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
          TransferItem: {
            include: { WoodType: true }
          },
          Warehouse_Transfer_fromWarehouseIdToWarehouse: true,
          Warehouse_Transfer_toWarehouseIdToWarehouse: true
        }
      });

      if (!transfer) {
        return reply.status(404).send({ error: 'Transfer not found' });
      }

      if (transfer.status === 'COMPLETED') {
        return reply.status(400).send({ error: 'Cannot cancel a completed transfer. Contact admin for stock adjustments.' });
      }

      if (transfer.status === 'REJECTED') {
        return reply.status(400).send({ error: 'Transfer is already rejected' });
      }

      await prisma.$transaction(async (tx) => {
        // If IN_TRANSIT, reverse all stock movements via ledger helper.
        if (transfer.status === 'IN_TRANSIT') {
          const fromWarehouse = (transfer as any).Warehouse_Transfer_fromWarehouseIdToWarehouse;
          const toWarehouse   = (transfer as any).Warehouse_Transfer_toWarehouseIdToWarehouse;

          for (const item of transfer.TransferItem) {
            // Source: return pieces (IN_TRANSIT_OUT → woodStatus, balanced)
            if (fromWarehouse.stockControlEnabled) {
              await postTransferCancelSourceSide({
                warehouseId: transfer.fromWarehouseId,
                woodTypeId: item.woodTypeId,
                thickness: item.thickness,
                pieceCount: item.quantity,
                woodStatus: item.woodStatus as WoodStatus,
                transferId: transfer.id,
                transferNumber: transfer.transferNumber,
                user: { id: currentUser.id },
                details: reason ? `Cancel: ${reason}` : undefined,
              }, tx);
            }
            // Destination: drain IN_TRANSIT_IN (single-leg)
            if (toWarehouse.stockControlEnabled) {
              await postTransferCancelDestSide({
                warehouseId: transfer.toWarehouseId,
                woodTypeId: item.woodTypeId,
                thickness: item.thickness,
                pieceCount: item.quantity,
                woodStatus: item.woodStatus as WoodStatus,
                transferId: transfer.id,
                transferNumber: transfer.transferNumber,
                user: { id: currentUser.id },
                details: reason ? `Cancel: ${reason}` : undefined,
              }, tx);
            }
          }
        }

        // Update transfer status to CANCELLED
        await tx.transfer.update({
          where: { id },
          data: {
            status: 'REJECTED',
            notes: reason ? `${transfer.notes ? transfer.notes + '\n' : ''}CANCELLED: ${reason}` : transfer.notes
          }
        });

        // Log history
        const userName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email;
        await tx.transferHistory.create({
          data: {
            id: crypto.randomUUID(),
            transferId: id,
            transferNumber: transfer.transferNumber,
            userId: currentUser.id,
            userName,
            userEmail: currentUser.email,
            action: 'CANCELLED',
            details: reason || 'Transfer cancelled'
          }
        });
      });

      // Return updated transfer
      const updatedTransfer = await prisma.transfer.findUnique({
        where: { id },
        include: transferInclude
      });

      return mapTransfer(updatedTransfer);
    } catch (error) {
      console.error('Error cancelling transfer:', error);
      return reply.status(500).send({ error: 'Failed to cancel transfer' });
    }
  });

  // Preview what reversing a completed transfer would do (read-only)
  fastify.get('/:id/reverse-preview', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userRole = (request as any).user?.role;

      if (userRole !== 'ADMIN') {
        return reply.status(403).send({ error: 'Only admins can reverse completed transfers' });
      }

      const transfer = await prisma.transfer.findUnique({
        where: { id },
        include: {
          TransferItem: { include: { WoodType: true } },
          Warehouse_Transfer_fromWarehouseIdToWarehouse: true,
          Warehouse_Transfer_toWarehouseIdToWarehouse: true
        }
      });

      if (!transfer) {
        return reply.status(404).send({ error: 'Transfer not found' });
      }

      if (transfer.status !== 'COMPLETED') {
        return reply.status(400).send({
          error: transfer.status === 'REJECTED'
            ? 'Transfer has already been reversed or rejected'
            : `Transfer is ${transfer.status}, not COMPLETED. Use cancel instead.`
        });
      }

      const fromWarehouse = (transfer as any).Warehouse_Transfer_fromWarehouseIdToWarehouse;
      const toWarehouse = (transfer as any).Warehouse_Transfer_toWarehouseIdToWarehouse;
      const warnings: string[] = [];
      let canReverse = true;

      const itemsToReverse: Array<{
        woodType: string;
        thickness: string;
        woodStatus: string;
        quantity: number;
        destinationStock: { notDried: number; underDrying: number; dried: number; damaged: number } | null;
        sufficient: boolean;
      }> = [];

      // Check if destination warehouse has enough stock to reverse
      for (const item of transfer.TransferItem) {
        const statusField = getStatusFieldName(item.woodStatus);
        let destinationStock = null;
        let sufficient = true;

        if (toWarehouse.stockControlEnabled) {
          const stock = await prisma.stock.findUnique({
            where: {
              warehouseId_woodTypeId_thickness: {
                warehouseId: transfer.toWarehouseId,
                woodTypeId: item.woodTypeId,
                thickness: item.thickness
              }
            }
          });

          if (stock) {
            destinationStock = {
              notDried: stock.statusNotDried,
              underDrying: stock.statusUnderDrying,
              dried: stock.statusDried,
              damaged: stock.statusDamaged
            };

            // Check if the specific status field has enough stock
            const currentValue = (stock as any)[statusField] || 0;
            if (currentValue < item.quantity) {
              sufficient = false;
              canReverse = false;
              warnings.push(`${item.thickness} ${(item as any).WoodType?.name || ''}: destination has ${currentValue} ${item.woodStatus} but need ${item.quantity} to reverse`);
            }
          } else {
            sufficient = false;
            canReverse = false;
            warnings.push(`${item.thickness} ${(item as any).WoodType?.name || ''}: no stock record found at destination`);
          }
        }

        itemsToReverse.push({
          woodType: (item as any).WoodType?.name || item.woodTypeId,
          thickness: item.thickness,
          woodStatus: item.woodStatus,
          quantity: item.quantity,
          destinationStock,
          sufficient
        });
      }

      return {
        transfer: {
          id: transfer.id,
          transferNumber: transfer.transferNumber,
          status: transfer.status,
          fromWarehouse: fromWarehouse.name,
          toWarehouse: toWarehouse.name,
          completedAt: transfer.completedAt
        },
        itemsToReverse,
        canReverse,
        warnings
      };
    } catch (error) {
      console.error('Error generating reverse preview:', error);
      return reply.status(500).send({ error: 'Failed to generate reverse preview' });
    }
  });

  // Reverse a completed transfer (admin only - returns stock to source warehouse)
  fastify.post('/:id/reverse', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { reason } = request.body as { reason?: string };
      const userId = (request as any).user?.userId;
      const userRole = (request as any).user?.role;

      if (userRole !== 'ADMIN') {
        return reply.status(403).send({ error: 'Only admins can reverse completed transfers' });
      }

      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, firstName: true, lastName: true }
      });

      if (!currentUser) {
        return reply.status(401).send({ error: 'User not found' });
      }

      const result = await prisma.$transaction(async (tx) => {
        const transfer = await tx.transfer.findUnique({
          where: { id },
          include: {
            TransferItem: { include: { WoodType: true } },
            Warehouse_Transfer_fromWarehouseIdToWarehouse: true,
            Warehouse_Transfer_toWarehouseIdToWarehouse: true
          }
        });

        if (!transfer) {
          throw new Error('Transfer not found');
        }

        if (transfer.status !== 'COMPLETED') {
          throw new Error(transfer.status === 'REJECTED'
            ? 'Transfer has already been reversed or rejected'
            : `Transfer is ${transfer.status}, not COMPLETED`);
        }

        const fromWarehouse = (transfer as any).Warehouse_Transfer_fromWarehouseIdToWarehouse;
        const toWarehouse = (transfer as any).Warehouse_Transfer_toWarehouseIdToWarehouse;
        const reversals: Array<{ woodType: string; thickness: string; quantity: number; woodStatus: string }> = [];

        for (const item of transfer.TransferItem) {
          // Pre-flight check at destination (clearer error than CHECK violation)
          if (toWarehouse.stockControlEnabled) {
            const statusField = getStatusFieldName(item.woodStatus);
            const destStock = await tx.stock.findUnique({
              where: {
                warehouseId_woodTypeId_thickness: {
                  warehouseId: transfer.toWarehouseId,
                  woodTypeId: item.woodTypeId,
                  thickness: item.thickness
                }
              }
            });
            if (!destStock) {
              throw new Error(`No stock record at destination for ${item.thickness} - cannot reverse`);
            }
            const currentValue = (destStock as any)[statusField] || 0;
            if (currentValue < item.quantity) {
              throw new Error(`Insufficient stock at ${toWarehouse.name} for ${item.thickness}: has ${currentValue} ${item.woodStatus} but need ${item.quantity}. Stock may have been moved.`);
            }
          }

          const userName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email;
          // Remove pieces from destination
          if (toWarehouse.stockControlEnabled) {
            await postTransferReverseDestSide({
              warehouseId: transfer.toWarehouseId,
              woodTypeId: item.woodTypeId,
              thickness: item.thickness,
              pieceCount: item.quantity,
              woodStatus: item.woodStatus as WoodStatus,
              transferId: transfer.id,
              transferNumber: transfer.transferNumber,
              user: { id: currentUser.id, name: userName },
              details: reason
                ? `Reverse: ${reason} (removed from ${toWarehouse.name})`
                : `Transfer ${transfer.transferNumber} reversed (removed from ${toWarehouse.name})`,
            }, tx);
          }
          // Return pieces to source
          if (fromWarehouse.stockControlEnabled) {
            await postTransferReverseSourceSide({
              warehouseId: transfer.fromWarehouseId,
              woodTypeId: item.woodTypeId,
              thickness: item.thickness,
              pieceCount: item.quantity,
              woodStatus: item.woodStatus as WoodStatus,
              transferId: transfer.id,
              transferNumber: transfer.transferNumber,
              user: { id: currentUser.id, name: userName },
              details: reason
                ? `Reverse: ${reason} (returned to ${fromWarehouse.name})`
                : `Transfer ${transfer.transferNumber} reversed (returned to ${fromWarehouse.name})`,
            }, tx);
          }

          reversals.push({
            woodType: (item as any).WoodType?.name || item.woodTypeId,
            thickness: item.thickness,
            quantity: item.quantity,
            woodStatus: item.woodStatus
          });
        }

        // Update transfer status
        await tx.transfer.update({
          where: { id },
          data: {
            status: 'REJECTED',
            notes: `${transfer.notes ? transfer.notes + '\n' : ''}REVERSED: ${reason || 'Transfer reversed by admin'}`
          }
        });

        // Log history
        const userName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email;
        await tx.transferHistory.create({
          data: {
            id: crypto.randomUUID(),
            transferId: id,
            transferNumber: transfer.transferNumber,
            userId: currentUser.id,
            userName,
            userEmail: currentUser.email,
            action: 'REVERSED',
            details: reason
              ? `Transfer reversed: ${reason}. Stock returned to ${fromWarehouse.name}`
              : `Transfer reversed. Stock returned to ${fromWarehouse.name}`
          }
        });

        return {
          transferNumber: transfer.transferNumber,
          fromWarehouse: fromWarehouse.name,
          toWarehouse: toWarehouse.name,
          reversals
        };
      });

      console.log(`🔄 Transfer ${result.transferNumber} reversed by ${currentUser.email}`, result.reversals);

      return { success: true, ...result };
    } catch (error: any) {
      console.error('Error reversing transfer:', error);
      if (error.message?.includes('not found') || error.message?.includes('not COMPLETED')) {
        return reply.status(400).send({ error: error.message });
      }
      if (error.message?.includes('Insufficient stock')) {
        return reply.status(409).send({ error: error.message });
      }
      return reply.status(500).send({ error: 'Failed to reverse transfer' });
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
          id: crypto.randomUUID(),
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
