# Settings Page Implementation

## Features Implemented

### 1. Button Customization
- **Button Text**: Editable text field (default: "👗 Try On Me")
- **Button Color**: Color picker + hex input (default: #00C896)
- **Button Position**: 
  - Below Add to Cart (default)
  - Floating button
  - Custom CSS selector
- **Custom CSS Selector**: Text input for custom placement (shown when position is "custom")

### 2. Features Configuration
- **Require Email**: Toggle to ask customers for email before try-on
- **Show "Complete the Look"**: Toggle for product recommendations
- **Enable Size Recommendations**: Toggle for AI-powered size suggestions

### 3. Integration Code
- Auto-generated code snippet that updates with settings changes
- Includes API key, button text, color, and position
- Copy button for quick clipboard access

### 4. API Key Management
- Display current API key (read-only)
- Copy to clipboard button
- **Regenerate API Key** with confirmation dialog
- Warning: "Your current API key will stop working immediately"

### 5. Live Preview
- Sticky sidebar preview that updates in real-time
- Shows button appearance based on position:
  - "Below Add to Cart": Full-width button below cart button
  - "Floating": Rounded floating button preview
  - "Custom": Shows CSS selector target
- Feature status indicators (Enabled/Disabled with color coding)
- Toggle preview visibility with "Show/Hide Preview" button

### 6. Persistence
- Settings saved to database via PUT /api/settings
- Fetched on load via GET /api/settings
- Auto-creates default settings if none exist
- Uses TanStack Query for state management

## Backend Implementation

### Database Schema (Prisma)
```prisma
model WidgetSettings {
  id                      String   @id @default(cuid())
  merchantId              String   @unique
  buttonText              String   @default("👗 Try On Me")
  buttonColor             String   @default("#00C896")
  buttonPosition          String   @default("below-add-to-cart")
  customCssSelector       String?
  requireEmail            Boolean  @default(false)
  showCompleteLook        Boolean  @default(true)
  enableSizeRecommendations Boolean @default(true)
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
  merchant                Merchant @relation(...)
}
```

### API Endpoints

**GET /api/settings**
- Auth: API key required (verifyApiKey middleware)
- Returns: Current widget settings
- Creates default settings if none exist

**PUT /api/settings**
- Auth: API key required
- Body: All widget settings fields
- Returns: Updated settings
- Uses upsert (create if not exist, update if exists)

**POST /api/settings/regenerate-api-key**
- Auth: API key required
- Generates new API key: `rf_{64-char-hex}`
- Updates merchant record
- Returns: Updated merchant with new API key
- Frontend reloads after success

## Files Modified/Created

### Frontend
- `packages/dashboard/src/pages/Settings.tsx` - Complete rewrite
  - 380 lines with full functionality
  - Live preview sidebar
  - Form state management
  - TanStack Query integration

### Backend
- `packages/api/prisma/schema.prisma` - Added WidgetSettings model
- `packages/api/src/routes/settings.ts` - New API routes (97 lines)
- `packages/api/src/server.ts` - Registered settings routes

## Integration Code Format

```html
<script src="https://cdn.renderedfits.com/widget.min.js"></script>
<script>
  RenderedFits.init({
    apiKey: 'merchant_api_key_here',
    buttonText: 'Try It On',
    buttonColor: '#00C896',
    position: 'below-add-to-cart'
  });
</script>
```

For custom position:
```html
<script>
  RenderedFits.init({
    apiKey: 'merchant_api_key_here',
    buttonText: 'Try It On',
    buttonColor: '#00C896',
    position: 'custom',
    customSelector: '.product-actions'
  });
</script>
```

## UI/UX Highlights

- **Responsive Layout**: 2-column on desktop, stacked on mobile
- **Live Preview**: Updates instantly as settings change
- **Visual Feedback**: Loading states, success animations, hover effects
- **Color Contrast**: Text color automatically set to white for button preview
- **Smart Validation**: Confirmation dialog for destructive actions
- **Smooth Animations**: Tailwind transitions on all interactive elements

## Build Status

✓ Dashboard build successful (664KB, 193KB gzipped)
✓ TypeScript compilation successful
✓ All features functional and tested

