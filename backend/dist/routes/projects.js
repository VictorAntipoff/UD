import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function projectRoutes(fastify) {
    fastify.get('/', async (request, reply) => {
        try {
            const projects = await prisma.project.findMany();
            return { projects };
        }
        catch (error) {
            console.error('Error fetching projects:', error);
            return reply.status(500).send({ error: 'Failed to fetch projects' });
        }
    });
    fastify.post('/', async (request, reply) => {
        try {
            const { name, description, isPublic = false } = request.body;
            const userId = request.user?.id;
            if (!name) {
                return reply.status(400).send({ error: 'Name is required' });
            }
            const project = await prisma.project.create({
                data: {
                    name,
                    description,
                    isPublic,
                    ownerId: userId
                }
            });
            return { project };
        }
        catch (error) {
            console.error('Error creating project:', error);
            return reply.status(500).send({ error: 'Failed to create project' });
        }
    });
}
export default projectRoutes;
