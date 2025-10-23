# A/B Testing System

## Overview

The NLN A/B testing system allows you to test different versions of your landing page and measure which performs better with real traffic. This is a **variant-first** system where each variant represents a complete version of the landing page content.

## Table of Contents

- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Key Concepts](#key-concepts)
- [Metrics Tracked](#metrics-tracked)
- [User Guide](#user-guide)
- [Developer Guide](#developer-guide)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### For Admins

1. Navigate to **Admin Panel → A/B Testing**
2. Click "Create New Variant"
3. Configure traffic allocation (e.g., 20%)
4. Edit variant content
5. Enable the variant
6. Monitor metrics

### For Developers

See [Developer Implementation Guide](./developer-guide.md) for adding conversion tracking to new features.

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                        User Visits                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│            landingPageStore.ts                               │
│  • Checks localStorage for existing assignment               │
│  • Validates stored variant (expiration, existence)          │
│  • Requests content from API with variant ID                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Server (variantsService.ts)                     │
│  • Weighted random assignment if no variant specified        │
│  • Returns content from variant-specific JSON file           │
│  • Sends back variant metadata (_meta.variantId)             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    User Session                              │
│  • Variant ID stored in localStorage                         │
│  • 30-day expiration timestamp                               │
│  • Consistent experience across page reloads                 │
└─────────────────────────────────────────────────────────────┘
```

### Tracking Flow

```
View Event (HomePage mount)
    ↓
Bounce Event (< 10s, beforeunload)
    ↓
Conversion Event (signup, newsletter, etc.)
    ↓
Server updates variant metrics
```

---

## Key Concepts

### Variants

A **variant** is a complete version of the landing page with:
- Unique ID (e.g., `variant-homepage-official`)
- Name and description
- Content (hero banners, text, seasonal items, etc.)
- Traffic allocation percentage
- Status (enabled/disabled)
- Metrics (views, conversions, bounces)

### Official Variant

- One variant is marked as "official" (the control/baseline)
- Cannot be deleted
- Typically receives the majority of traffic
- Represents your current production content

### Traffic Allocation

- **Must total 100%** across all enabled variants
- Example: Official 80%, Test 20%
- Only enabled variants receive traffic
- Disabled variants don't count toward the 100%

### Session Persistence

- User assignments stored in localStorage
- **30-day expiration** - user may see different variant after 30 days
- Consistent experience within the 30-day window
- Invalid variants cleared automatically

---

## Metrics Tracked

### View
**What:** User lands on homepage and page fully loads
**When:** `HomePage` component mounts
**Location:** `HomePage.tsx:60-72`

### Conversion
**What:** User completes a valuable action
**When:**
- User successfully signs up (`SignUpForm.tsx:69`)
- User subscribes to newsletter (`InteractiveElements.tsx:80`)

**Future conversion points:**
- Contact form submission
- CTA button clicks
- Product views/purchases

### Bounce
**What:** User leaves within 10 seconds
**When:** Page unload within 10 seconds of landing
**Why:** Indicates poor first impression
**Location:** `HomePage.tsx:74-107`

### Calculated Metrics

**Conversion Rate:** `(conversions / views) * 100`
- Higher is better
- Industry average: 2-5% for landing pages

**Bounce Rate:** `(bounces / views) * 100`
- Lower is better
- Good: < 40%, Poor: > 60%

---

## User Guide

See [Admin User Guide](./admin-guide.md) for step-by-step instructions on:
- Creating variants
- Managing traffic allocation
- Editing variant content
- Interpreting metrics
- Best practices

---

## Developer Guide

See [Developer Implementation Guide](./developer-guide.md) for:
- Adding conversion tracking to new features
- Understanding the tracking architecture
- Testing A/B tests locally
- Extending the system

---

## Troubleshooting

### Variant Assignment Issues

**Problem:** User keeps getting different variants
- **Cause:** localStorage cleared or variant expired (30 days)
- **Solution:** This is expected behavior, no action needed

**Problem:** User sees error loading content
- **Cause:** Stored variant was deleted/disabled
- **Solution:** System auto-clears and reassigns - refresh page

### Traffic Allocation Issues

**Problem:** "Traffic must total 100%" error
- **Cause:** Enabled variants don't sum to 100%
- **Solution:** Use auto-fill button or manually adjust allocations

**Problem:** Cannot create new variant
- **Cause:** No available traffic
- **Solution:** Reduce official variant allocation first

### Metrics Issues

**Problem:** All variants show 0 conversions
- **Cause:** Conversion tracking not implemented
- **Solution:** Verify `useABTestTracking()` hook is used in forms

**Problem:** Bounce rate seems too high/low
- **Cause:** 10-second threshold may not fit your content
- **Solution:** Adjust `BOUNCE_THRESHOLD_MS` in `HomePage.tsx:26`

### Common Errors

**"Cannot delete the official variant"**
- Only test variants can be deleted
- To remove official variant, first promote another variant

**"Cannot delete an enabled variant"**
- Disable variant first, then delete
- Prevents accidental deletion of active tests

---

## Technical Details

### Storage Keys

```typescript
localStorage.setItem('variantAssignment', 'variant-id');
localStorage.setItem('variantAssignmentTimestamp', '1234567890');
```

### Session Duration

```typescript
const VARIANT_SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
```

### API Endpoints

```
GET  /rest/v1/landing-page?variantId={id}     - Get variant content
GET  /rest/v1/landing-page/variants            - List all variants
POST /rest/v1/landing-page/variants            - Create variant
PUT  /rest/v1/landing-page/variants/{id}       - Update variant
DELETE /rest/v1/landing-page/variants/{id}     - Delete variant
POST /rest/v1/landing-page/variants/{id}/track - Track event
POST /rest/v1/landing-page/variants/{id}/promote - Promote to official
POST /rest/v1/landing-page/variants/{id}/toggle  - Enable/disable
```

---

## Best Practices

### Testing Strategy

1. **Start Small:** Test one change at a time (e.g., just hero text)
2. **Run Long Enough:** Minimum 1-2 weeks for statistical significance
3. **Traffic Split:** 80/20 split is safe for initial tests
4. **Monitor Daily:** Check metrics regularly for issues

### What to Test

✅ **Good A/B Test Ideas:**
- Hero headline/copy
- CTA button text/color
- Trust badges and social proof
- Seasonal content order
- Number of service items shown

❌ **Not Recommended:**
- Multiple changes at once (can't isolate what worked)
- Tiny visual tweaks (unlikely to move metrics)
- Changes that break user experience

### Statistical Significance

- Minimum 100 conversions per variant for reliable results
- Use [A/B testing calculators](https://abtestguide.com/calc/) online
- Don't conclude too early - regression to mean is real

---

## Changelog

### 2025-10-22 - System Improvements
- ✅ Fixed conversion tracking (was completely broken)
- ✅ Fixed sendBeacon content-type for bounce tracking
- ✅ Added view tracking double-count prevention
- ✅ Added 30-day session expiration
- ✅ Added variant validation and auto-retry
- ✅ Added traffic allocation auto-fill
- ✅ Enhanced error handling
- ✅ Improved admin UX with better warnings

### Previous
- Initial variant-first system implementation
- Basic tracking infrastructure
- Admin UI for variant management

---

## Support

**Questions?** Contact the development team or file an issue in the project repository.

**Found a bug?** See [CONTRIBUTING.md](../../CONTRIBUTING.md) for bug report guidelines.
