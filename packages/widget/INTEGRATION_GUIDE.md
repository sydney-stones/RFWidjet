# Widget Integration Guide

Step-by-step guide for integrating the Rendered Fits widget into your e-commerce store.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Getting Your API Key](#getting-your-api-key)
- [Basic Integration](#basic-integration)
- [Platform-Specific Guides](#platform-specific-guides)
  - [Shopify](#shopify)
  - [WooCommerce](#woocommerce)
  - [Magento](#magento)
  - [Custom Platform](#custom-platform)
- [Testing](#testing)
- [Going Live](#going-live)

## Prerequisites

Before integrating the widget, ensure you have:

1. ✅ Active Rendered Fits account
2. ✅ API key from your dashboard
3. ✅ Product IDs synced with our system
4. ✅ Test mode enabled for development

## Getting Your API Key

1. Log in to [dashboard.renderedfits.com](https://dashboard.renderedfits.com)
2. Navigate to **Settings → API Keys**
3. Click **"Generate New Key"**
4. Copy your API key (starts with `rfts_`)
5. ⚠️ Keep it secret! Never commit to Git

## Basic Integration

### Step 1: Add the Script

Add this snippet before the closing `</body>` tag:

```html
<script src="https://cdn.renderedfits.com/widget/v1/widget.min.js"></script>
```

### Step 2: Initialize the Widget

Add initialization code after the script tag:

```html
<script>
  RenderedFits.init({
    apiKey: 'rfts_your_api_key_here',
    productId: 'product_123'
  })
</script>
```

### Step 3: Test

1. Open your product page
2. Look for the "Try On Me" button
3. Click it and upload a photo
4. Verify the try-on generates successfully

## Platform-Specific Guides

### Shopify

#### Method 1: Theme Customization (Recommended)

1. **Edit Product Template**
   - Go to **Online Store → Themes**
   - Click **Actions → Edit code**
   - Open `sections/product-template.liquid`

2. **Add Widget Script**

   Before `</div>` of the product form, add:

   ```liquid
   {% comment %} Rendered Fits Widget {% endcomment %}
   <script src="https://cdn.renderedfits.com/widget/v1/widget.min.js"></script>
   <script>
     RenderedFits.init({
       apiKey: '{{ shop.metafields.renderedfits.api_key }}',
       productId: '{{ product.id }}',
       buttonOptions: {
         position: 'before-add-to-cart',
         style: 'primary'
       },
       onAddToCart: () => {
         document.querySelector('[name="add"]').click()
       }
     })
   </script>
   ```

3. **Store API Key in Metafields**
   - Install **Metafields Editor** app
   - Add namespace: `renderedfits`
   - Add key: `api_key`
   - Add your API key as value

4. **Save and Test**

#### Method 2: App Block (Theme 2.0)

If using a Theme 2.0 compatible theme:

1. Go to **Customize Theme**
2. On product page, click **Add Section**
3. Select **Custom Liquid**
4. Paste the widget code
5. Save

### WooCommerce

#### Installation via Functions

1. **Edit functions.php**

   Go to **Appearance → Theme File Editor** and open `functions.php`

2. **Add Widget Code**

   ```php
   add_action('woocommerce_after_add_to_cart_button', function() {
     global $product;
     $api_key = get_option('renderedfits_api_key');

     if (!$api_key) {
       return;
     }
     ?>
     <script src="https://cdn.renderedfits.com/widget/v1/widget.min.js"></script>
     <script>
       RenderedFits.init({
         apiKey: '<?php echo esc_js($api_key); ?>',
         productId: '<?php echo esc_js($product->get_id()); ?>',
         buttonOptions: {
           position: 'after-add-to-cart'
         }
       })
     </script>
     <?php
   });
   ```

3. **Store API Key**

   Add to `wp-config.php` or use Settings API:

   ```php
   // In functions.php
   add_action('admin_init', function() {
     register_setting('general', 'renderedfits_api_key', [
       'type' => 'string',
       'sanitize_callback' => 'sanitize_text_field'
     ]);

     add_settings_field(
       'renderedfits_api_key',
       'Rendered Fits API Key',
       function() {
         $value = get_option('renderedfits_api_key');
         echo '<input type="text" name="renderedfits_api_key" value="' .
              esc_attr($value) . '" class="regular-text">';
       },
       'general'
     );
   });
   ```

4. **Add API Key**
   - Go to **Settings → General**
   - Find "Rendered Fits API Key"
   - Enter your key and save

### Magento

#### Module Installation

1. **Create Custom Module**

   Create `app/code/RenderedFits/Widget/registration.php`:

   ```php
   <?php
   \Magento\Framework\Component\ComponentRegistrar::register(
     \Magento\Framework\Component\ComponentRegistrar::MODULE,
     'RenderedFits_Widget',
     __DIR__
   );
   ```

2. **Create module.xml**

   Create `app/code/RenderedFits/Widget/etc/module.xml`:

   ```xml
   <?xml version="1.0"?>
   <config xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
     <module name="RenderedFits_Widget" setup_version="1.0.0"/>
   </config>
   ```

3. **Create Block Template**

   Create `app/code/RenderedFits/Widget/view/frontend/templates/widget.phtml`:

   ```php
   <?php
   $apiKey = $this->getConfig('renderedfits/general/api_key');
   $product = $this->getProduct();
   ?>
   <script src="https://cdn.renderedfits.com/widget/v1/widget.min.js"></script>
   <script>
     RenderedFits.init({
       apiKey: '<?= $escaper->escapeJs($apiKey) ?>',
       productId: '<?= $escaper->escapeJs($product->getId()) ?>'
     })
   </script>
   ```

4. **Enable Module**

   ```bash
   php bin/magento module:enable RenderedFits_Widget
   php bin/magento setup:upgrade
   php bin/magento cache:flush
   ```

### Custom Platform

For any other platform:

1. **Locate Product Template**
   - Find the file that renders your product pages
   - Usually named `product.html`, `product-detail.php`, etc.

2. **Add Widget Code**

   ```html
   <script src="https://cdn.renderedfits.com/widget/v1/widget.min.js"></script>
   <script>
     RenderedFits.init({
       apiKey: 'YOUR_API_KEY',
       productId: '<?= $product->id ?>' // Your product ID variable
     })
   </script>
   ```

3. **Dynamic Product IDs**

   Ensure `productId` is dynamically set based on the current product:

   - **PHP**: `<?= $product->id ?>`
   - **Python/Django**: `{{ product.id }}`
   - **Ruby/Rails**: `<%= @product.id %>`
   - **JavaScript**: Use data attributes or API calls

## Testing

### Test Checklist

Before going live, verify:

- [ ] Button appears on product page
- [ ] Button positioned correctly
- [ ] Clicking button opens modal
- [ ] Photo upload works (file and camera)
- [ ] Try-on generates successfully
- [ ] Recommended size displays
- [ ] "Add to Cart" button works
- [ ] Mobile responsive
- [ ] No console errors
- [ ] Performance acceptable

### Test Mode

Use test API key during development:

```javascript
RenderedFits.init({
  apiKey: 'rfts_test_xxxxx', // Test key
  productId: 'test_product',
  baseUrl: 'https://staging-api.renderedfits.com' // Staging environment
})
```

### Debug Mode

Enable verbose logging:

```javascript
// Add before initialization
window.RF_DEBUG = true

RenderedFits.init({
  apiKey: 'rfts_xxxxx',
  productId: 'product_123'
})
```

Check console for detailed logs.

## Going Live

### Pre-Launch Checklist

- [ ] Replace test API key with production key
- [ ] Test on production environment
- [ ] Verify billing plan supports expected traffic
- [ ] Set up analytics tracking
- [ ] Add error monitoring
- [ ] Test on multiple devices/browsers

### Production Configuration

```javascript
RenderedFits.init({
  apiKey: 'rfts_live_xxxxx', // Production key
  productId: productId,

  // Analytics integration
  onSuccess: (result) => {
    // Google Analytics
    gtag('event', 'virtual_tryon_success', {
      product_id: result.metadata.productId,
      processing_time: result.processingTimeMs
    })

    // Facebook Pixel
    fbq('trackCustom', 'VirtualTryOn', {
      product_id: result.metadata.productId
    })
  },

  onError: (error) => {
    // Error tracking (Sentry, LogRocket, etc.)
    Sentry.captureException(new Error(`Widget error: ${error}`))
  }
})
```

### Performance Optimization

**Async Loading** (Recommended)

```html
<script async src="https://cdn.renderedfits.com/widget/v1/widget.min.js"></script>
<script>
  window.addEventListener('load', () => {
    RenderedFits.init({
      apiKey: 'rfts_xxxxx',
      productId: 'product_123'
    })
  })
</script>
```

**Conditional Loading**

Only load on applicable product pages:

```javascript
// Only load for clothing products
if (product.category === 'clothing' && product.hasImages) {
  RenderedFits.init({
    apiKey: 'rfts_xxxxx',
    productId: product.id
  })
}
```

## Support

Need help?

- 📖 **Documentation**: https://docs.renderedfits.com
- 💬 **Live Chat**: Available in dashboard
- 📧 **Email**: support@renderedfits.com
- 🐛 **Bug Reports**: https://github.com/rendered-fits/widget/issues

## Examples

See complete integration examples:

- [Shopify Demo Store](https://demo-shopify.renderedfits.com)
- [WooCommerce Demo](https://demo-woo.renderedfits.com)
- [Custom HTML/JS Demo](https://codepen.io/renderedfits/pen/xxxxx)
