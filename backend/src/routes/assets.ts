import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';
import { uploadToCloudinary } from '../lib/cloudinary.js';

const prisma = new PrismaClient();

export default async function assetRoutes(fastify: FastifyInstance) {
  // Protect all asset routes with authentication
  fastify.addHook('onRequest', authenticateToken);

  // ===== ASSET CATEGORY ROUTES =====

  // Get all asset categories (including subcategories)
  fastify.get('/categories', async (request, reply) => {
    try {
      const categories = await prisma.assetCategory.findMany({
        include: {
          _count: {
            select: { assets: true, subcategories: true }
          },
          parent: {
            select: { id: true, name: true, code: true }
          },
          subcategories: {
            select: { id: true, name: true, code: true }
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

  // Get category tree structure (root categories with subcategories)
  fastify.get('/categories/tree', async (request, reply) => {
    try {
      const rootCategories = await prisma.assetCategory.findMany({
        where: { parentId: null },
        include: {
          subcategories: {
            include: {
              _count: {
                select: { assets: true }
              }
            },
            orderBy: { name: 'asc' }
          },
          _count: {
            select: { assets: true }
          }
        },
        orderBy: { name: 'asc' }
      });
      return rootCategories;
    } catch (error) {
      console.error('Error fetching category tree:', error);
      return reply.status(500).send({ error: 'Failed to fetch category tree' });
    }
  });

  // Create asset category (or subcategory if parentId provided)
  fastify.post('/categories', async (request, reply) => {
    try {
      const { name, code, description, parentId } = request.body as any;

      const category = await prisma.assetCategory.create({
        data: { name, code, description, parentId: parentId || null },
        include: {
          parent: {
            select: { id: true, name: true, code: true }
          }
        }
      });

      return category;
    } catch (error) {
      console.error('Error creating asset category:', error);
      return reply.status(500).send({ error: 'Failed to create asset category' });
    }
  });

  // Update asset category
  fastify.patch('/categories/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { name, code, description, parentId } = request.body as any;

      const category = await prisma.assetCategory.update({
        where: { id },
        data: { name, code, description, parentId: parentId !== undefined ? parentId : undefined },
        include: {
          parent: {
            select: { id: true, name: true, code: true }
          }
        }
      });

      return category;
    } catch (error) {
      console.error('Error updating asset category:', error);
      return reply.status(500).send({ error: 'Failed to update asset category' });
    }
  });

  // Delete asset category
  fastify.delete('/categories/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      // Check if category has assets
      const assetsCount = await prisma.asset.count({
        where: { categoryId: id }
      });

      if (assetsCount > 0) {
        return reply.status(400).send({
          error: `Cannot delete category with ${assetsCount} existing asset(s)`
        });
      }

      // Check if category has subcategories
      const subcategoriesCount = await prisma.assetCategory.count({
        where: { parentId: id }
      });

      if (subcategoriesCount > 0) {
        return reply.status(400).send({
          error: `Cannot delete category with ${subcategoriesCount} subcategory(ies). Delete subcategories first.`
        });
      }

      await prisma.assetCategory.delete({
        where: { id }
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting asset category:', error);
      return reply.status(500).send({ error: 'Failed to delete asset category' });
    }
  });

  // ===== IMAGE UPLOAD ROUTES =====

  // Upload asset image to Cloudinary (file upload)
  fastify.post('/upload-image', async (request, reply) => {
    try {
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' });
      }

      // Get category from fields
      const categoryField = data.fields.categoryName;
      const categoryName = (categoryField && typeof categoryField === 'object' && 'value' in categoryField)
        ? String(categoryField.value)
        : 'Uncategorized';

      // Create organized folder structure in Cloudinary: udesign/asset-pictures/CategoryName/
      const categoryFolder = categoryName.replace(/[^a-zA-Z0-9]/g, '-');
      const cloudinaryFolder = `udesign/asset-pictures/${categoryFolder}`;

      // Generate unique public_id
      const timestamp = Date.now();
      const originalName = data.filename.replace(/\.[^/.]+$/, ''); // Remove extension
      const publicId = `${timestamp}-${originalName.replace(/[^a-zA-Z0-9-]/g, '_')}`;

      // Upload to Cloudinary
      const result = await uploadToCloudinary(data.file, {
        folder: cloudinaryFolder,
        public_id: publicId,
        resource_type: 'image'
      });

      return {
        success: true,
        imageUrl: result.secure_url,
        publicId: result.public_id,
        url: result.url
      };
    } catch (error) {
      console.error('Error uploading image to Cloudinary:', error);
      return reply.status(500).send({ error: 'Failed to upload image' });
    }
  });

  // Upload asset image from URL to Cloudinary (from product search)
  fastify.post('/upload-image-url', async (request, reply) => {
    try {
      const { imageUrl, categoryName } = request.body as { imageUrl: string; categoryName?: string };

      if (!imageUrl) {
        return reply.status(400).send({ error: 'Image URL is required' });
      }

      const categoryFolder = (categoryName || 'Uncategorized').replace(/[^a-zA-Z0-9]/g, '-');
      const cloudinaryFolder = `udesign/asset-pictures/${categoryFolder}`;

      // Generate unique public_id
      const timestamp = Date.now();
      const publicId = `${timestamp}-product-image`;

      // Download and upload to Cloudinary
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch image from URL');
      }

      const buffer = Buffer.from(await response.arrayBuffer());

      const result = await uploadToCloudinary(buffer, {
        folder: cloudinaryFolder,
        public_id: publicId,
        resource_type: 'image'
      });

      return {
        success: true,
        imageUrl: result.secure_url,
        publicId: result.public_id,
        url: result.url
      };
    } catch (error) {
      console.error('Error uploading image from URL to Cloudinary:', error);
      return reply.status(500).send({ error: 'Failed to upload image from URL' });
    }
  });

  // Download and organize asset files (image and PDFs) to AssetTag folder
  fastify.post('/download-asset-files', async (request, reply) => {
    try {
      const { assetTag, imageUrl, pdfUrl, pdfDocuments } = request.body as {
        assetTag: string;
        imageUrl?: string;
        pdfUrl?: string;
        pdfDocuments?: Array<{url: string; title: string}>;
      };

      if (!assetTag) {
        return reply.status(400).send({ error: 'Asset tag is required' });
      }

      // Find the asset by assetTag
      const asset = await prisma.asset.findUnique({
        where: { assetTag }
      });

      if (!asset) {
        return reply.status(404).send({ error: 'Asset not found' });
      }

      const results: any = {};

      // Create folder structure based on product (brand + model) for shared files
      // If multiple assets have same brand+model, they'll share the same folder
      const productIdentifier = asset.brand && asset.modelNumber
        ? `${asset.brand.replace(/[^a-zA-Z0-9]/g, '_')}_${asset.modelNumber.replace(/[^a-zA-Z0-9]/g, '_')}`
        : assetTag; // Fallback to assetTag if no brand/model

      const productFolder = `udesign/assets/products/${productIdentifier}`;

      console.log(`Using shared product folder: ${productFolder} (Brand: ${asset.brand}, Model: ${asset.modelNumber})`);

      // Download and upload image if provided
      if (imageUrl) {
        try {
          const imageResponse = await fetch(imageUrl);
          if (imageResponse.ok) {
            const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

            const imageResult = await uploadToCloudinary(imageBuffer, {
              folder: productFolder,
              public_id: `image`,
              resource_type: 'image',
              overwrite: true // Overwrite existing image in shared folder
            });

            results.imageUrl = imageResult.secure_url;
          }
        } catch (err) {
          console.error('Error downloading image:', err);
          results.imageError = 'Failed to download image';
        }
      }

      // Download and upload PDF if provided (backward compatibility)
      if (pdfUrl) {
        try {
          const pdfResponse = await fetch(pdfUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });

          if (pdfResponse.ok) {
            const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());

            const pdfResult = await uploadToCloudinary(pdfBuffer, {
              folder: productFolder,
              public_id: `manual`,
              resource_type: 'raw',
              overwrite: true // Overwrite existing manual in shared folder
            });

            results.pdfUrl = pdfResult.secure_url;
          }
        } catch (err) {
          console.error('Error downloading PDF:', err);
          results.pdfError = 'Failed to download PDF';
        }
      }

      // Download and create AssetDocument records for all PDF documents
      if (pdfDocuments && pdfDocuments.length > 0) {
        results.documents = [];
        results.documentsErrors = [];

        // Check if other assets with same brand+model already have documents
        const existingDocs = await prisma.assetDocument.findMany({
          where: {
            asset: {
              brand: asset.brand,
              modelNumber: asset.modelNumber
            }
          },
          orderBy: { uploadedAt: 'asc' }, // Get oldest first (original uploads)
          take: 10 // Limit to prevent excessive queries
        });

        for (const pdfDoc of pdfDocuments) {
          try {
            // Create a consistent public_id based on title (sanitized)
            const sanitizedTitle = pdfDoc.title
              .toLowerCase()
              .replace(/[^a-z0-9]/g, '_')
              .replace(/_+/g, '_')
              .substring(0, 50); // Limit length

            // Check if we already have this document for the product
            const existingDoc = existingDocs.find(doc =>
              doc.title.toLowerCase() === pdfDoc.title.toLowerCase() ||
              doc.fileUrl.includes(sanitizedTitle)
            );

            let pdfResult;
            let pdfBuffer;

            if (existingDoc && existingDoc.fileUrl) {
              // Reuse existing file URL from another asset with same product
              console.log(`Reusing existing document: ${pdfDoc.title} from ${existingDoc.fileUrl}`);
              pdfResult = { secure_url: existingDoc.fileUrl };
              pdfBuffer = Buffer.from([]); // Empty buffer for reused file
            } else {
              // Download and upload new file
              const pdfResponse = await fetch(pdfDoc.url, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
              });

              if (pdfResponse.ok) {
                pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());

                pdfResult = await uploadToCloudinary(pdfBuffer, {
                  folder: productFolder,
                  public_id: sanitizedTitle,
                  resource_type: 'raw',
                  overwrite: true // Overwrite if somehow exists
                });

                console.log(`Downloaded new document: ${pdfDoc.title} to ${pdfResult.secure_url}`);
              } else {
                throw new Error(`Failed to fetch PDF: ${pdfResponse.statusText}`);
              }
            }

            if (pdfResult) {
              const fileName = pdfDoc.url.split('/').pop() || `${sanitizedTitle}.pdf`;

              // Create AssetDocument record for this specific asset
              const assetDocument = await prisma.assetDocument.create({
                data: {
                  assetId: asset.id,
                  documentType: 'MANUAL', // Can be improved to detect type from title
                  title: pdfDoc.title,
                  fileUrl: pdfResult.secure_url,
                  fileName: fileName,
                  fileSize: pdfBuffer.length || existingDoc?.fileSize || 0,
                  mimeType: 'application/pdf'
                }
              });

              results.documents.push(assetDocument);
            }
          } catch (err) {
            console.error(`Error downloading PDF ${pdfDoc.title}:`, err);
            results.documentsErrors.push({
              title: pdfDoc.title,
              error: 'Failed to download'
            });
          }
        }
      }

      return {
        success: true,
        ...results
      };
    } catch (error) {
      console.error('Error downloading asset files:', error);
      return reply.status(500).send({ error: 'Failed to download asset files' });
    }
  });

  // ===== ASSET ROUTES =====

  // Get next available asset tag
  fastify.get('/next-tag', async (request, reply) => {
    try {
      const latestAsset = await prisma.asset.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { assetTag: true }
      });

      let nextNumber = 1;
      if (latestAsset && latestAsset.assetTag) {
        const match = latestAsset.assetTag.match(/UD-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }

      return { assetTag: `UD-${String(nextNumber).padStart(4, '0')}` };
    } catch (error) {
      console.error('Error generating next asset tag:', error);
      return reply.status(500).send({ error: 'Failed to generate asset tag' });
    }
  });

  // Get unallocated asset tags (up to 100 tags ahead)
  fastify.get('/unallocated-tags', async (request, reply) => {
    try {
      // Get all allocated tags
      const allocatedAssets = await prisma.asset.findMany({
        select: { assetTag: true }
      });

      const allocatedTags = new Set(allocatedAssets.map(a => a.assetTag));

      // Find the highest tag number
      let maxNumber = 0;
      allocatedTags.forEach(tag => {
        const match = tag.match(/UD-(\d+)/);
        if (match) {
          maxNumber = Math.max(maxNumber, parseInt(match[1]));
        }
      });

      // Generate list of unallocated tags (show up to 100 tags ahead)
      const unallocatedTags: string[] = [];
      const limit = Math.max(maxNumber + 50, 100); // Show at least 100 tags

      for (let i = 1; i <= limit; i++) {
        const tag = `UD-${String(i).padStart(4, '0')}`;
        if (!allocatedTags.has(tag)) {
          unallocatedTags.push(tag);
        }
      }

      return { tags: unallocatedTags };
    } catch (error) {
      console.error('Error fetching unallocated tags:', error);
      return reply.status(500).send({ error: 'Failed to fetch unallocated tags' });
    }
  });

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
          location: true,
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

      // Try to find by assetTag first, then by UUID
      let asset = await prisma.asset.findUnique({
        where: { assetTag: id },
        include: {
          category: true,
          location: true,
          supplierRelation: true,
          maintenanceRecords: {
            orderBy: { scheduledDate: 'desc' }
          },
          documents: {
            orderBy: { uploadedAt: 'desc' }
          },
          assignmentHistory: {
            orderBy: { assignmentDate: 'desc' }
          },
          transfers: {
            include: {
              fromLocation: true,
              toLocation: true
            },
            orderBy: { transferDate: 'desc' }
          }
        }
      });

      // If not found by assetTag, try by UUID
      if (!asset) {
        asset = await prisma.asset.findUnique({
          where: { id },
          include: {
            category: true,
            location: true,
            supplierRelation: true,
            maintenanceRecords: {
              orderBy: { scheduledDate: 'desc' }
            },
            documents: {
              orderBy: { uploadedAt: 'desc' }
            },
            assignmentHistory: {
              orderBy: { assignmentDate: 'desc' }
            },
            transfers: {
              include: {
                fromLocation: true,
                toLocation: true
              },
              orderBy: { transferDate: 'desc' }
            }
          }
        });
      }

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

      // Clean up empty string values for foreign key fields to prevent constraint violations
      const foreignKeyFields = ['locationId', 'supplierId', 'categoryId', 'assignedToId'];
      foreignKeyFields.forEach(field => {
        if (data[field] === '' || data[field] === null || data[field] === undefined) {
          delete data[field];
        }
      });

      // Auto-generate asset tag if not provided
      if (!data.assetTag) {
        // Get the latest asset to determine next number
        const latestAsset = await prisma.asset.findFirst({
          orderBy: { createdAt: 'desc' },
          select: { assetTag: true }
        });

        let nextNumber = 1;
        if (latestAsset && latestAsset.assetTag) {
          // Extract number from UD-0000 format
          const match = latestAsset.assetTag.match(/UD-(\d+)/);
          if (match) {
            nextNumber = parseInt(match[1]) + 1;
          }
        }

        // Format as UD-0000
        data.assetTag = `UD-${String(nextNumber).padStart(4, '0')}`;
      }

      // Convert date strings to ISO DateTime format
      if (data.purchaseDate && typeof data.purchaseDate === 'string') {
        data.purchaseDate = new Date(data.purchaseDate).toISOString();
      }
      if (data.warrantyStartDate && typeof data.warrantyStartDate === 'string') {
        data.warrantyStartDate = new Date(data.warrantyStartDate).toISOString();
      }
      if (data.warrantyEndDate && typeof data.warrantyEndDate === 'string') {
        data.warrantyEndDate = new Date(data.warrantyEndDate).toISOString();
      }
      if (data.assignmentDate && typeof data.assignmentDate === 'string') {
        data.assignmentDate = new Date(data.assignmentDate).toISOString();
      }
      if (data.disposalDate && typeof data.disposalDate === 'string') {
        data.disposalDate = new Date(data.disposalDate).toISOString();
      }

      const asset = await prisma.asset.create({
        data,
        include: {
          category: true
        }
      });

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

      // Clean up empty string values for foreign key fields to prevent constraint violations
      const foreignKeyFields = ['locationId', 'supplierId', 'categoryId', 'assignedToId'];
      foreignKeyFields.forEach(field => {
        if (data[field] === '' || data[field] === null || data[field] === undefined) {
          delete data[field];
        }
      });

      // Find asset by assetTag first, then by UUID
      let asset = await prisma.asset.findUnique({
        where: { assetTag: id }
      });

      if (!asset) {
        asset = await prisma.asset.findUnique({
          where: { id }
        });
      }

      if (!asset) {
        return reply.status(404).send({ error: 'Asset not found' });
      }

      // Convert date strings to ISO DateTime format
      if (data.purchaseDate && typeof data.purchaseDate === 'string') {
        data.purchaseDate = new Date(data.purchaseDate).toISOString();
      }
      if (data.warrantyStartDate && typeof data.warrantyStartDate === 'string') {
        data.warrantyStartDate = new Date(data.warrantyStartDate).toISOString();
      }
      if (data.warrantyEndDate && typeof data.warrantyEndDate === 'string') {
        data.warrantyEndDate = new Date(data.warrantyEndDate).toISOString();
      }
      if (data.assignmentDate && typeof data.assignmentDate === 'string') {
        data.assignmentDate = new Date(data.assignmentDate).toISOString();
      }
      if (data.disposalDate && typeof data.disposalDate === 'string') {
        data.disposalDate = new Date(data.disposalDate).toISOString();
      }

      const updatedAsset = await prisma.asset.update({
        where: { id: asset.id },
        data,
        include: {
          category: true
        }
      });

      return updatedAsset;
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

  // Upload document with file
  fastify.post('/:id/upload-document', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      // Get the uploaded file
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' });
      }

      const fileBuffer = await data.toBuffer();
      const documentType = data.fields.documentType?.value as string || 'OTHER';
      const title = data.fields.title?.value as string;

      if (!title) {
        return reply.status(400).send({ error: 'Document title is required' });
      }

      // Find asset to get brand and model
      const asset = await prisma.asset.findUnique({
        where: { assetTag: id },
        select: { id: true, assetTag: true, brand: true, modelNumber: true }
      });

      if (!asset) {
        // Try by UUID
        const assetById = await prisma.asset.findUnique({
          where: { id },
          select: { id: true, assetTag: true, brand: true, modelNumber: true }
        });

        if (!assetById) {
          return reply.status(404).send({ error: 'Asset not found' });
        }

        // Use assetById for the rest
        Object.assign(asset, assetById);
      }

      // Create folder based on product (brand + model) for shared files
      const productIdentifier = asset.brand && asset.modelNumber
        ? `${asset.brand.replace(/[^a-zA-Z0-9]/g, '_')}_${asset.modelNumber.replace(/[^a-zA-Z0-9]/g, '_')}`
        : asset.assetTag;

      const productFolder = `udesign/assets/products/${productIdentifier}`;

      console.log(`Uploading document to: ${productFolder}`);

      // Upload to Cloudinary
      const uploadResult = await uploadToCloudinary(fileBuffer, {
        folder: productFolder,
        public_id: `${title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`,
        resource_type: 'raw'
      });

      // Create document record
      const document = await prisma.assetDocument.create({
        data: {
          assetId: asset.id,
          documentType: documentType as any,
          title: title,
          fileUrl: uploadResult.secure_url,
          fileName: data.filename,
          fileSize: fileBuffer.length,
          mimeType: data.mimetype
        }
      });

      return {
        success: true,
        document
      };
    } catch (error) {
      console.error('Error uploading document:', error);
      return reply.status(500).send({ error: 'Failed to upload document' });
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

  // ===== PRODUCT SEARCH =====

  // Search for products online using Google Custom Search API
  fastify.post('/search-product', async (request, reply) => {
    try {
      const { query, brand } = request.body as { query: string; brand?: string };

      if (!query) {
        return reply.status(400).send({ error: 'Search query is required' });
      }

      const apiKey = process.env.GOOGLE_API_KEY;
      const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

      // If API keys are not configured, return mock data
      if (!apiKey || !searchEngineId || apiKey === 'YOUR_GOOGLE_API_KEY_HERE') {
        console.log('Google API keys not configured, returning mock data');
        const mockResults = [
          {
            title: query,
            link: `https://example.com/products/${query.toLowerCase().replace(/ /g, '-')}`,
            snippet: `High-quality ${query} with professional features and warranty. Configure Google API keys in .env to get real results.`,
            image: `https://via.placeholder.com/300x300.png?text=${encodeURIComponent(query)}`,
            price: 'Contact for price',
            source: 'Example Store'
          }
        ];
        return { results: mockResults };
      }

      let allResults: any[] = [];

      // If brand is provided, search official website first
      if (brand && brand.trim()) {
        const brandDomain = brand.toLowerCase().replace(/\s+/g, '');
        const officialSearchUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&searchType=image&num=5&siteSearch=${brandDomain}.com&siteSearchFilter=i`;

        try {
          const officialResponse = await fetch(officialSearchUrl);
          if (officialResponse.ok) {
            const officialData = await officialResponse.json();

            // Transform official site results
            const officialResults = (officialData.items || []).map((item: any) => {
              let source = 'Unknown';
              try {
                const urlString = item.displayLink || item.link || item.image?.contextLink;
                if (urlString) {
                  const fullUrl = urlString.startsWith('http') ? urlString : `https://${urlString}`;
                  source = new URL(fullUrl).hostname;
                }
              } catch (err) {
                console.error('Error parsing source URL:', err);
              }

              return {
                title: item.title || query,
                link: item.image?.contextLink || item.link || '#', // Product page URL
                snippet: item.snippet || '',
                image: item.link || item.image?.thumbnailLink || '', // Image URL
                price: item.pagemap?.offer?.[0]?.price || 'Price not available',
                source,
                isOfficialSite: true
              };
            });

            allResults = officialResults;
          }
        } catch (err) {
          console.error('Error fetching from official site:', err);
        }
      }

      // Get general search results
      const generalSearchUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&searchType=image&num=8`;

      const generalResponse = await fetch(generalSearchUrl);

      if (!generalResponse.ok) {
        throw new Error(`Google API error: ${generalResponse.statusText}`);
      }

      const generalData = await generalResponse.json();

      // Transform general results
      const generalResults = (generalData.items || []).map((item: any) => {
        let source = 'Unknown';
        let isOfficialSite = false;

        try {
          const urlString = item.displayLink || item.link || item.image?.contextLink;
          if (urlString) {
            const fullUrl = urlString.startsWith('http') ? urlString : `https://${urlString}`;
            const hostname = new URL(fullUrl).hostname;
            source = hostname;

            // Check if this is the official brand website
            if (brand && brand.trim()) {
              const brandDomain = brand.toLowerCase().replace(/\s+/g, '');
              isOfficialSite = hostname.toLowerCase().includes(brandDomain);
            }
          }
        } catch (err) {
          console.error('Error parsing source URL:', err);
        }

        return {
          title: item.title || query,
          link: item.image?.contextLink || item.link || '#', // Product page URL
          snippet: item.snippet || '',
          image: item.link || item.image?.thumbnailLink || '', // Image URL
          price: item.pagemap?.offer?.[0]?.price || 'Price not available',
          source,
          isOfficialSite
        };
      });

      // Merge results: official site results first, then general results (excluding duplicates)
      const officialLinks = new Set(allResults.map(r => r.link));
      const uniqueGeneralResults = generalResults.filter((r: any) => !officialLinks.has(r.link));

      allResults = [...allResults, ...uniqueGeneralResults];

      // Limit to 10 total results
      return { results: allResults.slice(0, 10) };
    } catch (error) {
      console.error('Error searching products:', error);
      return reply.status(500).send({ error: 'Failed to search products' });
    }
  });

  // Scrape product data from URL
  fastify.post('/scrape-product-url', async (request, reply) => {
    try {
      const { url } = request.body as { url: string };

      if (!url) {
        return reply.status(400).send({ error: 'URL is required' });
      }

      // Validate URL
      let validUrl: URL;
      try {
        validUrl = new URL(url);
      } catch (err) {
        return reply.status(400).send({ error: 'Invalid URL format' });
      }

      // Fetch the page
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.statusText}`);
      }

      const html = await response.text();

      // Helper function to strip HTML tags and decode entities
      const cleanHtmlText = (text: string): string => {
        let cleaned = text;

        // Strip HTML tags
        cleaned = cleaned.replace(/<[^>]*>/g, ' ');

        // Replace common named entities
        cleaned = cleaned.replace(/&amp;/g, '&');
        cleaned = cleaned.replace(/&lt;/g, '<');
        cleaned = cleaned.replace(/&gt;/g, '>');
        cleaned = cleaned.replace(/&quot;/g, '"');
        cleaned = cleaned.replace(/&#039;/g, "'");
        cleaned = cleaned.replace(/&nbsp;/g, ' ');

        // Replace numeric entities (e.g., &#8211;)
        cleaned = cleaned.replace(/&#(\d+);/g, (match, dec) => {
          return String.fromCharCode(parseInt(dec));
        });

        // Replace hex entities (e.g., &#x2013;)
        cleaned = cleaned.replace(/&#x([0-9a-f]+);/gi, (match, hex) => {
          return String.fromCharCode(parseInt(hex, 16));
        });

        // Clean up multiple spaces
        cleaned = cleaned.replace(/\s+/g, ' ').trim();

        return cleaned;
      };

      // Extract basic information from HTML
      let title = '';
      let snippet = '';
      let imageUrl = '';
      let price = '';
      let pdfUrl = '';

      // Extract title from <title> tag or og:title
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i) ||
                        html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
      if (titleMatch) {
        title = cleanHtmlText(titleMatch[1].trim());
      }

      // Extract description from meta description or og:description
      const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                       html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
      if (descMatch) {
        snippet = cleanHtmlText(descMatch[1].trim());
      }

      // Extract image from og:image or first large image
      const imgMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
      if (imgMatch) {
        imageUrl = imgMatch[1].trim();
        // Make sure image URL is absolute
        if (imageUrl.startsWith('/')) {
          imageUrl = `${validUrl.origin}${imageUrl}`;
        } else if (!imageUrl.startsWith('http')) {
          imageUrl = `${validUrl.origin}/${imageUrl}`;
        }
      }

      // Try to extract price (common patterns)
      const pricePatterns = [
        /["']price["']\s*:\s*["']?([0-9,]+\.?[0-9]*)/i,
        /<meta[^>]*property=["']product:price:amount["'][^>]*content=["']([^"']+)["']/i,
        /\$\s*([0-9,]+\.?[0-9]*)/,
        /USD\s*([0-9,]+\.?[0-9]*)/i,
        /Price[:\s]*\$?\s*([0-9,]+\.?[0-9]*)/i
      ];

      for (const pattern of pricePatterns) {
        const match = html.match(pattern);
        if (match) {
          price = match[1].replace(/,/g, '');
          if (!price.startsWith('$')) {
            price = `$${price}`;
          }
          break;
        }
      }

      // Extract PDF links (manual, datasheet, spec sheet, etc.) with titles
      const pdfPatterns = [
        /<a[^>]*href=["']([^"']*\.pdf)["'][^>]*>([^<]*)<\/a>/gi,
        /<a[^>]*href=["']([^"']*manual[^"']*)["'][^>]*>([^<]*)<\/a>/gi,
        /<a[^>]*href=["']([^"']*datasheet[^"']*)["'][^>]*>([^<]*)<\/a>/gi,
        /<a[^>]*href=["']([^"']*spec[^"']*)["'][^>]*>([^<]*)<\/a>/gi,
        /<a[^>]*href=["']([^"']*parts[^"']*)["'][^>]*>([^<]*)<\/a>/gi,
        /<a[^>]*href=["']([^"']*breakdown[^"']*)["'][^>]*>([^<]*)<\/a>/gi,
      ];

      interface PdfDocument {
        url: string;
        title: string;
      }

      const pdfDocuments: PdfDocument[] = [];
      for (const pattern of pdfPatterns) {
        let match;
        while ((match = pattern.exec(html)) !== null) {
          let foundUrl = match[1];
          let linkText = match[2]?.trim() || '';

          // Make URL absolute
          if (foundUrl.startsWith('/')) {
            foundUrl = `${validUrl.origin}${foundUrl}`;
          } else if (!foundUrl.startsWith('http')) {
            foundUrl = `${validUrl.origin}/${foundUrl}`;
          }

          // Only add PDF files
          if (foundUrl.toLowerCase().endsWith('.pdf')) {
            const exists = pdfDocuments.find(pdf => pdf.url === foundUrl);
            if (!exists) {
              // Extract filename from URL if no link text
              const fileName = foundUrl.split('/').pop() || '';
              const docTitle = linkText || fileName.replace('.pdf', '').replace(/[-_]/g, ' ');

              pdfDocuments.push({
                url: foundUrl,
                title: docTitle
              });
            }
          }
        }
      }

      // Use first PDF found for backward compatibility
      pdfUrl = pdfDocuments.length > 0 ? pdfDocuments[0].url : '';

      return {
        success: true,
        product: {
          title: title || 'Product from ' + validUrl.hostname,
          link: url,
          snippet: snippet || 'Product information scraped from URL',
          image: imageUrl,
          price: price || 'Price not available',
          source: validUrl.hostname,
          isOfficialSite: false,
          pdfUrl: pdfUrl,
          pdfDocuments: pdfDocuments // Return all PDF documents found
        }
      };
    } catch (error) {
      console.error('Error scraping product URL:', error);
      return reply.status(500).send({ error: 'Failed to scrape product data from URL' });
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
          _sum: { purchasePrice: true }
        }),
        prisma.assetCategory.count()
      ]);

      return {
        totalAssets,
        activeAssets,
        inMaintenance,
        brokenAssets,
        totalValue: totalValue._sum?.purchasePrice || 0,
        categories
      };
    } catch (error) {
      console.error('Error fetching asset statistics:', error);
      return reply.status(500).send({ error: 'Failed to fetch statistics' });
    }
  });

  // ===== ASSET LOCATION ROUTES =====

  // Get all locations
  fastify.get('/locations', async (request, reply) => {
    try {
      const locations = await prisma.assetLocation.findMany({
        include: {
          _count: {
            select: { assets: true }
          }
        },
        orderBy: { name: 'asc' }
      });
      return locations;
    } catch (error) {
      console.error('Error fetching locations:', error);
      return reply.status(500).send({ error: 'Failed to fetch locations' });
    }
  });

  // Get active locations
  fastify.get('/locations/active', async (request, reply) => {
    try {
      const locations = await prisma.assetLocation.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' }
      });
      return locations;
    } catch (error) {
      console.error('Error fetching active locations:', error);
      return reply.status(500).send({ error: 'Failed to fetch active locations' });
    }
  });

  // Get single location
  fastify.get('/locations/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const location = await prisma.assetLocation.findUnique({
        where: { id },
        include: {
          assets: {
            include: {
              category: true
            }
          },
          _count: {
            select: { assets: true, transfersFrom: true, transfersTo: true }
          }
        }
      });

      if (!location) {
        return reply.status(404).send({ error: 'Location not found' });
      }

      return location;
    } catch (error) {
      console.error('Error fetching location:', error);
      return reply.status(500).send({ error: 'Failed to fetch location' });
    }
  });

  // Create location
  fastify.post('/locations', async (request, reply) => {
    try {
      const data = request.body as any;
      const location = await prisma.assetLocation.create({
        data
      });
      return location;
    } catch (error) {
      console.error('Error creating location:', error);
      return reply.status(500).send({ error: 'Failed to create location' });
    }
  });

  // Update location
  fastify.patch('/locations/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as any;
      const location = await prisma.assetLocation.update({
        where: { id },
        data
      });
      return location;
    } catch (error) {
      console.error('Error updating location:', error);
      return reply.status(500).send({ error: 'Failed to update location' });
    }
  });

  // Delete location
  fastify.delete('/locations/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      // Check if location has assets
      const assetsCount = await prisma.asset.count({
        where: { locationId: id }
      });

      if (assetsCount > 0) {
        return reply.status(400).send({
          error: `Cannot delete location with ${assetsCount} existing asset(s)`
        });
      }

      await prisma.assetLocation.delete({
        where: { id }
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting location:', error);
      return reply.status(500).send({ error: 'Failed to delete location' });
    }
  });

  // ===== SUPPLIER ROUTES =====

  // Get all suppliers
  fastify.get('/suppliers', async (request, reply) => {
    try {
      const suppliers = await prisma.supplier.findMany({
        include: {
          _count: {
            select: { assets: true }
          }
        },
        orderBy: { name: 'asc' }
      });
      return suppliers;
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      return reply.status(500).send({ error: 'Failed to fetch suppliers' });
    }
  });

  // Get active suppliers
  fastify.get('/suppliers/active', async (request, reply) => {
    try {
      const suppliers = await prisma.supplier.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' }
      });
      return suppliers;
    } catch (error) {
      console.error('Error fetching active suppliers:', error);
      return reply.status(500).send({ error: 'Failed to fetch active suppliers' });
    }
  });

  // Get single supplier
  fastify.get('/suppliers/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const supplier = await prisma.supplier.findUnique({
        where: { id },
        include: {
          assets: {
            include: {
              category: true
            }
          },
          _count: {
            select: { assets: true }
          }
        }
      });

      if (!supplier) {
        return reply.status(404).send({ error: 'Supplier not found' });
      }

      return supplier;
    } catch (error) {
      console.error('Error fetching supplier:', error);
      return reply.status(500).send({ error: 'Failed to fetch supplier' });
    }
  });

  // Create supplier
  fastify.post('/suppliers', async (request, reply) => {
    try {
      const data = request.body as any;
      const supplier = await prisma.supplier.create({
        data
      });
      return supplier;
    } catch (error) {
      console.error('Error creating supplier:', error);
      return reply.status(500).send({ error: 'Failed to create supplier' });
    }
  });

  // Update supplier
  fastify.patch('/suppliers/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as any;
      const supplier = await prisma.supplier.update({
        where: { id },
        data
      });
      return supplier;
    } catch (error) {
      console.error('Error updating supplier:', error);
      return reply.status(500).send({ error: 'Failed to update supplier' });
    }
  });

  // Delete supplier
  fastify.delete('/suppliers/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      // Check if supplier has assets
      const assetsCount = await prisma.asset.count({
        where: { supplierId: id }
      });

      if (assetsCount > 0) {
        return reply.status(400).send({
          error: `Cannot delete supplier with ${assetsCount} existing asset(s)`
        });
      }

      await prisma.supplier.delete({
        where: { id }
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting supplier:', error);
      return reply.status(500).send({ error: 'Failed to delete supplier' });
    }
  });

  // ===== ASSET TRANSFER ROUTES =====

  // Get all transfers
  fastify.get('/transfers', async (request, reply) => {
    try {
      const { status, assetId } = request.query as any;

      const where: any = {};
      if (status) where.status = status;
      if (assetId) where.assetId = assetId;

      const transfers = await prisma.assetTransfer.findMany({
        where,
        include: {
          asset: {
            include: {
              category: true
            }
          },
          fromLocation: true,
          toLocation: true
        },
        orderBy: { transferDate: 'desc' }
      });

      return transfers;
    } catch (error) {
      console.error('Error fetching transfers:', error);
      return reply.status(500).send({ error: 'Failed to fetch transfers' });
    }
  });

  // Get single transfer
  fastify.get('/transfers/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const transfer = await prisma.assetTransfer.findUnique({
        where: { id },
        include: {
          asset: {
            include: {
              category: true
            }
          },
          fromLocation: true,
          toLocation: true,
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

  // Create asset transfer
  fastify.post('/transfers', async (request, reply) => {
    try {
      const data = request.body as any;
      const user = (request as any).user;

      // Generate transfer number
      const latestTransfer = await prisma.assetTransfer.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { transferNumber: true }
      });

      let nextNumber = 1;
      if (latestTransfer && latestTransfer.transferNumber) {
        const match = latestTransfer.transferNumber.match(/ATR-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }

      const transferNumber = `ATR-${String(nextNumber).padStart(5, '0')}`;

      // Create transfer
      const transfer = await prisma.assetTransfer.create({
        data: {
          ...data,
          transferNumber,
          requestedById: user.id,
          requestedByName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
        },
        include: {
          asset: {
            include: {
              category: true
            }
          },
          fromLocation: true,
          toLocation: true
        }
      });

      // Create history entry
      await prisma.assetTransferHistory.create({
        data: {
          transferId: transfer.id,
          action: 'CREATED',
          performedById: user.id,
          performedByName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
          notes: `Transfer ${transferNumber} created`
        }
      });

      return transfer;
    } catch (error) {
      console.error('Error creating transfer:', error);
      return reply.status(500).send({ error: 'Failed to create transfer' });
    }
  });

  // Update transfer status
  fastify.patch('/transfers/:id/status', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { status, notes, conditionAfter } = request.body as any;
      const user = (request as any).user;

      const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
      const updateData: any = { status };

      // Update fields based on status
      if (status === 'IN_TRANSIT') {
        // No additional fields needed
      } else if (status === 'COMPLETED') {
        updateData.completedById = user.id;
        updateData.completedByName = userName;
        updateData.completedAt = new Date();
        updateData.actualArrival = new Date();
        if (conditionAfter) updateData.conditionAfter = conditionAfter;

        // Update asset location to new location
        const transfer = await prisma.assetTransfer.findUnique({
          where: { id },
          select: { assetId: true, toLocationId: true }
        });

        if (transfer) {
          await prisma.asset.update({
            where: { id: transfer.assetId },
            data: { locationId: transfer.toLocationId }
          });
        }
      } else if (status === 'CANCELLED') {
        // No additional fields needed
      }

      const transfer = await prisma.assetTransfer.update({
        where: { id },
        data: updateData,
        include: {
          asset: {
            include: {
              category: true
            }
          },
          fromLocation: true,
          toLocation: true
        }
      });

      // Create history entry
      await prisma.assetTransferHistory.create({
        data: {
          transferId: id,
          action: status,
          performedById: user.id,
          performedByName: userName,
          notes: notes || `Transfer status changed to ${status}`
        }
      });

      return transfer;
    } catch (error) {
      console.error('Error updating transfer status:', error);
      return reply.status(500).send({ error: 'Failed to update transfer status' });
    }
  });

  // Delete transfer
  fastify.delete('/transfers/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      await prisma.assetTransfer.delete({
        where: { id }
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting transfer:', error);
      return reply.status(500).send({ error: 'Failed to delete transfer' });
    }
  });

  // ===== REPORTS ROUTES =====

  // Generate asset report
  fastify.get('/reports/generate', async (request, reply) => {
    try {
      const { reportType, locationId, categoryId, status, startDate, endDate } = request.query as {
        reportType: 'general' | 'detailed';
        locationId?: string;
        categoryId?: string;
        status?: string;
        startDate?: string;
        endDate?: string;
      };

      // Build filter conditions
      const where: any = {};

      if (locationId) {
        where.locationId = locationId;
      }

      if (categoryId) {
        where.categoryId = categoryId;
      }

      if (status) {
        where.status = status;
      }

      if (startDate && endDate) {
        where.purchaseDate = {
          gte: new Date(startDate),
          lte: new Date(endDate)
        };
      }

      // Fetch assets based on report type
      if (reportType === 'general') {
        // General Report: Summary statistics
        const assets = await prisma.asset.findMany({
          where,
          include: {
            category: { select: { name: true, code: true } },
            location: { select: { name: true, code: true, type: true, address: true } },
            _count: {
              select: {
                maintenanceRecords: true,
                documents: true
              }
            }
          },
          orderBy: { assetTag: 'asc' }
        });

        // Calculate summary statistics
        const summary = {
          totalAssets: assets.length,
          totalValue: assets.reduce((sum, asset) => sum + asset.purchasePrice, 0),
          byStatus: {} as Record<string, number>,
          byCategory: {} as Record<string, number>,
          byLocation: {} as Record<string, number>,
          averageValue: 0,
          oldestPurchase: null as Date | null,
          newestPurchase: null as Date | null
        };

        // Group by status
        assets.forEach(asset => {
          summary.byStatus[asset.status] = (summary.byStatus[asset.status] || 0) + 1;
          summary.byCategory[asset.category.name] = (summary.byCategory[asset.category.name] || 0) + 1;
          if (asset.location) {
            const locationKey = asset.location.name;
            summary.byLocation[locationKey] = (summary.byLocation[locationKey] || 0) + 1;
          }
        });

        summary.averageValue = summary.totalValue / (assets.length || 1);

        if (assets.length > 0) {
          const sortedByDate = [...assets].sort((a, b) =>
            new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime()
          );
          summary.oldestPurchase = sortedByDate[0].purchaseDate;
          summary.newestPurchase = sortedByDate[sortedByDate.length - 1].purchaseDate;
        }

        return {
          reportType: 'general',
          generatedAt: new Date(),
          filters: { locationId, categoryId, status, startDate, endDate },
          summary,
          assets: assets.map(asset => ({
            assetTag: asset.assetTag,
            name: asset.name,
            category: asset.category.name,
            location: asset.location ? `${asset.location.name}${asset.location.room ? ' - ' + asset.location.room : ''}` : 'Unassigned',
            status: asset.status,
            purchasePrice: asset.purchasePrice,
            purchaseDate: asset.purchaseDate,
            brand: asset.brand,
            modelNumber: asset.modelNumber,
            maintenanceCount: asset._count.maintenanceRecords,
            documentCount: asset._count.documents
          }))
        };
      } else {
        // Detailed Report: Complete information
        const assets = await prisma.asset.findMany({
          where,
          include: {
            category: true,
            location: true,
            supplierRelation: { select: { name: true, contactEmail: true, contactPhone: true } },
            maintenanceRecords: {
              select: {
                id: true,
                maintenanceDate: true,
                type: true,
                description: true,
                cost: true,
                status: true
              },
              orderBy: { maintenanceDate: 'desc' }
            },
            documents: {
              select: {
                id: true,
                title: true,
                documentType: true,
                fileName: true,
                uploadedAt: true
              }
            },
            assignmentHistory: {
              select: {
                id: true,
                assignedToUserId: true,
                assignedToTeam: true,
                assignedToProject: true,
                assignmentDate: true,
                returnDate: true,
                assignedBy: true
              },
              orderBy: { assignmentDate: 'desc' }
            }
          },
          orderBy: { assetTag: 'asc' }
        });

        return {
          reportType: 'detailed',
          generatedAt: new Date(),
          filters: { locationId, categoryId, status, startDate, endDate },
          totalAssets: assets.length,
          totalValue: assets.reduce((sum, asset) => sum + asset.purchasePrice, 0),
          assets: assets.map(asset => ({
            // Basic Info
            assetTag: asset.assetTag,
            name: asset.name,
            description: asset.description,
            brand: asset.brand,
            modelNumber: asset.modelNumber,
            serialNumber: asset.serialNumber,
            status: asset.status,
            imageUrl: asset.imageUrl,

            // Category & Location
            category: {
              name: asset.category.name,
              code: asset.category.code,
              description: asset.category.description
            },
            location: asset.location ? {
              name: asset.location.name,
              building: asset.location.building,
              floor: asset.location.floor,
              room: asset.location.room
            } : null,

            // Purchase Info
            purchaseDate: asset.purchaseDate,
            purchasePrice: asset.purchasePrice,
            supplier: asset.supplierRelation ? asset.supplierRelation.name : asset.supplier,
            supplierContact: asset.supplierRelation ? {
              email: asset.supplierRelation.contactEmail,
              phone: asset.supplierRelation.contactPhone
            } : null,
            invoiceNumber: asset.invoiceNumber,

            // Warranty Info
            warrantyStartDate: asset.warrantyStartDate,
            warrantyEndDate: asset.warrantyEndDate,
            warrantyDuration: asset.warrantyDurationValue && asset.warrantyDurationUnit
              ? `${asset.warrantyDurationValue} ${asset.warrantyDurationUnit.toLowerCase()}`
              : null,
            warrantyTerms: asset.warrantyTerms,

            // Assignment Info
            currentAssignment: {
              userId: asset.assignedToUserId,
              team: asset.assignedToTeam,
              project: asset.assignedToProject,
              assignmentDate: asset.assignmentDate
            },

            // Counts & History
            maintenanceRecords: asset.maintenanceRecords,
            documents: asset.documents,
            assignmentHistory: asset.assignmentHistory,

            // Metadata
            createdAt: asset.createdAt,
            updatedAt: asset.updatedAt
          }))
        };
      }
    } catch (error) {
      console.error('Error generating report:', error);
      return reply.status(500).send({ error: 'Failed to generate report' });
    }
  });

  // Generate PDF report
  fastify.get('/reports/pdf', async (request, reply) => {
    try {
      const {
        reportType = 'general',
        locationId,
        categoryId,
        status,
        startDate,
        endDate,
        includePrices = 'true'
      } = request.query as {
        reportType?: 'general' | 'detailed';
        locationId?: string;
        categoryId?: string;
        status?: string;
        startDate?: string;
        endDate?: string;
        includePrices?: string;
      };

      const showPrices = includePrices === 'true';

      // Build filter conditions
      const where: any = {};

      if (locationId) {
        where.locationId = locationId;
      }

      if (categoryId) {
        where.categoryId = categoryId;
      }

      if (status) {
        where.status = status;
      }

      if (startDate && endDate) {
        where.purchaseDate = {
          gte: new Date(startDate),
          lte: new Date(endDate)
        };
      }

      // Fetch assets
      const assets = await prisma.asset.findMany({
        where,
        include: {
          category: { select: { name: true, code: true } },
          location: { select: { name: true, code: true, type: true, address: true } },
          supplierRelation: { select: { name: true } },
          _count: {
            select: {
              maintenanceRecords: true,
              documents: true
            }
          }
        },
        orderBy: { assetTag: 'asc' }
      });

      // Import PDFKit and path
      const PDFDocument = (await import('pdfkit')).default;
      const path = await import('path');
      const fs = await import('fs');

      const doc = new PDFDocument({
        margin: 0,
        size: 'A4',
        layout: 'landscape', // Landscape mode for more data
        bufferPages: false,
        autoFirstPage: false
      });

      // Collect PDF chunks in buffer
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));

      // When PDF is complete, send it
      const pdfPromise = new Promise<Buffer>((resolve, reject) => {
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          resolve(pdfBuffer);
        });
        doc.on('error', reject);
      });

      // Add first page
      doc.addPage();

      // Logo path
      const logoPath = path.join(process.cwd(), 'public', 'logo.png');

      // Helper function for formatting currency
      const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-TZ', {
          style: 'currency',
          currency: 'TZS',
          minimumFractionDigits: 0
        }).format(value);
      };

      // Helper function for formatting date
      const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      };

      // Get current user from request
      const user = (request as any).user;

      // ===== CLEAN HEADER =====

      // Logo on left
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 40, 40, { width: 120 });
      }

      // Title - Centered
      doc.fontSize(20).fillColor('#2c3e50').font('Helvetica-Bold').text('Asset Report', 40, 45, { width: 762, align: 'center', lineBreak: false });
      doc.fontSize(10).fillColor('#64748b').font('Helvetica').text('Comprehensive Asset Inventory', 40, 70, { width: 762, align: 'center', lineBreak: false });

      // Separator line
      doc.moveTo(40, 100).lineTo(802, 100).strokeColor('#e2e8f0').lineWidth(1).stroke();

      doc.y = 115;

      // REPORT INFORMATION - Clean section
      doc.fontSize(12).fillColor('#2c3e50').font('Helvetica-Bold').text('Report Information', 40, doc.y, { lineBreak: false });

      let infoY = doc.y + 20;

      doc.fontSize(10).fillColor('#64748b').font('Helvetica');
      doc.text('Report Type:', 40, infoY, { lineBreak: false });
      doc.fillColor('#2c3e50').text(reportType === 'general' ? 'Summary Report' : 'Detailed Report', 160, infoY, { lineBreak: false });

      if (status) {
        doc.fillColor('#64748b').text('Status Filter:', 350, infoY, { lineBreak: false });
        doc.fillColor('#2c3e50').text(status, 470, infoY, { lineBreak: false });
      }

      if (startDate && endDate) {
        infoY += 18;
        doc.fillColor('#64748b').text('Date Range:', 40, infoY, { lineBreak: false });
        doc.fillColor('#2c3e50').text(`${formatDate(new Date(startDate))} - ${formatDate(new Date(endDate))}`, 160, infoY, { lineBreak: false });
      }

      doc.y = infoY + 25;

      // STATISTICS - Clean text style (no boxes)
      const totalAssets = assets.length;
      const totalValue = assets.reduce((sum, asset) => sum + asset.purchasePrice, 0);

      doc.fontSize(12).fillColor('#2c3e50').font('Helvetica-Bold').text('Statistics', 40, doc.y, { lineBreak: false });

      const statsY = doc.y + 20;
      const statsSpacing = 250;

      // Stat 1 - Total Assets
      doc.fontSize(9).fillColor('#64748b').font('Helvetica').text('Total Assets', 40, statsY, { lineBreak: false });
      doc.fontSize(16).fillColor('#2c3e50').font('Helvetica-Bold').text(`${totalAssets}`, 40, statsY + 12, { lineBreak: false });

      if (showPrices) {
        // Stat 2 - Total Value (only if prices are shown)
        doc.fontSize(9).fillColor('#64748b').font('Helvetica').text('Total Value', 40 + statsSpacing, statsY, { lineBreak: false });
        doc.fontSize(14).fillColor('#2c3e50').font('Helvetica-Bold').text(formatCurrency(totalValue), 40 + statsSpacing, statsY + 12, { lineBreak: false });
      }

      doc.y = statsY + 40;

      // ASSET LIST
      doc.fontSize(12).fillColor('#2c3e50').font('Helvetica-Bold').text('Asset List', 40, doc.y, { lineBreak: false });
      doc.y += 15;

      // Table headers with clean background - landscape has more width
      const tableTop = doc.y;
      const tableWidth = 762; // Landscape A4 width minus margins
      const colWidths = showPrices
        ? { tag: 58, name: 150, category: 75, location: 95, status: 55, supplier: 85, date: 85, price: 95 }
        : { tag: 70, name: 200, category: 100, location: 120, status: 70, supplier: 120, date: 82 };

      // Header background
      doc.rect(40, tableTop, tableWidth, 18).fillAndStroke('#f8fafc', '#e2e8f0');

      let xPos = 46;
      const headerY = tableTop + 5;
      doc.fontSize(8).fillColor('#64748b').font('Helvetica-Bold');
      doc.text('Serial #', xPos, headerY, { width: colWidths.tag, continued: false, lineBreak: false });
      xPos += colWidths.tag;
      doc.text('Asset Name', xPos, headerY, { width: colWidths.name, continued: false, lineBreak: false });
      xPos += colWidths.name;
      doc.text('Category', xPos, headerY, { width: colWidths.category, continued: false, lineBreak: false });
      xPos += colWidths.category;
      doc.text('Location', xPos, headerY, { width: colWidths.location, continued: false, lineBreak: false });
      xPos += colWidths.location;
      doc.text('Status', xPos, headerY, { width: colWidths.status, continued: false, lineBreak: false });
      xPos += colWidths.status;
      doc.text('Supplier', xPos, headerY, { width: colWidths.supplier, continued: false, lineBreak: false });
      xPos += colWidths.supplier;
      doc.text('Purchase Date', xPos, headerY, { width: colWidths.date, continued: false, lineBreak: false });
      xPos += colWidths.date;
      if (showPrices) {
        doc.text('Price (TZS)', xPos, headerY, { width: colWidths.price, continued: false, lineBreak: false });
      }

      doc.y = tableTop + 20;

      // Table rows with smaller font to fit on one line
      doc.font('Helvetica').fontSize(8).fillColor('#2c3e50');
      assets.forEach((asset, index) => {
        const rowHeight = 16;
        const requiredSpace = rowHeight + 40; // Row + footer space

        // Check if we need a new page
        if (doc.y + requiredSpace > doc.page.height - 50) {
          doc.addPage();
          // Redraw header on new page
          const newTableTop = 40;
          doc.rect(40, newTableTop, tableWidth, 18).fillAndStroke('#f8fafc', '#e2e8f0');
          let newXPos = 46;
          const newHeaderY = newTableTop + 5;
          doc.fontSize(8).fillColor('#64748b').font('Helvetica-Bold');
          doc.text('Serial #', newXPos, newHeaderY, { width: colWidths.tag, continued: false, lineBreak: false });
          newXPos += colWidths.tag;
          doc.text('Asset Name', newXPos, newHeaderY, { width: colWidths.name, continued: false, lineBreak: false });
          newXPos += colWidths.name;
          doc.text('Category', newXPos, newHeaderY, { width: colWidths.category, continued: false, lineBreak: false });
          newXPos += colWidths.category;
          doc.text('Location', newXPos, newHeaderY, { width: colWidths.location, continued: false, lineBreak: false });
          newXPos += colWidths.location;
          doc.text('Status', newXPos, newHeaderY, { width: colWidths.status, continued: false, lineBreak: false });
          newXPos += colWidths.status;
          doc.text('Supplier', newXPos, newHeaderY, { width: colWidths.supplier, continued: false, lineBreak: false });
          newXPos += colWidths.supplier;
          doc.text('Purchase Date', newXPos, newHeaderY, { width: colWidths.date, continued: false, lineBreak: false });
          newXPos += colWidths.date;
          if (showPrices) {
            doc.text('Price (TZS)', newXPos, newHeaderY, { width: colWidths.price, continued: false, lineBreak: false });
          }
          doc.y = newTableTop + 20;
          doc.font('Helvetica').fontSize(8).fillColor('#2c3e50');
        }

        const yPos = doc.y;

        // Clean border bottom line for each row
        doc.moveTo(40, yPos + rowHeight).lineTo(802, yPos + rowHeight).strokeColor('#e2e8f0').lineWidth(0.5).stroke();

        xPos = 46;
        const textY = yPos + 4;

        // Serial number in RED and BOLD
        doc.fillColor('#dc2626').font('Helvetica-Bold').fontSize(8);
        doc.text(asset.serialNumber || asset.assetTag, xPos, textY, { width: colWidths.tag - 5, continued: false, lineBreak: false });

        // Reset to normal for other columns
        doc.fillColor('#2c3e50').font('Helvetica').fontSize(8);
        xPos += colWidths.tag;
        doc.text(asset.name.substring(0, 45), xPos, textY, { width: colWidths.name - 5, continued: false, lineBreak: false });
        xPos += colWidths.name;
        doc.text(asset.category.name.substring(0, 18), xPos, textY, { width: colWidths.category - 5, continued: false, lineBreak: false });
        xPos += colWidths.category;
        doc.text((asset.location?.name || 'N/A').substring(0, 22), xPos, textY, { width: colWidths.location - 5, continued: false, lineBreak: false });
        xPos += colWidths.location;
        doc.text(asset.status, xPos, textY, { width: colWidths.status - 5, continued: false, lineBreak: false });
        xPos += colWidths.status;
        doc.text((asset.supplierRelation?.name || 'N/A').substring(0, 20), xPos, textY, { width: colWidths.supplier - 5, continued: false, lineBreak: false });
        xPos += colWidths.supplier;
        doc.text(formatDate(asset.purchaseDate), xPos, textY, { width: colWidths.date - 5, continued: false, lineBreak: false });
        xPos += colWidths.date;
        if (showPrices) {
          doc.text(formatCurrency(asset.purchasePrice), xPos, textY, { width: colWidths.price - 5, continued: false, lineBreak: false });
        }

        doc.y = yPos + rowHeight;
      });

      // Add simple footer at bottom of current page
      const footerY = doc.page.height - 35;
      const generatedBy = `Generated by: ${user?.email || 'System'} • ${new Date().toLocaleString()}`;

      // Footer separator line
      doc.strokeColor('#e2e8f0').lineWidth(1)
        .moveTo(40, footerY - 8)
        .lineTo(802, footerY - 8)
        .stroke();

      // Footer text - centered with generated by info
      const footerText = showPrices
        ? 'UDesign Asset Management System • ' + generatedBy
        : 'UDesign Asset Management System • PRICES HIDDEN • ' + generatedBy;

      doc.fontSize(8).fillColor('#94a3b8').font('Helvetica');
      doc.text(footerText, 40, footerY, {
        width: 762,
        align: 'center',
        lineBreak: false
      });

      // Finalize PDF and wait for buffer
      doc.end();
      const pdfBuffer = await pdfPromise;

      // Send PDF
      reply.type('application/pdf');
      reply.header('Content-Disposition', `attachment; filename="asset-report-${new Date().toISOString().split('T')[0]}.pdf"`);
      reply.header('Content-Length', pdfBuffer.length.toString());
      return reply.send(pdfBuffer);
    } catch (error) {
      console.error('Error generating PDF report:', error);
      return reply.status(500).send({ error: 'Failed to generate PDF report' });
    }
  });
}
