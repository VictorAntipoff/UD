import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function assetRoutes(fastify: FastifyInstance) {

  // ===== ASSET CATEGORY ROUTES =====

  // Get all asset categories
  fastify.get('/categories', async (request, reply) => {
    try {
      const categories = await prisma.assetCategory.findMany({
        include: {
          _count: {
            select: { assets: true }
          }
        },
        orderBy: { name: 'asc' }
      });
      return categories;
    } catch (error) {
      console.error('Error fetching asset categories:', error);
      return reply.status(500).send({ error: 'Failed to fetch asset categories' });
    }
  });

  // Create asset category
  fastify.post('/categories', async (request, reply) => {
    try {
      const { name, description } = request.body as any;

      const category = await prisma.assetCategory.create({
        data: { name, description }
      });

      return category;
    } catch (error) {
      console.error('Error creating asset category:', error);
      return reply.status(500).send({ error: 'Failed to create asset category' });
    }
  });

  // ===== ASSET ROUTES =====

  // Get all assets with filtering
  fastify.get('/', async (request, reply) => {
    try {
      const { status, categoryId, assignedToUserId } = request.query as any;

      const where: any = {};
      if (status) where.status = status;
      if (categoryId) where.categoryId = categoryId;
      if (assignedToUserId) where.assignedToUserId = assignedToUserId;

      const assets = await prisma.asset.findMany({
        where,
        include: {
          category: true,
          _count: {
            select: {
              maintenanceRecords: true,
              documents: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return assets;
    } catch (error) {
      console.error('Error fetching assets:', error);
      return reply.status(500).send({ error: 'Failed to fetch assets' });
    }
  });

  // Get single asset by ID
  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const asset = await prisma.asset.findUnique({
        where: { id },
        include: {
          category: true,
          maintenanceRecords: {
            orderBy: { scheduledDate: 'desc' }
          },
          documents: {
            orderBy: { uploadedAt: 'desc' }
          },
          assignmentHistory: {
            orderBy: { assignmentDate: 'desc' }
          },
          depreciationSchedule: {
            orderBy: { monthYear: 'desc' },
            take: 12 // Last 12 months
          }
        }
      });

      if (!asset) {
        return reply.status(404).send({ error: 'Asset not found' });
      }

      return asset;
    } catch (error) {
      console.error('Error fetching asset:', error);
      return reply.status(500).send({ error: 'Failed to fetch asset' });
    }
  });

  // Create new asset
  fastify.post('/', async (request, reply) => {
    try {
      const data = request.body as any;

      // Calculate depreciation if method is provided
      let depreciationPerMonth = null;
      let usefulLifeMonths = null;

      if (data.depreciationMethod === 'STRAIGHT_LINE' && data.usefulLifeYears && data.purchasePrice) {
        usefulLifeMonths = Math.round(data.usefulLifeYears * 12);
        const depreciableAmount = data.purchasePrice - (data.salvageValue || 0);
        depreciationPerMonth = depreciableAmount / usefulLifeMonths;
      }

      const asset = await prisma.asset.create({
        data: {
          ...data,
          usefulLifeMonths,
          depreciationPerMonth,
          currentBookValue: data.purchasePrice,
          accumulatedDepreciation: 0
        },
        include: {
          category: true
        }
      });

      // Generate depreciation schedule if applicable
      if (depreciationPerMonth && usefulLifeMonths) {
        await generateDepreciationSchedule(asset.id, data.purchasePrice, depreciationPerMonth, usefulLifeMonths, new Date(data.purchaseDate));
      }

      return asset;
    } catch (error) {
      console.error('Error creating asset:', error);
      return reply.status(500).send({ error: 'Failed to create asset' });
    }
  });

  // Update asset
  fastify.patch('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as any;

      // Recalculate depreciation if relevant fields changed
      if (data.usefulLifeYears || data.purchasePrice || data.salvageValue) {
        const existingAsset = await prisma.asset.findUnique({ where: { id } });
        if (existingAsset && existingAsset.depreciationMethod === 'STRAIGHT_LINE') {
          const usefulLifeYears = data.usefulLifeYears || existingAsset.usefulLifeYears;
          const purchasePrice = data.purchasePrice || existingAsset.purchasePrice;
          const salvageValue = data.salvageValue !== undefined ? data.salvageValue : existingAsset.salvageValue;

          if (usefulLifeYears && purchasePrice !== null) {
            const usefulLifeMonths = Math.round(usefulLifeYears * 12);
            const depreciableAmount = purchasePrice - (salvageValue || 0);
            const depreciationPerMonth = depreciableAmount / usefulLifeMonths;

            data.usefulLifeMonths = usefulLifeMonths;
            data.depreciationPerMonth = depreciationPerMonth;
          }
        }
      }

      const asset = await prisma.asset.update({
        where: { id },
        data,
        include: {
          category: true
        }
      });

      return asset;
    } catch (error) {
      console.error('Error updating asset:', error);
      return reply.status(500).send({ error: 'Failed to update asset' });
    }
  });

  // Delete asset
  fastify.delete('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      await prisma.asset.delete({
        where: { id }
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting asset:', error);
      return reply.status(500).send({ error: 'Failed to delete asset' });
    }
  });

  // ===== MAINTENANCE ROUTES =====

  // Get maintenance records for an asset
  fastify.get('/:id/maintenance', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const records = await prisma.assetMaintenance.findMany({
        where: { assetId: id },
        orderBy: { scheduledDate: 'desc' }
      });

      return records;
    } catch (error) {
      console.error('Error fetching maintenance records:', error);
      return reply.status(500).send({ error: 'Failed to fetch maintenance records' });
    }
  });

  // Create maintenance record
  fastify.post('/:id/maintenance', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as any;

      const maintenance = await prisma.assetMaintenance.create({
        data: {
          ...data,
          assetId: id
        }
      });

      return maintenance;
    } catch (error) {
      console.error('Error creating maintenance record:', error);
      return reply.status(500).send({ error: 'Failed to create maintenance record' });
    }
  });

  // Update maintenance record
  fastify.patch('/maintenance/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as any;

      const maintenance = await prisma.assetMaintenance.update({
        where: { id },
        data
      });

      return maintenance;
    } catch (error) {
      console.error('Error updating maintenance record:', error);
      return reply.status(500).send({ error: 'Failed to update maintenance record' });
    }
  });

  // ===== DOCUMENT ROUTES =====

  // Get documents for an asset
  fastify.get('/:id/documents', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const documents = await prisma.assetDocument.findMany({
        where: { assetId: id },
        orderBy: { uploadedAt: 'desc' }
      });

      return documents;
    } catch (error) {
      console.error('Error fetching documents:', error);
      return reply.status(500).send({ error: 'Failed to fetch documents' });
    }
  });

  // Create document record
  fastify.post('/:id/documents', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as any;

      const document = await prisma.assetDocument.create({
        data: {
          ...data,
          assetId: id
        }
      });

      return document;
    } catch (error) {
      console.error('Error creating document:', error);
      return reply.status(500).send({ error: 'Failed to create document' });
    }
  });

  // Delete document
  fastify.delete('/documents/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      await prisma.assetDocument.delete({
        where: { id }
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting document:', error);
      return reply.status(500).send({ error: 'Failed to delete document' });
    }
  });

  // ===== ASSIGNMENT ROUTES =====

  // Assign asset
  fastify.post('/:id/assign', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { assignedToUserId, assignedToTeam, assignedToProject, assignedBy, notes } = request.body as any;

      // Create assignment history record
      await prisma.assetAssignment.create({
        data: {
          assetId: id,
          assignedToUserId,
          assignedToTeam,
          assignedToProject,
          assignedBy,
          notes
        }
      });

      // Update asset
      const asset = await prisma.asset.update({
        where: { id },
        data: {
          assignedToUserId,
          assignedToTeam,
          assignedToProject,
          assignmentDate: new Date()
        },
        include: {
          category: true
        }
      });

      return asset;
    } catch (error) {
      console.error('Error assigning asset:', error);
      return reply.status(500).send({ error: 'Failed to assign asset' });
    }
  });

  // Unassign/Return asset
  fastify.post('/:id/return', async (request, reply) =>{
    try {
      const { id } = request.params as { id: string };

      // Find most recent assignment and mark as returned
      const latestAssignment = await prisma.assetAssignment.findFirst({
        where: { assetId: id, returnDate: null },
        orderBy: { assignmentDate: 'desc' }
      });

      if (latestAssignment) {
        await prisma.assetAssignment.update({
          where: { id: latestAssignment.id },
          data: { returnDate: new Date() }
        });
      }

      // Clear assignment from asset
      const asset = await prisma.asset.update({
        where: { id },
        data: {
          assignedToUserId: null,
          assignedToTeam: null,
          assignedToProject: null,
          assignmentDate: null
        },
        include: {
          category: true
        }
      });

      return asset;
    } catch (error) {
      console.error('Error returning asset:', error);
      return reply.status(500).send({ error: 'Failed to return asset' });
    }
  });

  // ===== STATISTICS/DASHBOARD =====

  // Get asset statistics
  fastify.get('/stats', async (request, reply) => {
    try {
      const [totalAssets, activeAssets, inMaintenance, brokenAssets, totalValue, categories] = await Promise.all([
        prisma.asset.count(),
        prisma.asset.count({ where: { status: 'ACTIVE' } }),
        prisma.asset.count({ where: { status: 'IN_MAINTENANCE' } }),
        prisma.asset.count({ where: { status: 'BROKEN' } }),
        prisma.asset.aggregate({
          _sum: { currentBookValue: true }
        }),
        prisma.assetCategory.count()
      ]);

      return {
        totalAssets,
        activeAssets,
        inMaintenance,
        brokenAssets,
        totalValue: totalValue._sum.currentBookValue || 0,
        categories
      };
    } catch (error) {
      console.error('Error fetching asset statistics:', error);
      return reply.status(500).send({ error: 'Failed to fetch statistics' });
    }
  });
}

// Helper function to generate depreciation schedule
async function generateDepreciationSchedule(
  assetId: string,
  purchasePrice: number,
  depreciationPerMonth: number,
  usefulLifeMonths: number,
  purchaseDate: Date
) {
  const schedules = [];
  let bookValue = purchasePrice;
  let accumulatedDepreciation = 0;

  const startDate = new Date(purchaseDate);

  for (let i = 1; i <= usefulLifeMonths; i++) {
    const currentDate = new Date(startDate);
    currentDate.setMonth(startDate.getMonth() + i);

    const openingBookValue = bookValue;
    accumulatedDepreciation += depreciationPerMonth;
    bookValue = purchasePrice - accumulatedDepreciation;

    // Ensure book value doesn't go below 0
    if (bookValue < 0) bookValue = 0;

    schedules.push({
      assetId,
      month: i,
      year: currentDate.getFullYear(),
      monthYear: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`,
      openingBookValue,
      depreciationAmount: depreciationPerMonth,
      accumulatedDepreciation,
      closingBookValue: bookValue
    });
  }

  // Batch insert depreciation schedule
  await prisma.depreciationSchedule.createMany({
    data: schedules,
    skipDuplicates: true
  });
}
