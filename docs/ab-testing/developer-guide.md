# A/B Testing - Developer Implementation Guide

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Adding Conversion Tracking](#adding-conversion-tracking)
- [Tracking Implementation Details](#tracking-implementation-details)
- [Testing Locally](#testing-locally)
- [Extending the System](#extending-the-system)
- [Code Reference](#code-reference)
- [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                          App.tsx                                 │
│  • Initializes landingPageStore.fetchLandingPage() on mount     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   landingPageStore.ts                            │
│                                                                   │
│  1. Check localStorage for variant                               │
│     → Key: "variantAssignment"                                   │
│     → Timestamp: "variantAssignmentTimestamp"                    │
│     → Expiration: 30 days                                        │
│                                                                   │
│  2. Validate stored variant                                      │
│     → Is it expired?                                             │
│     → Does it still exist?                                       │
│                                                                   │
│  3. Fetch content from API                                       │
│     → Pass variantId if valid                                    │
│     → Server assigns if none provided                            │
│                                                                   │
│  4. Handle errors                                                │
│     → 404/400: Clear stale variant, retry                        │
│     → Other errors: Propagate to UI                              │
│                                                                   │
│  5. Store returned variant ID                                    │
│     → Save to localStorage                                       │
│     → Timestamp for expiration tracking                          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Server Side                                 │
│                                                                   │
│  • variantsService.ts: Weighted random assignment                │
│  • Reads from: /server/data/variants.json                        │
│  • Content from: /server/data/variant-{id}.json                  │
│  • Returns: Content + _meta.variantId                            │
└─────────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `landingPageStore.ts` | `/packages/ui/src/stores/` | Zustand store managing variant state |
| `useABTestTracking.ts` | `/packages/ui/src/hooks/` | Hook for tracking conversions |
| `useABTestQueryParams.ts` | `/packages/ui/src/hooks/` | Hook for admin variant editing |
| `HomePage.tsx` | `/packages/ui/src/pages/main/` | Tracks views and bounces |
| `variantsService.ts` | `/packages/server/src/rest/landingPage/` | Server-side variant logic |

---

## Adding Conversion Tracking

### Step 1: Identify Conversion Point

Ask yourself:
- Is this a valuable user action?
- Should it count toward variant success?
- Does it happen after the user saw the landing page?

**Examples of conversions:**
- ✅ Account signup
- ✅ Newsletter subscription
- ✅ Contact form submission
- ✅ CTA button click
- ✅ Product add to cart

**Not conversions:**
- ❌ Page scroll
- ❌ Mouse movement
- ❌ Time on page (use bounce rate instead)

### Step 2: Import the Hook

```typescript
import { useABTestTracking } from "hooks";
```

### Step 3: Use the Hook in Component

```typescript
export const YourFormComponent = () => {
    const { trackConversion } = useABTestTracking();

    // Your other hooks...

    const handleSubmit = async (data) => {
        try {
            // 1. Submit your form/action
            await submitForm(data);

            // 2. Track conversion AFTER successful action
            await trackConversion();

            // 3. Show success message
            showSuccessMessage();
        } catch (error) {
            // Handle error - don't track on failure
            handleError(error);
        }
    };

    // Rest of component...
};
```

### Step 4: Implementation Examples

#### Example 1: Form Submission

```typescript
// ContactForm.tsx
import { useABTestTracking } from "hooks";

export const ContactForm = () => {
    const { trackConversion } = useABTestTracking();

    const handleSubmit = async (values) => {
        try {
            await api.submitContactForm(values);

            // Track conversion after successful submission
            await trackConversion();

            showSuccessMessage("Thanks! We'll be in touch.");
        } catch (error) {
            showErrorMessage(error.message);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            {/* Form fields */}
        </form>
    );
};
```

#### Example 2: Button Click (CTA)

```typescript
// Hero.tsx
import { useABTestTracking } from "hooks";

export const Hero = () => {
    const { trackConversion } = useABTestTracking();
    const [, navigate] = useLocation();

    const handleCtaClick = async () => {
        // Track immediately (user showed intent)
        await trackConversion();

        // Navigate to signup
        navigate("/signup");
    };

    return (
        <Button onClick={handleCtaClick}>
            Get Started Free
        </Button>
    );
};
```

#### Example 3: Multi-Step Form

```typescript
// CheckoutFlow.tsx
import { useABTestTracking } from "hooks";

export const CheckoutFlow = () => {
    const { trackConversion } = useABTestTracking();
    const [step, setStep] = useState(1);

    const handleFinalStep = async () => {
        try {
            await processPayment();

            // Only track on final successful step
            await trackConversion();

            showOrderConfirmation();
        } catch (error) {
            handlePaymentError(error);
        }
    };

    // Don't track on intermediate steps
    return <>{/* Multi-step form */}</>;
};
```

### Important Notes

**DO:**
- ✅ Track AFTER action succeeds
- ✅ Use try/catch around submission
- ✅ Only track meaningful actions
- ✅ Track once per successful action

**DON'T:**
- ❌ Track before action completes
- ❌ Track on validation errors
- ❌ Track multiple times for same action
- ❌ Track user intent without completion

---

## Tracking Implementation Details

### View Tracking

**Where:** `HomePage.tsx:60-72`

**Implementation:**
```typescript
const viewTracked = useRef(false);

useEffect(() => {
    if (landingPageData?._meta?.variantId && !viewTracked.current) {
        viewTracked.current = true;
        restApi.trackVariantEvent(landingPageData._meta.variantId, {
            eventType: "view",
        }).catch((err) => {
            handleError(err, "HomePage", "trackViewEvent");
        });
    }
}, [landingPageData?._meta?.variantId]);
```

**Key Points:**
- Uses `useRef` to prevent double-counting
- Tracks on component mount (not on every render)
- Silent failure (doesn't block page load)

### Bounce Tracking

**Where:** `HomePage.tsx:74-107`

**Implementation:**
```typescript
const bounceTracked = useRef(false);
const visitStartTime = useRef(Date.now());

useEffect(() => {
    const handleBeforeUnload = () => {
        const timeOnPage = Date.now() - visitStartTime.current;

        if (timeOnPage < BOUNCE_THRESHOLD_MS &&
            !bounceTracked.current &&
            landingPageData?._meta?.variantId) {

            bounceTracked.current = true;

            // Use sendBeacon for reliability
            const blob = new Blob(
                [JSON.stringify({ eventType: "bounce" })],
                { type: "application/json" }
            );
            navigator.sendBeacon(url, blob);
        }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
}, [landingPageData]);
```

**Key Points:**
- Uses `navigator.sendBeacon()` for reliability during page unload
- 10-second threshold (configurable)
- Explicit content-type for proper JSON parsing

### Conversion Tracking

**Where:** `useABTestTracking.ts:14-26`

**Implementation:**
```typescript
export function useABTestTracking() {
    const data = useLandingPageStore((state) => state.data);

    const trackConversion = useCallback(async () => {
        if (data?._meta?.variantId) {
            try {
                await restApi.trackVariantEvent(data._meta.variantId, {
                    eventType: "conversion",
                });
            } catch (error) {
                handleError(error, "useABTestTracking", "trackConversion");
                // Don't re-throw - conversion tracking shouldn't break user flow
            }
        }
    }, [data]);

    return { trackConversion };
}
```

**Key Points:**
- Checks for variant assignment
- Silent failure (doesn't break user experience)
- Async but can be awaited
- Returns no-op function if no variant assigned

---

## Testing Locally

### Setup Test Variants

1. **Create test variants via admin UI:**
   ```
   - Official: 50%
   - Test A: 50%
   ```

2. **Or manually edit `/packages/server/src/data/variants.json`:**
   ```json
   {
     "variant-homepage-official": {
       "name": "Official Homepage",
       "status": "enabled",
       "trafficAllocation": 50,
       "isOfficial": true,
       "metrics": { "views": 0, "conversions": 0, "bounces": 0 }
     },
     "variant-test-a": {
       "name": "Test A",
       "status": "enabled",
       "trafficAllocation": 50,
       "isOfficial": false,
       "metrics": { "views": 0, "conversions": 0, "bounces": 0 }
     }
   }
   ```

### Force Specific Variant

**Method 1: Clear localStorage and refresh**
```javascript
// In browser console:
localStorage.removeItem('variantAssignment');
localStorage.removeItem('variantAssignmentTimestamp');
location.reload();
```

**Method 2: Manually set variant**
```javascript
// In browser console:
localStorage.setItem('variantAssignment', 'variant-test-a');
localStorage.setItem('variantAssignmentTimestamp', Date.now().toString());
location.reload();
```

**Method 3: Use query param (admin only)**
```
http://localhost:3000/?variantId=variant-test-a
```

### Test Tracking Events

**View Tracking:**
```javascript
// Should fire on page load
// Check Network tab: POST /rest/v1/landing-page/variants/{id}/track
// Body: { "eventType": "view" }
```

**Conversion Tracking:**
```javascript
// Trigger your conversion action (e.g., signup)
// Check Network tab for: POST /rest/v1/landing-page/variants/{id}/track
// Body: { "eventType": "conversion" }
```

**Bounce Tracking:**
```javascript
// Close tab within 10 seconds
// Check Network tab (may need to keep DevTools open)
// Look for: POST with { "eventType": "bounce" }
```

### View Metrics

**API endpoint:**
```
GET /rest/v1/landing-page/variants
```

**Response includes:**
```json
[
  {
    "id": "variant-homepage-official",
    "metrics": {
      "views": 45,
      "conversions": 3,
      "bounces": 12
    }
  }
]
```

---

## Extending the System

### Adding New Event Types

**1. Define type in server:**

`packages/server/src/types/landingPage.ts`:
```typescript
export interface VariantEvent {
    variantId: string;
    eventType: "view" | "conversion" | "bounce" | "custom_event"; // Add here
}
```

**2. Update tracking handler:**

`packages/server/src/rest/landingPage/variantsRoutes.ts`:
```typescript
if (eventType === "custom_event") {
    // Handle your custom event
    // Update metrics accordingly
}
```

**3. Create client hook:**

`packages/ui/src/hooks/useCustomTracking.ts`:
```typescript
export function useCustomTracking() {
    const data = useLandingPageStore((state) => state.data);

    const trackCustomEvent = useCallback(async () => {
        if (data?._meta?.variantId) {
            await restApi.trackVariantEvent(data._meta.variantId, {
                eventType: "custom_event",
            });
        }
    }, [data]);

    return { trackCustomEvent };
}
```

### Adding Custom Metrics

**1. Update variant interface:**

`packages/server/src/types/landingPage.ts`:
```typescript
export interface LandingPageVariant {
    // ... existing fields
    metrics: {
        views: number;
        conversions: number;
        bounces: number;
        customMetric: number; // Add here
    };
}
```

**2. Initialize in variants.json:**
```json
{
  "variant-id": {
    "metrics": {
      "views": 0,
      "conversions": 0,
      "bounces": 0,
      "customMetric": 0
    }
  }
}
```

**3. Update tracking logic:**
```typescript
// In variantsService.ts
if (eventType === "custom") {
    variant.metrics.customMetric += 1;
}
```

### Implementing Time-Based Tracking

**Example: Track time to conversion**

```typescript
export function useTimedConversion() {
    const { trackConversion } = useABTestTracking();
    const startTime = useRef(Date.now());

    const trackTimedConversion = useCallback(async () => {
        const timeToConversion = Date.now() - startTime.current;

        // Track standard conversion
        await trackConversion();

        // Track time separately (custom implementation)
        await restApi.trackCustomMetric({
            metricType: "timeToConversion",
            value: timeToConversion,
        });
    }, [trackConversion]);

    return { trackTimedConversion };
}
```

---

## Code Reference

### File Structure

```
/root/NLN/
├── packages/
│   ├── ui/
│   │   └── src/
│   │       ├── stores/
│   │       │   └── landingPageStore.ts          # Variant assignment & persistence
│   │       ├── hooks/
│   │       │   ├── useABTestTracking.ts         # Conversion tracking hook
│   │       │   ├── useABTestQueryParams.ts      # Admin variant editing
│   │       │   └── useLandingPage.ts            # Access landing page data
│   │       ├── pages/
│   │       │   ├── main/
│   │       │   │   └── HomePage/
│   │       │   │       └── HomePage.tsx         # View & bounce tracking
│   │       │   └── admin/
│   │       │       └── AdminHomepageABTesting/
│   │       │           └── AdminHomepageABTestingNew.tsx  # Variant management UI
│   │       ├── forms/
│   │       │   └── SignUpForm/
│   │       │       └── SignUpForm.tsx           # Conversion: signup
│   │       └── components/
│   │           └── InteractiveElements/
│   │               └── InteractiveElements.tsx  # Conversion: newsletter
│   └── server/
│       └── src/
│           ├── rest/
│           │   └── landingPage/
│           │       ├── variantsRoutes.ts        # API endpoints
│           │       └── variantsService.ts       # Business logic
│           ├── types/
│           │   └── landingPage.ts               # TypeScript interfaces
│           └── data/
│               ├── variants.json                # Variant metadata
│               ├── variant-homepage-official.json  # Variant content
│               └── variant-{id}.json            # Other variant content
```

### Key Constants

```typescript
// Session duration
const VARIANT_SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Bounce threshold
const BOUNCE_THRESHOLD_MS = 10000; // 10 seconds

// Storage keys
const VARIANT_STORAGE_KEY = "variantAssignment";
const VARIANT_TIMESTAMP_KEY = "variantAssignmentTimestamp";
```

### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/rest/v1/landing-page` | Get content (with optional `?variantId=`) |
| GET | `/rest/v1/landing-page/variants` | List all variants |
| POST | `/rest/v1/landing-page/variants` | Create variant |
| PUT | `/rest/v1/landing-page/variants/{id}` | Update variant |
| DELETE | `/rest/v1/landing-page/variants/{id}` | Delete variant |
| POST | `/rest/v1/landing-page/variants/{id}/track` | Track event |
| POST | `/rest/v1/landing-page/variants/{id}/promote` | Promote to official |
| POST | `/rest/v1/landing-page/variants/{id}/toggle` | Enable/disable |

---

## Troubleshooting

### Conversion Not Tracking

**Check:**
1. Is `useABTestTracking` imported?
2. Is `trackConversion()` called AFTER successful action?
3. Is there a variant assigned? (Check `data._meta.variantId`)
4. Check network tab for failed requests
5. Check server logs for errors

**Debug:**
```typescript
const { trackConversion } = useABTestTracking();

const handleSubmit = async () => {
    console.log("Before submission");
    await submitForm();
    console.log("After submission, tracking conversion...");
    await trackConversion();
    console.log("Conversion tracked!");
};
```

### Views Not Incrementing

**Check:**
1. Is HomePage mounting?
2. Is variant ID present in landingPageData?
3. Check `viewTracked.current` ref (should be false initially)
4. Look for errors in console

**Debug:**
```typescript
useEffect(() => {
    console.log("Landing page data:", landingPageData);
    console.log("View tracked?", viewTracked.current);
    console.log("Variant ID:", landingPageData?._meta?.variantId);
}, [landingPageData]);
```

### Bounces Not Tracking

**Check:**
1. Is sendBeacon supported? (Check `navigator.sendBeacon`)
2. Is blob content-type set correctly?
3. Are you leaving within 10 seconds?
4. Check server logs (bounce requests may not show in DevTools)

**Debug:**
```typescript
const handleBeforeUnload = () => {
    console.log("Time on page:", Date.now() - visitStartTime.current);
    console.log("Should track bounce:", timeOnPage < BOUNCE_THRESHOLD_MS);
};
```

### localStorage Issues

**Check:**
1. Is localStorage available? (incognito mode may block)
2. Is storage quota exceeded?
3. Check browser settings

**Debug:**
```javascript
// Browser console:
console.log("Variant:", localStorage.getItem('variantAssignment'));
console.log("Timestamp:", localStorage.getItem('variantAssignmentTimestamp'));
```

---

## Best Practices for Developers

### Performance

**DO:**
- ✅ Use `useCallback` for tracking functions
- ✅ Fail silently (don't block user actions)
- ✅ Use sendBeacon for page unload events
- ✅ Minimize re-renders

**DON'T:**
- ❌ Block UI on tracking failures
- ❌ Track on every render
- ❌ Make tracking synchronous

### Error Handling

```typescript
// Good: Silent failure
await trackConversion().catch((err) => {
    handleError(err, "Component", "action");
    // Don't re-throw
});

// Bad: Breaking user flow
await trackConversion(); // If this fails, user action breaks
```

### Testing

```typescript
// Mock tracking in tests
jest.mock("hooks", () => ({
    useABTestTracking: () => ({
        trackConversion: jest.fn().mockResolvedValue(undefined),
    }),
}));
```

---

## Additional Resources

- [Main README](./README.md) - System overview
- [Admin Guide](./admin-guide.md) - For non-technical users
- [Zustand Documentation](https://github.com/pmndrs/zustand) - State management
- [React Hooks](https://react.dev/reference/react) - React documentation

## Questions?

File an issue or contact the development team with:
- Code snippet
- Expected behavior
- Actual behavior
- Console errors
- Network requests (if relevant)
