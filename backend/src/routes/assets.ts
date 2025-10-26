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
      const { assetTag, imageUrl, pdfUrl } = request.body as { assetTag: string; imageUrl?: string; pdfUrl?: string };

      if (!assetTag) {
        return reply.status(400).send({ error: 'Asset tag is required' });
      }

      const results: any = {};

      // Create folder structure: udesign/assets/{AssetTag}/
      const assetFolder = `udesign/assets/${assetTag}`;

      // Download and upload image if provided
      if (imageUrl) {
        try {
          const imageResponse = await fetch(imageUrl);
          if (imageResponse.ok) {
            const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

            const imageResult = await uploadToCloudinary(imageBuffer, {
              folder: assetFolder,
              public_id: `image-${Date.now()}`,
              resource_type: 'image'
            });

            results.imageUrl = imageResult.secure_url;
          }
        } catch (err) {
          console.error('Error downloading image:', err);
          results.imageError = 'Failed to download image';
        }
      }

      // Download and upload PDF if provided
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
              folder: assetFolder,
              public_id: `manual-${Date.now()}`,
              resource_type: 'raw' // For PDF files
            });

            results.pdfUrl = pdfResult.secure_url;
          }
        } catch (err) {
          console.error('Error downloading PDF:', err);
          results.pdfError = 'Failed to download PDF';
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
                link: item.link || item.image?.contextLink || '#',
                snippet: item.snippet || '',
                image: item.link || item.image?.thumbnailLink || '',
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
          link: item.link || item.image?.contextLink || '#',
          snippet: item.snippet || '',
          image: item.link || item.image?.thumbnailLink || '',
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

      // Extract PDF links (manual, datasheet, spec sheet, etc.)
      const pdfPatterns = [
        /<a[^>]*href=["']([^"']*\.pdf)["'][^>]*>/gi,
        /<a[^>]*href=["']([^"']*manual[^"']*)["'][^>]*>/gi,
        /<a[^>]*href=["']([^"']*datasheet[^"']*)["'][^>]*>/gi,
        /<a[^>]*href=["']([^"']*spec[^"']*)["'][^>]*>/gi,
      ];

      const pdfUrls: string[] = [];
      for (const pattern of pdfPatterns) {
        let match;
        while ((match = pattern.exec(html)) !== null) {
          let foundUrl = match[1];
          // Make URL absolute
          if (foundUrl.startsWith('/')) {
            foundUrl = `${validUrl.origin}${foundUrl}`;
          } else if (!foundUrl.startsWith('http')) {
            foundUrl = `${validUrl.origin}/${foundUrl}`;
          }
          // Only add PDF files
          if (foundUrl.toLowerCase().endsWith('.pdf') && !pdfUrls.includes(foundUrl)) {
            pdfUrls.push(foundUrl);
          }
        }
      }

      // Use first PDF found (usually manual or datasheet)
      pdfUrl = pdfUrls.length > 0 ? pdfUrls[0] : '';

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
          pdfUrl: pdfUrl
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
}
