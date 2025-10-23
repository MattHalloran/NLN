# Conversion Tracking - Complete Reference

## What is a Conversion?

A **conversion** is any valuable action a user takes that indicates success for your business goals. In A/B testing, conversions are the primary metric for determining which variant performs better.

---

## Current Conversion Points

### 1. Account Signup ✅

**Location:** `SignUpForm.tsx:69`

**What:** User successfully creates an account

**When tracked:** After successful API response from signup endpoint

**Why it matters:** Primary business goal - growing user base

**Code:**
```typescript
const data = await signUp({...});
await trackConversion(); // ← Tracked here
PubSub.get().publishSession({...});
```

**Conditions:**
- ✅ Account created successfully
- ✅ API returned 200 status
- ❌ NOT tracked on validation errors
- ❌ NOT tracked on duplicate email
- ❌ NOT tracked on network failures

---

### 2. Newsletter Subscription ✅

**Location:** `InteractiveElements.tsx:80`

**What:** User submits email for newsletter

**When tracked:** Immediately on form submission (before backend integration)

**Why it matters:** Lead capture - builds email list

**Code:**
```typescript
const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    if (email) {
        await trackConversion(); // ← Tracked here
        setSubscribed(true);
    }
};
```

**Conditions:**
- ✅ Valid email entered
- ✅ Form submitted
- ❌ NOT tracked if email field empty

---

## Planned Conversion Points

### 3. Contact Form Submission (Not Yet Implemented)

**Proposed location:** `ContactForm.tsx` (to be created)

**What:** User submits contact form

**Implementation needed:**
```typescript
import { useABTestTracking } from "hooks";

const handleContactSubmit = async (data) => {
    try {
        await api.submitContactForm(data);
        await trackConversion(); // Add this
        showSuccessMessage();
    } catch (error) {
        handleError(error);
    }
};
```

---

### 4. CTA Button Clicks (Future Enhancement)

**Proposed locations:**
- Hero CTA buttons
- Service showcase "Learn More"
- Navigation bar actions

**Implementation pattern:**
```typescript
const handleCtaClick = async () => {
    await trackConversion();
    navigate("/target-page");
};
```

**Consideration:** May inflate conversion numbers if user doesn't complete signup

---

### 5. Product Interactions (Future)

**Examples:**
- Product page view
- Add to cart
- Purchase complete

**Would require:** E-commerce integration

---

## Conversion Best Practices

### When to Track

**DO track when:**
- ✅ User completes a valuable action
- ✅ Action aligns with business goals
- ✅ Action happens AFTER landing page view
- ✅ You can reliably detect success

**DON'T track when:**
- ❌ Action fails or errors
- ❌ User just shows intent (without completion)
- ❌ Action is trivial (scroll, hover, etc.)
- ❌ You can't reliably detect it

### Implementation Pattern

**✅ Correct Pattern:**
```typescript
const handleAction = async () => {
    try {
        // 1. Perform action
        await performAction();

        // 2. Track AFTER success
        await trackConversion();

        // 3. Show feedback
        showSuccess();
    } catch (error) {
        // Don't track on error
        handleError(error);
    }
};
```

**❌ Incorrect Pattern:**
```typescript
const handleAction = async () => {
    // DON'T: Track before action completes
    await trackConversion();

    try {
        await performAction(); // What if this fails?
        showSuccess();
    } catch (error) {
        handleError(error);
    }
};
```

---

## Conversion Rate Calculation

### Formula

```
Conversion Rate = (Conversions / Views) × 100
```

### Examples

**Example 1: Single Conversion Type**
```
Views: 1,000
Signups: 30
Conversion Rate: 3.0%
```

**Example 2: Multiple Conversion Types**
```
Views: 1,000
Signups: 30
Newsletter: 50
Total Conversions: 80
Conversion Rate: 8.0%
```

**Important:** Multiple conversions from same user count multiple times

---

## Conversion Attribution

### Session-Based Attribution

**Current implementation:**
- User assigned to variant on first visit
- Assignment persists for 30 days
- All conversions in that period attributed to initial variant
- Even if user doesn't convert on first visit

**Example timeline:**
```
Day 1:  User visits → Assigned to Test Variant A
        User browses, doesn't convert
        Tracked: 1 view

Day 3:  User returns (same variant, from localStorage)
        User signs up
        Tracked: 1 view + 1 conversion

Attribution: Test Variant A gets credit
```

### Multi-Device Considerations

**Current limitation:**
- localStorage is device-specific
- Same user on mobile + desktop = 2 different variant assignments
- Conversions attributed to most recent device's variant

**Example:**
```
Mobile:  User sees Variant A → browses
Desktop: User sees Variant B → signs up
Result:  Variant B gets conversion credit (not A)
```

**Future enhancement:** Server-side user ID tracking

---

## Interpreting Conversion Data

### What Good Conversion Rates Look Like

| Industry | Typical Range | Good | Excellent |
|----------|--------------|------|-----------|
| SaaS Landing Page | 2-5% | 5-7% | > 10% |
| E-commerce | 1-3% | 3-5% | > 5% |
| Newsletter Signup | 5-15% | 15-25% | > 25% |
| Free Trial | 10-25% | 25-40% | > 40% |

**Note:** Your mileage may vary based on:
- Traffic source (organic vs paid)
- Product complexity
- Target audience
- Industry norms

### Statistical Significance

**Minimum Requirements:**
- At least 100 conversions per variant
- At least 1-2 weeks of data
- Consistent pattern over time

**Example Analysis:**

```
Variant A (Official):
- 2,000 views
- 60 conversions
- 3.0% conversion rate

Variant B (Test):
- 2,000 views
- 90 conversions
- 4.5% conversion rate
- 50% improvement! 🎉

Confidence: 95% (use online calculator)
Decision: Promote Variant B ✅
```

