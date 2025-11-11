# Rendered Fits Widget

Customer-facing AI virtual try-on widget for e-commerce websites. A lightweight, vanilla JavaScript widget that allows customers to visualize products on themselves before purchasing.

## Features

- **Zero Dependencies** - Pure vanilla JavaScript, no React or other frameworks
- **Lightweight** - <50KB minified and gzipped
- **Mobile-First** - Works seamlessly on all devices
- **Beautiful UI** - Modern, animated interface with smooth transitions
- **Camera Support** - Mobile camera access for real-time photo capture
- **Drag & Drop** - Easy photo upload via drag and drop
- **LocalStorage** - Saves customer photos for faster subsequent try-ons
- **Isolated CSS** - Won't conflict with your existing styles
- **TypeScript** - Fully typed for better developer experience

## Installation

### Via CDN (Recommended)

```html
<script src="https://cdn.renderedfits.com/widget/v1/widget.min.js"></script>
```

### Via NPM

```bash
npm install @rendered-fits/widget
```

## Quick Start

Add this snippet to your product page:

```html
<!-- 1. Load the widget script -->
<script src="https://cdn.renderedfits.com/widget/v1/widget.min.js"></script>

<!-- 2. Initialize the widget -->
<script>
  RenderedFits.init({
    apiKey: 'rfts_xxxxx',      // Your API key from dashboard
    productId: 'product_123'    // Current product ID
  })
</script>
```

That's it! The widget will automatically inject a "Try On Me" button on your product page.

## Configuration

### Basic Configuration

```javascript
RenderedFits.init({
  apiKey: 'rfts_xxxxx',         // Required: Your API key
  productId: 'product_123',     // Required: Product ID
  baseUrl: 'https://api.renderedfits.com' // Optional: API base URL
})
```

### Advanced Configuration

```javascript
RenderedFits.init({
  apiKey: 'rfts_xxxxx',
  productId: 'product_123',

  // Customize button appearance
  buttonOptions: {
    label: '👗 Try On Me',           // Button text
    icon: '👗',                      // Button icon
    position: 'before-add-to-cart',  // Button position
    style: 'primary'                 // 'primary' | 'secondary' | 'outline'
  },

  // Event callbacks
  onSuccess: (result) => {
    console.log('Try-on generated:', result)
    // Track analytics
    gtag('event', 'virtual_tryon', {
      product_id: result.metadata.productId,
      processing_time: result.processingTimeMs
    })
  },

  onError: (error) => {
    console.error('Try-on failed:', error)
    // Handle error
  },

  onAddToCart: () => {
    // Custom add to cart logic
    myShopify.addToCart(productId, selectedSize)
  }
})
```

## Button Position Options

The widget can automatically find your "Add to Cart" button and position the try-on button relative to it:

- **`before-add-to-cart`** (default) - Above the add to cart button
- **`after-add-to-cart`** - Below the add to cart button
- **`custom`** - Use a custom CSS selector

### Custom Position Example

```javascript
RenderedFits.init({
  apiKey: 'rfts_xxxxx',
  productId: 'product_123',
  buttonOptions: {
    position: 'custom',
    customSelector: '#product-actions' // Your custom container
  }
})
```

## Styling

### Button Styles

The widget provides three built-in button styles:

**Primary** (default)
```javascript
buttonOptions: {
  style: 'primary' // Purple gradient with shadow
}
```

**Secondary**
```javascript
buttonOptions: {
  style: 'secondary' // Light purple background
}
```

**Outline**
```javascript
buttonOptions: {
  style: 'outline' // Transparent with purple border
}
```

### Custom Styling

Override widget styles using CSS:

```css
/* Custom button styles */
#rf-tryon-button {
  background: #your-brand-color !important;
  border-radius: 8px !important;
  font-family: 'Your Font', sans-serif !important;
}

/* Custom modal styles */
#rf-modal {
  max-width: 800px !important;
}
```

## API Response

When a try-on is successfully generated, you'll receive:

```typescript
{
  success: true,
  tryonId: 'clx123456789',
  imageUrl: 'https://cdn.renderedfits.com/outputs/tryon-123.jpg',
  recommendedSize: 'M',
  usageRemaining: 450,
  processingTimeMs: 2340,
  metadata: {
    customerId: 'clxcust123',
    productId: 'product_123',
    productName: 'Elegant Silk Evening Dress',
    quality: 'standard'
  }
}
```

## Platform Integration

### Shopify

Add to your product template (`product.liquid`):

```liquid
<script src="https://cdn.renderedfits.com/widget/v1/widget.min.js"></script>
<script>
  RenderedFits.init({
    apiKey: '{{ shop.metafields.renderedfits.api_key }}',
    productId: '{{ product.id }}',
    onAddToCart: () => {
      document.querySelector('[name="add"]').click()
    }
  })
</script>
```

### WooCommerce

Add to your theme's `functions.php`:

```php
add_action('woocommerce_after_add_to_cart_button', function() {
  global $product;
  ?>
  <script src="https://cdn.renderedfits.com/widget/v1/widget.min.js"></script>
  <script>
    RenderedFits.init({
      apiKey: '<?php echo get_option('renderedfits_api_key'); ?>',
      productId: '<?php echo $product->get_id(); ?>'
    })
  </script>
  <?php
});
```

### Custom Platforms

For any platform, just add the script tag and initialization code to your product page template.

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- iOS Safari 14+
- Chrome Android 90+

## Development

### Build from Source

```bash
# Install dependencies
npm install

# Development mode (watch)
npm run dev

# Production build
npm run build

# Type checking
npm run typecheck
```

### Project Structure

```
widget/
├── src/
│   ├── index.ts          # Main entry point
│   ├── ui/
│   │   ├── button.ts     # Try-on button component
│   │   ├── modal.ts      # Modal overlay
│   │   ├── upload.ts     # Photo upload UI
│   │   ├── loading.ts    # Loading state
│   │   └── result.ts     # Result display
│   ├── api/
│   │   └── client.ts     # API client
│   └── utils/
│       ├── storage.ts    # LocalStorage helpers
│       └── validation.ts # Input validation
├── dist/
│   └── widget.min.js     # Bundled output
├── demo.html             # Test page
└── rollup.config.js      # Build configuration
```

## Testing

Open `demo.html` in your browser:

```bash
npm run build
open demo.html
```

Make sure the API server is running on `localhost:3001`.

## Performance

- Initial load: ~40KB gzipped
- Time to interactive: <100ms
- Memory usage: <5MB
- No impact on page load time (async loading recommended)

## Security

- API keys are never exposed in client-side code
- Images are validated before upload
- XSS protection via content sanitization
- CSP-compatible

## Troubleshooting

### Button not appearing

1. Check console for errors
2. Verify API key is correct
3. Ensure product page has an "Add to Cart" button
4. Try using `customSelector` for button position

### Try-on generation fails

1. Check API server is running
2. Verify API key has not expired
3. Check usage limits in dashboard
4. Ensure image size is under 5MB

### Modal not opening

1. Check for JavaScript errors
2. Verify z-index conflicts with existing modals
3. Ensure no other scripts are interfering

## Support

- Documentation: https://docs.renderedfits.com
- Email: support@renderedfits.com
- GitHub Issues: https://github.com/rendered-fits/widget/issues

## License

Proprietary - See LICENSE file for details

## Changelog

### v1.0.0 (2024-01-15)
- Initial release
- Try-on button with animations
- Photo upload with camera support
- AI-powered virtual try-on
- Size recommendations
- Mobile-responsive design
