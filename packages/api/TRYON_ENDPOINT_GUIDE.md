# Virtual Try-On Generation Endpoint

## Endpoint

```
POST /api/v1/tryons/generate
```

The core endpoint for generating AI-powered virtual try-on images.

## Request Format

### Headers
```
Content-Type: application/json
```

### Request Body

```json
{
  "apiKey": "rfts_your_merchant_api_key",
  "customerId": "optional_customer_id",
  "customerPhoto": "base64_encoded_image_or_url",
  "productId": "product_id_from_database",
  "options": {
    "quality": "standard",
    "saveToProfile": false
  }
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `apiKey` | string | ✅ Yes | Merchant API key (starts with `rfts_`) |
| `customerId` | string | ❌ No | Existing customer ID for tracking |
| `customerPhoto` | string | ✅ Yes | Base64-encoded image or HTTP(S) URL |
| `productId` | string | ✅ Yes | Product ID from your database |
| `options.quality` | string | ❌ No | `"standard"` or `"hd"` (default: `"standard"`) |
| `options.saveToProfile` | boolean | ❌ No | Save photo to customer profile (default: `false`) |

### Customer Photo Formats

**Base64 with data URI:**
```json
{
  "customerPhoto": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAA..."
}
```

**Base64 without data URI:**
```json
{
  "customerPhoto": "/9j/4AAQSkZJRgABAQAA..."
}
```

**HTTP(S) URL:**
```json
{
  "customerPhoto": "https://example.com/customer-photo.jpg"
}
```

### Image Requirements

- **Formats**: JPEG, PNG, WebP
- **Max Size**: 5MB
- **Recommended**: Clear, front-facing photo of person
- **Background**: Any (AI will replace with studio background)

## Response Format

### Success Response (200 OK)

```json
{
  "success": true,
  "tryonId": "clx1234567890abcdef",
  "imageUrl": "http://localhost:3001/uploads/outputs/tryon-1699999999999.jpg",
  "recommendedSize": "M",
  "usageRemaining": 450,
  "processingTimeMs": 3456,
  "metadata": {
    "customerId": "clx9876543210fedcba",
    "productId": "clxprod123456789",
    "productName": "Elegant Silk Evening Dress",
    "quality": "standard"
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Always `true` for successful responses |
| `tryonId` | string | Unique ID for this try-on event |
| `imageUrl` | string | URL to the generated try-on image |
| `recommendedSize` | string | AI-recommended size (XS, S, M, L, XL) |
| `usageRemaining` | number | Try-ons remaining in current billing period |
| `processingTimeMs` | number | Time taken to generate (milliseconds) |
| `metadata.customerId` | string | Customer ID (new or existing) |
| `metadata.productId` | string | Product ID used |
| `metadata.productName` | string | Product name |
| `metadata.quality` | string | Quality setting used |

## Error Responses

### 400 Bad Request

Invalid input data:

```json
{
  "success": false,
  "error": "Invalid customer photo: Image size exceeds 5MB limit"
}
```

Common causes:
- Missing required fields
- Invalid image format
- Image too large (>5MB)
- Invalid base64 encoding
- Product not found

### 401 Unauthorized

Invalid or expired credentials:

```json
{
  "success": false,
  "error": "Invalid API key"
}
```

Common causes:
- Invalid API key
- Account suspended
- Subscription canceled
- Payment past due

### 429 Too Many Requests

Monthly quota exceeded:

```json
{
  "success": false,
  "error": "Monthly try-on limit exceeded (500 try-ons). Please upgrade your plan or wait until next month."
}
```

Plan limits:
- **ATELIER**: 500 try-ons/month
- **MAISON**: 2,000 try-ons/month
- **COUTURE**: 5,000 try-ons/month

### 500 Internal Server Error

Server-side errors:

```json
{
  "success": false,
  "error": "AI generation failed: Rate limit exceeded"
}
```

Common causes:
- AI service unavailable
- Database connection error
- Image processing failure

## Processing Flow

1. **Authentication** (50ms)
   - Verify API key
   - Check subscription status
   - Verify usage limits

2. **Input Validation** (100ms)
   - Validate customer photo format
   - Check image size (<5MB)
   - Fetch product details

3. **Image Processing** (200ms)
   - Download/decode customer photo
   - Download product image
   - Validate image formats

4. **AI Generation** (2-5 seconds)
   - Call Gemini 2.5 Flash API
   - Analyze customer and product
   - Generate virtual try-on
   - Extract size recommendation

5. **Storage** (300ms)
   - Save input image
   - Save generated output
   - Record in database

6. **Usage Tracking** (100ms)
   - Update merchant usage counter
   - Log analytics event
   - Calculate remaining quota

**Total Time**: ~3-6 seconds average

## Example Usage

### cURL

```bash
curl -X POST http://localhost:3001/api/v1/tryons/generate \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "rfts_abc123xyz789",
    "customerPhoto": "https://example.com/customer.jpg",
    "productId": "clxprod123456789",
    "options": {
      "quality": "hd",
      "saveToProfile": true
    }
  }'
```

### JavaScript (fetch)

```javascript
const response = await fetch('http://localhost:3001/api/v1/tryons/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    apiKey: 'rfts_abc123xyz789',
    customerPhoto: customerPhotoBase64,
    productId: 'clxprod123456789',
    options: {
      quality: 'standard',
      saveToProfile: false
    }
  })
})

const data = await response.json()

if (data.success) {
  console.log('Try-on generated:', data.imageUrl)
  console.log('Recommended size:', data.recommendedSize)
  console.log('Usage remaining:', data.usageRemaining)
} else {
  console.error('Error:', data.error)
}
```

### Python (requests)

```python
import requests
import base64

# Load and encode image
with open('customer.jpg', 'rb') as f:
    photo_base64 = base64.b64encode(f.read()).decode('utf-8')

response = requests.post(
    'http://localhost:3001/api/v1/tryons/generate',
    json={
        'apiKey': 'rfts_abc123xyz789',
        'customerPhoto': f'data:image/jpeg;base64,{photo_base64}',
        'productId': 'clxprod123456789',
        'options': {
            'quality': 'hd',
            'saveToProfile': True
        }
    }
)

data = response.json()
print(f"Success: {data['success']}")
print(f"Image URL: {data.get('imageUrl')}")
print(f"Recommended Size: {data.get('recommendedSize')}")
```

## Rate Limiting

- **Plan-based monthly limits** enforced
- **Response headers** indicate usage:
  - `X-RateLimit-Limit`: Monthly limit
  - `X-RateLimit-Remaining`: Remaining try-ons
  - `X-RateLimit-Reset`: Reset date (end of month)

## Best Practices

### Image Quality
- Use **high-resolution** customer photos (min 512x512px)
- Ensure **good lighting** and **clear visibility**
- **Front-facing** photos work best
- **Full body** or **upper body** shots recommended

### Error Handling
```javascript
try {
  const response = await generateTryOn(data)

  if (!response.success) {
    // Handle specific errors
    if (response.error.includes('quota exceeded')) {
      showUpgradePrompt()
    } else if (response.error.includes('Invalid image')) {
      showImageUploadHelp()
    } else {
      showGenericError(response.error)
    }
  }
} catch (error) {
  // Handle network errors
  showNetworkError()
}
```

### Performance
- **Cache** customer photos if used multiple times
- Use **standard quality** for previews, **HD** for final
- **Compress** images before upload (but stay >512px)
- Consider **webhooks** for async processing (future)

### Security
- **Never expose** API keys in client-side code
- **Proxy** requests through your backend
- **Validate** image URLs to prevent SSRF
- **Rate limit** your own frontend

## Analytics Tracking

Every try-on generates analytics events:

1. `TRY_ON_STARTED` - When request received
2. `TRY_ON_COMPLETED` - On successful generation
3. `TRY_ON_FAILED` - On any error

Access analytics via:
```
GET /api/analytics/events?eventType=TRY_ON_COMPLETED
```

## Retrieving Try-On Details

```
GET /api/v1/tryons/{tryonId}?apiKey={your_api_key}
```

Response includes:
- Generated image URL
- Processing time
- Product details
- Customer information
- Conversion status

## Webhook Integration

Track conversions by calling:
```
PATCH /api/tryons/{tryonId}/conversion
```

When customer purchases the product after trying it on.

## Future Enhancements

- [ ] Batch processing (multiple products at once)
- [ ] Video try-on support
- [ ] Real-time streaming
- [ ] Custom backgrounds
- [ ] Body measurement extraction
- [ ] Fit prediction improvements

## Support

For issues or questions:
- Check error message for specific guidance
- Review this documentation
- Contact support with `tryonId` for debugging

---

**Production Note**: The current implementation uses Gemini AI for analysis and returns a placeholder image. Integration with actual image generation models (Imagen, Stable Diffusion, etc.) is required for production use.