**Use this calculator:**
https://abtestguide.com/calc/

---

## Conversion Funnel Analysis

### Tracking the Full Funnel

```
Landing Page View (100%)
    ↓ (-40% bounce within 10s)
Engaged Visit (60%)
    ↓ (-50% leave without action)
Interaction (30%)
    ↓ (-67% don't complete)
Conversion (10%)

Final Conversion Rate: 10%
```

### Current Metrics Captured

| Stage | Metric | Location |
|-------|--------|----------|
| Awareness | Views | HomePage mount |
| Interest | Time on page | Via bounce rate (inverse) |
| Consideration | (Not tracked) | N/A |
| Intent | (Not tracked) | N/A |
| Conversion | Signups + Newsletter | Forms |

### Future Enhancements

Add intermediate metrics:
- **Scroll depth:** Did they scroll past hero?
- **CTA visibility:** Did CTA button enter viewport?
- **Form starts:** Did they begin filling signup form?
- **Field completion:** Which fields did they fill?

---

## Debugging Conversions

### Check if Conversion Tracked

**Browser DevTools:**
1. Open Network tab
2. Filter: `track`
3. Perform conversion action
4. Look for: `POST /rest/v1/landing-page/variants/{id}/track`
5. Check request body: `{"eventType": "conversion"}`
6. Status should be: `200 OK`

### Common Issues

**Issue: Conversion not incrementing**

**Check:**
```typescript
// 1. Is hook imported?
import { useABTestTracking } from "hooks"; // ✓

// 2. Is hook used?
const { trackConversion } = useABTestTracking(); // ✓

// 3. Is trackConversion called?
await trackConversion(); // ✓

// 4. Is there a variant assigned?
console.log(landingPageData?._meta?.variantId); // Should print variant ID
```

**Issue: Conversions tracked multiple times**

**Cause:** `trackConversion()` called in loop or on every render

**Fix:**
```typescript
// BAD: Inside render
return <Button onClick={() => trackConversion()}>Click</Button>;

// GOOD: Inside handler
const handleClick = async () => {
    await performAction();
    await trackConversion();
};
```

**Issue: Conversions tracked on errors**

**Cause:** Tracking before action completes

**Fix:**
```typescript
// BAD:
await trackConversion();
await submitForm(); // If this fails, already tracked!

// GOOD:
await submitForm();
await trackConversion(); // Only track if above succeeds
```

---

## Advanced: Custom Conversion Types

### Adding New Conversion Types

**1. Define type in server:**

`packages/server/src/types/landingPage.ts`:
```typescript
export interface VariantEvent {
    variantId: string;
    eventType: "view" | "conversion" | "bounce" | "custom";
    metadata?: {
        conversionType?: "signup" | "newsletter" | "contact" | "cta_click";
    };
}
```

**2. Track with metadata:**

```typescript
await restApi.trackVariantEvent(variantId, {
    eventType: "conversion",
    metadata: {
        conversionType: "contact",
    },
});
```

**3. Separate metrics in database:**

```json
{
  "metrics": {
    "views": 1000,
    "conversions": {
      "total": 80,
      "signup": 30,
      "newsletter": 40,
      "contact": 10
    },
    "bounces": 200
  }
}
```

---

## Testing Conversion Tracking

### Manual Testing

**Test signup conversion:**
```
1. Clear localStorage
2. Visit homepage
3. Note variant ID in DevTools: localStorage.getItem('variantAssignment')
4. Navigate to signup page
5. Complete signup form
6. Check Network tab for: POST /track with eventType: "conversion"
7. Check admin metrics: conversion count should increment
```

**Test newsletter conversion:**
```
1. Visit homepage with variant assigned
2. Scroll to newsletter section
3. Enter email
4. Submit form
5. Check Network tab for conversion track
6. Verify metrics updated
```

### Automated Testing

**Mock in unit tests:**
```typescript
import { renderHook, act } from "@testing-library/react";
import { useABTestTracking } from "hooks";

jest.mock("stores/landingPageStore", () => ({
    useLandingPageStore: () => ({
        data: {
            _meta: { variantId: "test-variant" },
        },
    }),
}));

test("trackConversion calls API", async () => {
    const mockTrack = jest.fn();
    global.fetch = mockTrack;

    const { result } = renderHook(() => useABTestTracking());

    await act(async () => {
        await result.current.trackConversion();
    });

    expect(mockTrack).toHaveBeenCalledWith(
        expect.stringContaining("/track"),
        expect.objectContaining({
            body: JSON.stringify({ eventType: "conversion" }),
        })
    );
});
```

---

## Conversion Tracking Checklist

### For New Conversion Points

- [ ] Identify valuable user action
- [ ] Import `useABTestTracking` hook
- [ ] Call `trackConversion()` AFTER successful action
- [ ] Handle errors (don't track on failure)
- [ ] Test manually in browser
- [ ] Verify network request
- [ ] Check metrics increment
- [ ] Add unit test (optional)
- [ ] Document in this file
- [ ] Update admin guide

### For Debugging

- [ ] Check variant assigned (`_meta.variantId`)
- [ ] Check hook imported and used
- [ ] Check `trackConversion()` called
- [ ] Check network request sent
- [ ] Check response status
- [ ] Check server logs
- [ ] Verify metrics updated
- [ ] Test with both variants

---

## Related Documentation

- [Main README](./README.md) - System overview
- [Admin Guide](./admin-guide.md) - Using metrics
- [Developer Guide](./developer-guide.md) - Implementation details

## Questions?

File an issue with:
- What action you're trying to track
- Where you've implemented tracking
- What's not working
- Network requests (screenshots)
- Console errors
