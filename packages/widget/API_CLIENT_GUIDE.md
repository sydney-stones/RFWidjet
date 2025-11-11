# API Client Implementation Guide

Complete documentation for the Rendered Fits Widget API Client with retry logic, exponential backoff, and analytics tracking.

## Features

✅ **Retry Logic** - Automatic retry with exponential backoff (3 attempts)
✅ **Error Handling** - Comprehensive error types with user-friendly messages
✅ **Analytics Tracking** - Fire-and-forget event tracking
✅ **Type Safety** - Full TypeScript support
✅ **Network Resilience** - Handles network failures gracefully

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Widget UI Layer                      │
│  (Button, Modal, Upload, Loading, Result components)    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                   API Client Layer                       │
│  - uploadPhoto()                                         │
│  - generateTryon()                                       │
│  - trackEvent()                                          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Fetch with Retry Logic                      │
│  Attempt 1 ──fail──> Wait 1s  ──> Attempt 2             │
│  Attempt 2 ──fail──> Wait 2s  ──> Attempt 3             │
│  Attempt 3 ──fail──> Throw Error                        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│            Backend API (Express + Gemini)                │
│  POST /api/v1/tryons/generate                            │
│  POST /api/analytics/events                              │
└─────────────────────────────────────────────────────────┘
```

## Core Methods

### 1. uploadPhoto()

Uploads customer photo to the backend. Currently converts to base64 for inline transmission.

**Signature:**
```typescript
async uploadPhoto(file: File, apiKey?: string): Promise<string>
```

**Parameters:**
- `file` - Image file to upload
- `apiKey` - Optional API key override

**Returns:** Base64-encoded photo string

**Example:**
```typescript
const apiClient = new ApiClient('rfts_xxxxx')
const photoBase64 = await apiClient.uploadPhoto(imageFile)
console.log('Photo uploaded:', photoBase64.length, 'characters')
```

**Error Handling:**
```typescript
try {
  const photoUrl = await apiClient.uploadPhoto(file)
} catch (error) {
  if (error instanceof ApiError) {
    console.error('Upload failed:', error.getUserMessage())
  }
}
```

### 2. generateTryon()

Generates virtual try-on using AI. Includes automatic retry logic.

**Signature:**
```typescript
async generateTryon(
  photoUrl: string,
  productId: string,
  apiKey?: string
): Promise<TryonResult>
```

**Parameters:**
- `photoUrl` - Customer photo (base64 or URL)
- `productId` - Product ID to try on
- `apiKey` - Optional API key override

**Returns:**
```typescript
interface TryonResult {
  imageUrl: string           // Generated try-on image URL
  tryonId: string           // Try-on event ID
  recommendedSize?: string  // AI size recommendation
  processingTimeMs: number  // Processing time
  metadata?: any            // Additional metadata
}
```

**Example:**
```typescript
const result = await apiClient.generateTryon(
  photoBase64,
  'product_123'
)

console.log('Try-on generated:', result.imageUrl)
console.log('Recommended size:', result.recommendedSize)
console.log('Processing time:', result.processingTimeMs, 'ms')
```

**Full Workflow:**
```typescript
async function performTryOn(imageFile: File, productId: string) {
  const apiClient = new ApiClient('rfts_xxxxx')

  try {
    // Step 1: Upload photo
    const photoUrl = await apiClient.uploadPhoto(imageFile)

    // Step 2: Generate try-on
    const result = await apiClient.generateTryon(photoUrl, productId)

    // Step 3: Display result
    displayTryOnResult(result)

    return result
  } catch (error) {
    if (error instanceof ApiError) {
      handleTryOnError(error)
    }
    throw error
  }
}
```

### 3. trackEvent()

Tracks analytics events. Fire-and-forget - never throws errors.

**Signature:**
```typescript
async trackEvent(event: AnalyticsEvent): Promise<void>
```

**Event Types:**
```typescript
interface AnalyticsEvent {
  eventType:
    | 'button_clicked'        // Try-on button clicked
    | 'upload_started'        // Photo upload initiated
    | 'tryon_generated'       // Try-on successfully generated
    | 'add_to_cart_clicked'   // Add to cart clicked from result
    | 'error_occurred'        // Error occurred
  productId?: string
  tryonId?: string
  errorMessage?: string
  metadata?: Record<string, any>
}
```

**Examples:**

**Button Click:**
```typescript
apiClient.trackEvent({
  eventType: 'button_clicked',
  productId: 'product_123'
})
```

**Upload Started:**
```typescript
apiClient.trackEvent({
  eventType: 'upload_started',
  productId: 'product_123',
  metadata: {
    fileSize: file.size,
    fileType: file.type
  }
})
```

**Try-On Generated:**
```typescript
apiClient.trackEvent({
  eventType: 'tryon_generated',
  productId: 'product_123',
  tryonId: result.tryonId,
  metadata: {
    processingTimeMs: result.processingTimeMs,
    recommendedSize: result.recommendedSize
  }
})
```

**Add to Cart:**
```typescript
apiClient.trackEvent({
  eventType: 'add_to_cart_clicked',
  productId: 'product_123',
  metadata: {
    recommendedSize: 'M'
  }
})
```

**Error Occurred:**
```typescript
apiClient.trackEvent({
  eventType: 'error_occurred',
  productId: 'product_123',
  errorMessage: 'Network timeout',
  metadata: {
    status: 0,
    isRateLimit: false,
    isAuth: false
  }
})
```

## Retry Logic

### Configuration

```typescript
interface RetryConfig {
  maxRetries: number    // Default: 3
  baseDelay: number     // Default: 1000ms
  maxDelay: number      // Default: 10000ms
}
```

### Exponential Backoff Algorithm

```
Delay = min(baseDelay * 2^attempt + jitter, maxDelay)

