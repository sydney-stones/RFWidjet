import { PrismaClient, SubscriptionPlan, SubscriptionStatus, ProductCategory } from '@prisma/client'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Clear existing data (be careful in production!)
  console.log('🗑️  Cleaning existing data...')
  await prisma.webhook.deleteMany()
  await prisma.apiLog.deleteMany()
  await prisma.analyticsEvent.deleteMany()
  await prisma.usageTracking.deleteMany()
  await prisma.tryOn.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.product.deleteMany()
  await prisma.merchant.deleteMany()

  // ============================================================================
  // MERCHANTS
  // ============================================================================

  console.log('👔 Creating merchants...')

  const hashedPassword = await bcrypt.hash('password123', 10)

  const merchant1 = await prisma.merchant.create({
    data: {
      email: 'john@luxefashion.com',
      password: hashedPassword,
      businessName: 'Luxe Fashion Boutique',
      apiKey: `rfts_${crypto.randomBytes(32).toString('hex')}`,
      plan: SubscriptionPlan.MAISON,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      website: 'https://luxefashion.com',
      contactName: 'John Smith',
      phone: '+1-555-0100',
      billingEmail: 'billing@luxefashion.com',
      trialEndsAt: new Date('2024-02-01'),
      subscriptionEndsAt: new Date('2025-01-01'),
      allowedDomains: ['https://luxefashion.com', 'https://www.luxefashion.com'],
      lastLoginAt: new Date()
    }
  })

  const merchant2 = await prisma.merchant.create({
    data: {
      email: 'sarah@urbanstyle.io',
      password: hashedPassword,
      businessName: 'Urban Style Co.',
      apiKey: `rfts_${crypto.randomBytes(32).toString('hex')}`,
      plan: SubscriptionPlan.ATELIER,
      subscriptionStatus: SubscriptionStatus.TRIAL,
      website: 'https://urbanstyle.io',
      contactName: 'Sarah Johnson',
      phone: '+1-555-0200',
      billingEmail: 'sarah@urbanstyle.io',
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      allowedDomains: ['https://urbanstyle.io'],
      lastLoginAt: new Date()
    }
  })

  console.log(`✅ Created merchants:`)
  console.log(`   - ${merchant1.businessName} (${merchant1.email})`)
  console.log(`   - API Key: ${merchant1.apiKey}`)
  console.log(`   - ${merchant2.businessName} (${merchant2.email})`)
  console.log(`   - API Key: ${merchant2.apiKey}`)

  // ============================================================================
  // PRODUCTS - Merchant 1 (Luxe Fashion)
  // ============================================================================

  console.log('\n👗 Creating products for Luxe Fashion Boutique...')

  const merchant1Products = await prisma.product.createMany({
    data: [
      {
        merchantId: merchant1.id,
        externalId: 'LFB-001',
        name: 'Elegant Silk Evening Dress',
        description: 'A luxurious silk evening dress perfect for formal occasions. Features a flowing A-line silhouette.',
        imageUrl: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800',
        price: 299.99,
        currency: 'USD',
        category: ProductCategory.FORMAL,
        sku: 'DRESS-SILK-BLK-001',
        metadata: {
          sizes: ['XS', 'S', 'M', 'L', 'XL'],
          colors: ['Black', 'Navy', 'Burgundy'],
          material: 'Silk',
          brand: 'Luxe Collection'
        }
      },
      {
        merchantId: merchant1.id,
        externalId: 'LFB-002',
        name: 'Designer Wool Blazer',
        description: 'Premium wool blazer with tailored fit. Perfect for business or smart casual.',
        imageUrl: 'https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=800',
        price: 449.99,
        currency: 'USD',
        category: ProductCategory.OUTERWEAR,
        sku: 'BLAZER-WOOL-001',
        metadata: {
          sizes: ['XS', 'S', 'M', 'L', 'XL'],
          colors: ['Charcoal', 'Navy', 'Black'],
          material: 'Wool',
          brand: 'Luxe Collection'
        }
      },
      {
        merchantId: merchant1.id,
        externalId: 'LFB-003',
        name: 'Cashmere Turtleneck Sweater',
        description: 'Soft cashmere turtleneck in timeless design. Luxuriously comfortable.',
        imageUrl: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800',
        price: 189.99,
        currency: 'USD',
        category: ProductCategory.TOPS,
        sku: 'SWEATER-CASH-001',
        metadata: {
          sizes: ['XS', 'S', 'M', 'L', 'XL'],
          colors: ['Cream', 'Black', 'Camel'],
          material: 'Cashmere',
          brand: 'Luxe Collection'
        }
      },
      {
        merchantId: merchant1.id,
        externalId: 'LFB-004',
        name: 'High-Waisted Tailored Trousers',
        description: 'Classic tailored trousers with a flattering high-waist cut.',
        imageUrl: 'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=800',
        price: 159.99,
        currency: 'USD',
        category: ProductCategory.BOTTOMS,
        sku: 'TROUSERS-001',
        metadata: {
          sizes: ['24', '26', '28', '30', '32'],
          colors: ['Black', 'Navy', 'Grey'],
          material: 'Wool Blend',
          brand: 'Luxe Collection'
        }
      },
      {
        merchantId: merchant1.id,
        externalId: 'LFB-005',
        name: 'Leather Ankle Boots',
        description: 'Premium leather ankle boots with block heel. Versatile and comfortable.',
        imageUrl: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800',
        price: 279.99,
        currency: 'USD',
        category: ProductCategory.SHOES,
        sku: 'BOOTS-LTR-001',
        metadata: {
          sizes: ['6', '7', '8', '9', '10', '11'],
          colors: ['Black', 'Brown'],
          material: 'Leather',
          brand: 'Luxe Collection'
        }
      }
    ]
  })

  // ============================================================================
  // PRODUCTS - Merchant 2 (Urban Style)
  // ============================================================================

  console.log('👟 Creating products for Urban Style Co....')

  const merchant2Products = await prisma.product.createMany({
    data: [
      {
        merchantId: merchant2.id,
        externalId: 'URB-001',
        name: 'Oversized Graphic Hoodie',
        description: 'Comfortable oversized hoodie with exclusive graphic design. Streetwear essential.',
        imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800',
        price: 79.99,
        currency: 'USD',
        category: ProductCategory.CASUAL,
        sku: 'HOODIE-GRF-001',
        metadata: {
          sizes: ['S', 'M', 'L', 'XL', 'XXL'],
          colors: ['Black', 'White', 'Grey', 'Navy'],
          material: 'Cotton Blend',
          brand: 'Urban Style'
        }
      },
      {
        merchantId: merchant2.id,
        externalId: 'URB-002',
        name: 'Distressed Slim Fit Jeans',
        description: 'Modern slim fit jeans with stylish distressed details.',
        imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800',
        price: 89.99,
        currency: 'USD',
        category: ProductCategory.BOTTOMS,
        sku: 'JEANS-DST-001',
        metadata: {
          sizes: ['28', '30', '32', '34', '36'],
          colors: ['Light Blue', 'Dark Blue', 'Black'],
          material: 'Denim',
          brand: 'Urban Style'
        }
      },
      {
        merchantId: merchant2.id,
        externalId: 'URB-003',
        name: 'Performance Activewear Set',
        description: 'Moisture-wicking activewear set for workouts and athleisure.',
        imageUrl: 'https://images.unsplash.com/photo-1556906918-0b4f1e9c4b34?w=800',
        price: 119.99,
        currency: 'USD',
        category: ProductCategory.ACTIVEWEAR,
        sku: 'ACTIVE-SET-001',
        metadata: {
          sizes: ['XS', 'S', 'M', 'L', 'XL'],
          colors: ['Black', 'Navy', 'Grey', 'Burgundy'],
          material: 'Performance Fabric',
          brand: 'Urban Style'
        }
      },
      {
        merchantId: merchant2.id,
        externalId: 'URB-004',
        name: 'Vintage Bomber Jacket',
        description: 'Classic bomber jacket with modern fit. Perfect for layering.',
        imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800',
        price: 149.99,
        currency: 'USD',
        category: ProductCategory.OUTERWEAR,
        sku: 'BOMBER-VNT-001',
        metadata: {
          sizes: ['S', 'M', 'L', 'XL'],
          colors: ['Olive', 'Black', 'Navy'],
          material: 'Nylon',
          brand: 'Urban Style'
        }
      },
      {
        merchantId: merchant2.id,
        externalId: 'URB-005',
        name: 'Minimalist Sneakers',
        description: 'Clean, minimalist sneakers for everyday wear. Comfortable and stylish.',
        imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800',
        price: 99.99,
        currency: 'USD',
        category: ProductCategory.SHOES,
        sku: 'SNKR-MIN-001',
        metadata: {
          sizes: ['7', '8', '9', '10', '11', '12'],
          colors: ['White', 'Black', 'Grey'],
          material: 'Leather',
          brand: 'Urban Style'
        }
      }
    ]
  })

  const totalProducts = merchant1Products.count + merchant2Products.count
  console.log(`✅ Created ${totalProducts} products`)

  // ============================================================================
  // CUSTOMERS
  // ============================================================================

  console.log('\n👤 Creating sample customers...')

  const customer1 = await prisma.customer.create({
    data: {
      email: 'emily.wilson@email.com',
      photoUrl: 'https://randomuser.me/api/portraits/women/1.jpg',
      bodyProfile: {
        height: 165,
        weight: 58,
        chestSize: 34,
        waistSize: 26,
        hipSize: 36,
        shoeSize: 8
      },
      preferences: {
        styles: ['elegant', 'casual'],
        colors: ['black', 'navy', 'white']
      }
    }
  })

  const customer2 = await prisma.customer.create({
    data: {
      anonymousId: `anon_${crypto.randomBytes(16).toString('hex')}`,
      bodyProfile: {
        height: 175,
        weight: 70
      }
    }
  })

  console.log(`✅ Created ${2} customers`)

  // ============================================================================
  // TRY-ONS
  // ============================================================================

  console.log('\n🎨 Creating sample try-on events...')

  const products = await prisma.product.findMany({
    take: 5
  })

  const tryOns = []
  for (let i = 0; i < 5; i++) {
    const tryOn = await prisma.tryOn.create({
      data: {
        customerId: i % 2 === 0 ? customer1.id : customer2.id,
        productId: products[i].id,
        merchantId: products[i].merchantId,
        inputImageUrl: `https://example.com/inputs/customer-${i + 1}.jpg`,
        outputImageUrl: `https://example.com/outputs/result-${i + 1}.jpg`,
        processingTimeMs: Math.floor(Math.random() * 5000) + 2000,
        converted: i < 2, // First 2 converted
        purchaseAmount: i < 2 ? products[i].price : null,
        convertedAt: i < 2 ? new Date() : null
      }
    })
    tryOns.push(tryOn)
  }

  console.log(`✅ Created ${tryOns.length} try-on events`)

  // ============================================================================
  // USAGE TRACKING
  // ============================================================================

  console.log('\n📊 Creating usage tracking records...')

  const currentDate = new Date()
  const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`

  await prisma.usageTracking.create({
    data: {
      merchantId: merchant1.id,
      month: currentMonth,
      year: currentDate.getFullYear(),
      monthNumber: currentDate.getMonth() + 1,
      tryonCount: 156,
      includedTryons: 2000, // MAISON plan
      overageTryons: 0,
      overageCharges: 0,
      totalCharges: 299.00
    }
  })

  await prisma.usageTracking.create({
    data: {
      merchantId: merchant2.id,
      month: currentMonth,
      year: currentDate.getFullYear(),
      monthNumber: currentDate.getMonth() + 1,
      tryonCount: 45,
      includedTryons: 500, // ATELIER plan
      overageTryons: 0,
      overageCharges: 0,
      totalCharges: 0 // Trial period
    }
  })

  console.log(`✅ Created usage tracking records`)

  // ============================================================================
  // ANALYTICS EVENTS
  // ============================================================================

  console.log('\n📈 Creating analytics events...')

  await prisma.analyticsEvent.createMany({
    data: [
      {
        merchantId: merchant1.id,
        eventType: 'WIDGET_LOADED',
        eventData: { page: '/products/elegant-silk-dress', sessionId: 'sess_123' },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...'
      },
      {
        merchantId: merchant1.id,
        eventType: 'TRY_ON_STARTED',
        eventData: { productId: products[0].id, customerId: customer1.id },
        ipAddress: '192.168.1.1'
      },
      {
        merchantId: merchant1.id,
        eventType: 'TRY_ON_COMPLETED',
        eventData: { productId: products[0].id, processingTime: 3456 },
        ipAddress: '192.168.1.1'
      },
      {
        merchantId: merchant1.id,
        eventType: 'CONVERSION',
        eventData: { productId: products[0].id, amount: 299.99 },
        ipAddress: '192.168.1.1'
      }
    ]
  })

  console.log(`✅ Created analytics events`)

  // ============================================================================
  // SUMMARY
  // ============================================================================

  console.log('\n' + '='.repeat(60))
  console.log('🎉 Seed completed successfully!')
  console.log('='.repeat(60))
  console.log('\n📋 Summary:')
  console.log(`   • 2 Merchants`)
  console.log(`   • 10 Products (5 per merchant)`)
  console.log(`   • 2 Customers`)
  console.log(`   • 5 Try-on events`)
  console.log(`   • 2 Usage tracking records`)
  console.log(`   • 4 Analytics events`)
  console.log('\n🔑 Login Credentials:')
  console.log(`   Email: john@luxefashion.com`)
  console.log(`   Password: password123`)
  console.log(`   API Key: ${merchant1.apiKey}`)
  console.log('')
  console.log(`   Email: sarah@urbanstyle.io`)
  console.log(`   Password: password123`)
  console.log(`   API Key: ${merchant2.apiKey}`)
  console.log('\n' + '='.repeat(60))
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
