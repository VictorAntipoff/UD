import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import multipart from '@fastify/multipart';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import { mkdir, stat, unlink } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define uploads directory
const UPLOADS_DIR = path.join(__dirname, '../../uploads/website');

// Ensure uploads directory exists
async function ensureUploadsDir() {
  try {
    await mkdir(UPLOADS_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating uploads directory:', error);
  }
}

async function websiteRoutes(fastify: FastifyInstance) {
  // Register multipart for file uploads
  await fastify.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
  });

  // Ensure uploads directory exists
  await ensureUploadsDir();

  // SECURITY: Protect all website management routes with authentication
  fastify.addHook('onRequest', authenticateToken);

  // ===== PAGE ROUTES =====

  // Get all pages
  fastify.get('/pages', async (request, reply) => {
    try {
      const pages = await prisma.websitePage.findMany({
        orderBy: { updatedAt: 'desc' },
      });

      reply.send(pages);
    } catch (error: any) {
      reply.status(500).send({ error: error.message });
    }
  });

  // Get page by ID
  fastify.get('/pages/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const page = await prisma.websitePage.findUnique({
        where: { id },
      });

      if (!page) {
        return reply.status(404).send({ error: 'Page not found' });
      }

      reply.send(page);
    } catch (error: any) {
      reply.status(500).send({ error: error.message });
    }
  });

  // Get page by slug
  fastify.get('/pages/slug/:slug', async (request, reply) => {
    try {
      const { slug } = request.params as { slug: string };

      const page = await prisma.websitePage.findUnique({
        where: { slug },
      });

      if (!page) {
        return reply.status(404).send({ error: 'Page not found' });
      }

      reply.send(page);
    } catch (error: any) {
      reply.status(500).send({ error: error.message });
    }
  });

  // Update page content
  fastify.put('/pages/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { content, status } = request.body as { content: any; status?: string };
      const userId = (request as any).user?.userId;

      const updatedPage = await prisma.websitePage.update({
        where: { id },
        data: {
          content,
          status: status || undefined,
          updatedBy: userId,
        },
      });

      reply.send(updatedPage);
    } catch (error: any) {
      reply.status(500).send({ error: error.message });
    }
  });

  // Create a new page
  fastify.post('/pages', async (request, reply) => {
    try {
      const { name, slug, content, status } = request.body as {
        name: string;
        slug: string;
        content: any;
        status?: string;
      };
      const userId = (request as any).user?.userId;

      const page = await prisma.websitePage.create({
        data: {
          name,
          slug,
          content,
          status: status || 'draft',
          createdBy: userId,
          updatedBy: userId,
        },
      });

      reply.status(201).send(page);
    } catch (error: any) {
      reply.status(500).send({ error: error.message });
    }
  });

  // ===== FOLDER ROUTES =====

  // Get folders and files in a specific folder (or root if no folderId)
  fastify.get('/folders', async (request, reply) => {
    try {
      const { parentId } = request.query as { parentId?: string };

      const folders = await prisma.websiteFolder.findMany({
        where: { parentId: parentId || null },
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { files: true, subfolders: true },
          },
        },
      });

      const files = await prisma.websiteFile.findMany({
        where: { folderId: parentId || null },
        orderBy: { uploadedAt: 'desc' },
      });

      reply.send({ folders, files });
    } catch (error: any) {
      reply.status(500).send({ error: error.message });
    }
  });

  // Get folder breadcrumb path
  fastify.get('/folders/:id/path', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const path = [];
      let currentFolder = await prisma.websiteFolder.findUnique({
        where: { id },
      });

      while (currentFolder) {
        path.unshift({ id: currentFolder.id, name: currentFolder.name });
        if (currentFolder.parentId) {
          currentFolder = await prisma.websiteFolder.findUnique({
            where: { id: currentFolder.parentId },
          });
        } else {
          currentFolder = null;
        }
      }

      reply.send(path);
    } catch (error: any) {
      reply.status(500).send({ error: error.message });
    }
  });

  // Create a new folder
  fastify.post('/folders', async (request, reply) => {
    try {
      const { name, parentId } = request.body as { name: string; parentId?: string };
      const userId = (request as any).user?.userId;

      const folder = await prisma.websiteFolder.create({
        data: {
          name,
          parentId: parentId || null,
          createdBy: userId,
        },
      });

      reply.status(201).send(folder);
    } catch (error: any) {
      reply.status(500).send({ error: error.message });
    }
  });

  // Rename a folder
  fastify.put('/folders/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { name } = request.body as { name: string };

      const folder = await prisma.websiteFolder.update({
        where: { id },
        data: { name },
      });

      reply.send(folder);
    } catch (error: any) {
      reply.status(500).send({ error: error.message });
    }
  });

  // Delete a folder (cascade deletes subfolders and files)
  fastify.delete('/folders/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      // Get all files in this folder and subfolders to delete from disk
      const files = await prisma.websiteFile.findMany({
        where: { folderId: id },
      });

      // Delete files from disk
      for (const file of files) {
        const filePath = path.join(UPLOADS_DIR, file.fileName);
        try {
          await unlink(filePath);
        } catch (error) {
          console.error(`Error deleting file ${file.fileName}:`, error);
        }
      }

      // Delete folder (cascade deletes files and subfolders)
      await prisma.websiteFolder.delete({
        where: { id },
      });

      reply.send({ message: 'Folder deleted successfully' });
    } catch (error: any) {
      reply.status(500).send({ error: error.message });
    }
  });

  // ===== FILE ROUTES =====

  // Get all files
  fastify.get('/files', async (request, reply) => {
    try {
      const files = await prisma.websiteFile.findMany({
        orderBy: { uploadedAt: 'desc' },
      });

      reply.send(files);
    } catch (error: any) {
      reply.status(500).send({ error: error.message });
    }
  });

  // Upload files
  fastify.post('/files/upload', async (request, reply) => {
    try {
      const userId = (request as any).user?.userId;
      const parts = request.parts();
      const uploadedFiles = [];
      let folderId: string | null = null;

      for await (const part of parts) {
        if (part.type === 'field' && part.fieldname === 'folderId') {
          folderId = part.value as string || null;
        } else if (part.type === 'file') {
          // Generate unique filename
          const ext = path.extname(part.filename);
          const uniqueName = `${crypto.randomBytes(16).toString('hex')}${ext}`;
          const filePath = path.join(UPLOADS_DIR, uniqueName);

          // Save file to disk
          await pipeline(part.file, createWriteStream(filePath));

          // Get file stats
          const stats = await stat(filePath);

          // Save file metadata to database
          const file = await prisma.websiteFile.create({
            data: {
              name: part.filename.replace(ext, ''), // Display name without extension
              originalName: part.filename,
              fileName: uniqueName,
              mimeType: part.mimetype,
              size: stats.size,
              path: `/uploads/website/${uniqueName}`,
              url: `/uploads/website/${uniqueName}`,
              folderId: folderId,
              uploadedBy: userId,
            },
          });

          uploadedFiles.push(file);
        }
      }

      reply.status(201).send(uploadedFiles);
    } catch (error: any) {
      reply.status(500).send({ error: error.message });
    }
  });

  // Delete file
  fastify.delete('/files/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      // Get file info
      const file = await prisma.websiteFile.findUnique({
        where: { id },
      });

      if (!file) {
        return reply.status(404).send({ error: 'File not found' });
      }

      // Delete file from disk
      const filePath = path.join(UPLOADS_DIR, file.fileName);
      try {
        await unlink(filePath);
      } catch (error) {
        console.error('Error deleting file from disk:', error);
        // Continue even if file deletion fails
      }

      // Delete file record from database
      await prisma.websiteFile.delete({
        where: { id },
      });

      reply.send({ message: 'File deleted successfully' });
    } catch (error: any) {
      reply.status(500).send({ error: error.message });
    }
  });
}

export default websiteRoutes;
