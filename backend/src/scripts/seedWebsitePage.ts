import { prisma } from '../lib/prisma.js';

async function seedWebsitePage() {
  try {
    // Check if Coming Soon page already exists
    const existingPage = await prisma.websitePage.findUnique({
      where: { slug: 'coming-soon' },
    });

    if (existingPage) {
      console.log('✅ Coming Soon page already exists');
      return;
    }

    // Create Coming Soon page with default content
    const page = await prisma.websitePage.create({
      data: {
        name: 'Coming Soon',
        slug: 'coming-soon',
        status: 'published',
        content: {
          title: 'Welcome to UDesign',
          subtitle: 'Premium Hardwood & Custom Furniture Manufacturer',
          description:
            'We specialize in crafting exceptional furniture and supplying premium hardwood products. Our commitment to quality and craftsmanship ensures every piece meets the highest standards.',
          products: [
            {
              name: 'Premium Hardwood',
              icon: '🌳',
              description: 'Solid hardwood timber for construction and craftsmanship',
            },
            {
              name: 'Custom Furniture',
              icon: '🪑',
              description: 'Bespoke furniture pieces crafted to your specifications',
            },
            {
              name: 'Fabricated Wood',
              icon: '🔨',
              description: 'Engineered wood products for commercial applications',
            },
            {
              name: 'Wood Veneer',
              icon: '📐',
              description: 'High-quality decorative veneers in various finishes',
            },
          ],
          footerText: 'Website Coming Soon • Contact Us For Inquiries',
        },
      },
    });

    console.log('✅ Coming Soon page created successfully:', page.id);
  } catch (error) {
    console.error('❌ Error seeding website page:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedWebsitePage();
