import { PrismaClient, MovementType, ReferenceType, WoodStatus } from '@prisma/client';

const prisma = new PrismaClient();

interface CreateMovementParams {
  warehouseId: string;
  woodTypeId: string;
  thickness: string;
  movementType: MovementType;
  quantityChange: number;
  fromStatus?: WoodStatus;
  toStatus?: WoodStatus;
  referenceType: ReferenceType;
  referenceId: string;
  referenceNumber?: string;
  userId?: string;
  userName?: string;
  details?: string;
}

/**
 * Create a stock movement record
 * @param params Movement parameters
 * @param tx Optional Prisma transaction client
 */
export async function createStockMovement(params: CreateMovementParams, tx?: any) {
  const client = tx || prisma;

  return await client.stock_movements.create({
    data: {
      id: crypto.randomUUID(),
      warehouseId: params.warehouseId,
      woodTypeId: params.woodTypeId,
      thickness: params.thickness,
      movementType: params.movementType,
      quantityChange: params.quantityChange,
      fromStatus: params.fromStatus,
      toStatus: params.toStatus,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      referenceNumber: params.referenceNumber,
      userId: params.userId,
      userName: params.userName,
      details: params.details
    }
  });
}

interface GetMovementsFilters {
  warehouseId?: string;
  woodTypeId?: string;
  thickness?: string;
  movementType?: MovementType;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Get stock movements with filters
 */
export async function getStockMovements(filters: GetMovementsFilters) {
  const where: any = {};

  if (filters.warehouseId) {
    where.warehouseId = filters.warehouseId;
  }

  if (filters.woodTypeId) {
    where.woodTypeId = filters.woodTypeId;
  }

  if (filters.thickness) {
    where.thickness = filters.thickness;
  }

  if (filters.movementType) {
    where.movementType = filters.movementType;
  }

  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      where.createdAt.gte = filters.startDate;
    }
    if (filters.endDate) {
      where.createdAt.lte = filters.endDate;
    }
  }

  return await prisma.stock_movements.findMany({
    where,
    include: {
      Warehouse: {
        select: {
          id: true,
          name: true,
          code: true
        }
      },
      WoodType: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
}
