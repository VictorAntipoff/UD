import { prisma } from '../lib/prisma.js';
async function factoryRoutes(fastify) {
    // Get all calculations for a user
    fastify.get('/calculations', async (request, reply) => {
        try {
            const { user_id } = request.query;
            if (!user_id) {
                return reply.status(400).send({ error: 'user_id is required' });
            }
            const calculations = await prisma.woodCalculation.findMany({
                where: { userId: user_id },
                include: {
                    woodType: true
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
        }
        catch (error) {
            console.error('Error fetching calculations:', error);
            return reply.status(500).send({ error: 'Failed to fetch calculations' });
        }
    });
    // Create a new calculation
    fastify.post('/calculations', async (request, reply) => {
        try {
            const data = request.body;
            // Validate required fields
            if (!data.user_id || !data.wood_type_id || !data.thickness || !data.width || !data.length || !data.price_per_plank) {
                return reply.status(400).send({ error: 'Missing required fields' });
            }
            const calculation = await prisma.woodCalculation.create({
                data: {
                    userId: data.user_id,
                    woodTypeId: data.wood_type_id,
                    thickness: data.thickness,
                    width: data.width,
                    length: data.length,
                    pricePerPlank: data.price_per_plank,
                    volumeM3: data.volume_m3,
                    planksPerM3: data.planks_per_m3,
                    pricePerM3: data.price_per_m3,
                    notes: data.notes || ''
                },
                include: {
                    woodType: true
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
        }
        catch (error) {
            console.error('Error creating calculation:', error);
            return reply.status(500).send({ error: 'Failed to create calculation' });
        }
    });
    // Delete a calculation
    fastify.delete('/calculations/:id', async (request, reply) => {
        try {
            const { id } = request.params;
            await prisma.woodCalculation.delete({
                where: { id }
            });
            return { success: true };
        }
        catch (error) {
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
        }
        catch (error) {
            console.error('Error fetching wood types:', error);
            return reply.status(500).send({ error: 'Failed to fetch wood types' });
        }
    });
    // Get factory list
    fastify.get('/', async (request, reply) => {
        try {
            const factories = await prisma.factory.findMany({
                include: {
                    user: {
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
        }
        catch (error) {
            console.error('Error fetching factories:', error);
            return reply.status(500).send({ error: 'Failed to fetch factories' });
        }
    });
    // Create a new factory
    fastify.post('/', async (request, reply) => {
        try {
            const { name, userId } = request.body;
            if (!name || !userId) {
                return reply.status(400).send({ error: 'Name and userId are required' });
            }
            const factory = await prisma.factory.create({
                data: {
                    name,
                    userId
                },
                include: {
                    user: {
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
        }
        catch (error) {
            console.error('Error creating factory:', error);
            return reply.status(500).send({ error: 'Failed to create factory' });
        }
    });
}
export default factoryRoutes;