Attempt 0: ~1000ms  (1s)
Attempt 1: ~2000ms  (2s)
Attempt 2: ~4000ms  (4s)
```

**Jitter:** Random 0-1000ms added to prevent thundering herd

### Retryable Errors

The client automatically retries on:

- **5xx Server Errors** (500, 502, 503, 504)
- **Network Errors** (connection timeout, DNS failure)
- **Status 0** (Network unreachable)

### Non-Retryable Errors

No retry for:

- **4xx Client Errors** (400, 401, 403, 404)
- **Rate Limiting** (429) - User action required
- **Validation Errors** (400) - Invalid input

### Example Retry Flow

```
Request Attempt 1
  ↓
  ✗ Network Error (Status 0)
  ↓
Wait 1000ms + jitter
  ↓
Request Attempt 2
  ↓
  ✗ Server Error (Status 503)
  ↓
Wait 2000ms + jitter
  ↓
Request Attempt 3
  ↓
  ✓ Success (Status 200)
  ↓
Return Response
```

## Error Handling

### ApiError Class

```typescript
class ApiError extends Error {
  status: number          // HTTP status code
  data: any              // Response data

  // Helper methods
  isRateLimitError(): boolean   // Check if 429
  isAuthError(): boolean        // Check if 401/403
  isValidationError(): boolean  // Check if 400
  getUserMessage(): string      // User-friendly message
}
```

### User-Friendly Error Messages

```typescript
const error = new ApiError('Invalid API key', 401, null)

console.log(error.getUserMessage())
// Output: "Invalid API key. Please check your configuration."
```

**Error Message Mapping:**

| Status | Error Type | User Message |
|--------|-----------|--------------|
| 429 | Rate Limit | "You've reached your monthly try-on limit..." |
| 401/403 | Authentication | "Invalid API key. Please check your configuration." |
| 400 | Validation | Original error message |
| 0 | Network | "Unable to connect to the server..." |
| 5xx | Server | "Server error. Please try again later." |

### Comprehensive Error Handling

```typescript
try {
  const result = await apiClient.generateTryon(photo, productId)
  showResult(result)
} catch (error) {
  if (error instanceof ApiError) {
    if (error.isRateLimitError()) {
      // Show upgrade prompt
      showUpgradeModal()
    } else if (error.isAuthError()) {
      // Show configuration error
      showConfigError()
    } else if (error.isValidationError()) {
      // Show validation message
      showValidationError(error.message)
    } else if (error.status >= 500) {
      // Show retry option
      showRetryPrompt()
    } else {
      // Generic error
      showErrorMessage(error.getUserMessage())
    }
  } else {
    // Unknown error
    console.error('Unexpected error:', error)
    showGenericError()
  }
}
```

## TypeScript Types

### Request Types

```typescript
interface TryOnRequest {
  apiKey: string
  customerId?: string
  customerPhoto: string // base64 or URL
  productId: string
  options?: {
    quality?: 'standard' | 'hd'
    saveToProfile?: boolean
  }
}
```

### Response Types

```typescript
interface TryOnResponse {
  success: boolean
  tryonId: string
  imageUrl: string
  recommendedSize?: string
  usageRemaining: number
  processingTimeMs: number
  metadata: {
    customerId: string
    productId: string
    productName: string
    quality: string
  }
}

interface TryonResult {
  imageUrl: string
  tryonId: string
  recommendedSize?: string
  processingTimeMs: number
  metadata?: any
}
```

## Widget Integration

### Complete Flow

```typescript
class RenderedFitsWidget {
  private apiClient: ApiClient

  async generateTryOn() {
    if (!this.currentPhotoDataUrl) return

    // Show loading
    this.showLoadingView()

    try {
      // Call API with retry logic
      const result = await this.apiClient.generateTryon(
        this.currentPhotoDataUrl,
        this.config.productId
      )

      // Track success (fire-and-forget)
      this.apiClient.trackEvent({
        eventType: 'tryon_generated',
        productId: this.config.productId,
        tryonId: result.tryonId,
        metadata: {
          processingTimeMs: result.processingTimeMs,
          recommendedSize: result.recommendedSize
        }
      }).catch(() => {}) // Never throw

      // Show result
      this.showResultView(result)

    } catch (error) {
      // Track error (fire-and-forget)
      this.apiClient.trackEvent({
        eventType: 'error_occurred',
        productId: this.config.productId,
        errorMessage: error.message
      }).catch(() => {})

      // Show error UI
      this.showError(error.getUserMessage())
    }
  }
}
```

## Testing

### Unit Tests

```typescript
describe('ApiClient', () => {
  test('should retry on network error', async () => {
    const client = new ApiClient('test_key')

    // Mock fetch to fail twice, then succeed
    let attempts = 0
    global.fetch = jest.fn(() => {
      attempts++
      if (attempts < 3) {
        throw new TypeError('Network error')
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} })
      })
    })

    const result = await client.generateTryon('photo', 'product')
    expect(attempts).toBe(3)
    expect(result).toBeDefined()
  })

  test('should not retry on validation error', async () => {
    const client = new ApiClient('test_key')

    global.fetch = jest.fn(() => Promise.resolve({
      ok: false,
      status: 400,
      json: () => Promise.resolve({
        success: false,
        error: 'Invalid input'
      })
    }))

    await expect(client.generateTryon('photo', 'product')).rejects.toThrow()
    expect(global.fetch).toHaveBeenCalledTimes(1) // No retry
  })
})
```

### Integration Testing

```bash
# Start API server
cd packages/api && npm run dev

# Open demo page
open packages/widget/demo.html

# Test flow:
# 1. Click "Try On Me" button
# 2. Upload photo
# 3. Click "Generate Try-On"
# 4. Verify result displays
# 5. Check console for logs
```

## Performance Considerations

**Bundle Size:** 45KB minified (under 50KB target)

**API Call Timing:**
- Photo upload: ~100ms (base64 conversion)
- Try-on generation: 2-5s (AI processing)
- Analytics tracking: <10ms (fire-and-forget)

**Retry Impact:**
- Worst case: 3 attempts * 4s = 12s total
- Best case: 1 attempt = 2-5s
- Average: 1-2 attempts = 3-7s

**Optimization Tips:**
1. Use caching for repeat try-ons
2. Compress images before upload
3. Implement request deduplication
4. Add loading indicators during retries

## Troubleshooting

### "Network error" on localhost

**Problem:** CORS policy blocking requests

**Solution:**
```javascript
// Start API with CORS enabled
CORS_ORIGIN=* npm run dev

// Or update server.ts cors config
const corsOptions = {
  origin: '*',  // Allow all origins
  credentials: true
}
```

### Retries exhausted

**Problem:** All 3 retry attempts failed

**Solution:**
1. Check API server is running
2. Verify network connectivity
3. Check API server logs for errors
4. Increase retry count temporarily

### Analytics not tracking

**Problem:** Events not appearing in dashboard

**Solution:**
1. Check browser console for errors
2. Verify analytics endpoint exists
3. Check network tab for failed requests
4. Ensure keepalive is supported

## Best Practices

1. **Always use try-catch** around API calls
2. **Track errors** for debugging
3. **Show loading states** during API calls
4. **Provide retry options** to users on failure
5. **Cache results** when possible
6. **Validate inputs** before API calls
7. **Use fire-and-forget** for analytics
8. **Monitor retry rates** in production

## Next Steps

- [ ] Implement request caching
- [ ] Add request deduplication
- [ ] Support batch operations
- [ ] Add WebSocket support for real-time updates
- [ ] Implement offline queue
- [ ] Add request cancellation
- [ ] Support custom retry strategies
