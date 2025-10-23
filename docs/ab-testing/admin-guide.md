# A/B Testing - Admin User Guide

## Table of Contents

- [Getting Started](#getting-started)
- [Creating Your First A/B Test](#creating-your-first-ab-test)
- [Managing Variants](#managing-variants)
- [Understanding Metrics](#understanding-metrics)
- [Traffic Allocation](#traffic-allocation)
- [Best Practices](#best-practices)
- [Common Scenarios](#common-scenarios)

---

## Getting Started

### Accessing A/B Testing

1. Log in to the admin panel
2. Navigate to **Admin → A/B Testing** in the sidebar
3. You'll see the A/B Testing dashboard

### Dashboard Overview

The dashboard shows:
- **Official Variant:** Your current live version (control)
- **Test Variants:** Experimental versions you're testing
- **Traffic Allocation Warning:** If traffic doesn't total 100%
- **Metrics:** Views, conversions, bounces for each variant

---

## Creating Your First A/B Test

### Step 1: Plan Your Test

Before creating a variant, decide:
- **What to test:** e.g., "Does a warmer hero image increase signups?"
- **Hypothesis:** "A hero image with people will convert better"
- **Success metric:** Conversion rate
- **Traffic split:** Start with 80/20 (Official/Test)

### Step 2: Create New Variant

1. Click **"Create New Variant"** button
2. Fill in the form:

   **Variant Name:** (Required)
   ```
   Example: "Warm Hero with People"
   ```
   Short, descriptive name for this test

   **Description:** (Optional)
   ```
   Example: "Testing if showing customers in hero banner increases trust and conversions"
   ```
   What you're testing and why

   **Traffic Allocation:**
   - Click **"Auto-Fill"** to use available traffic
   - Or manually enter percentage (0-100)
   - See available traffic below the field

   **Copy From:** (Optional)
   - Select "Official Variant" to copy current content
   - Or "Start from scratch" for blank slate

3. Click **"Create Variant"**

### Step 3: Edit Variant Content

1. Find your new variant in the list
2. Click **"Edit Content"** button
3. Modify the content you want to test:
   - Hero banners
   - Hero text (title, subtitle, description)
   - Seasonal plants/tips
   - Newsletter settings
   - Company info
   - Contact information
4. Click **"Save"** when done

### Step 4: Enable the Variant

1. In the variant card, find the toggle switch
2. Click to enable (turns green)
3. Confirm the action
4. Traffic now flows to your test variant!

### Step 5: Monitor Results

1. Check metrics daily
2. Wait 1-2 weeks minimum
3. Need 100+ conversions per variant for reliability
4. Compare conversion rates

---

## Managing Variants

### Viewing Variant Details

Each variant card shows:
- **Name & Description**
- **Status Badge:** Enabled (green) or Disabled (gray)
- **Official Star:** If it's the current control
- **Traffic Allocation:** Percentage of visitors
- **Metrics:**
  - Views: Total page visits
  - Conversions: Signups + newsletter subscriptions
  - Bounces: Visitors who left within 10 seconds
- **Actions:** Edit, Toggle, Delete, Promote

### Editing a Variant

1. Click **"Edit Content"** on the variant
2. Opens variant-specific editor
3. Changes apply only to this variant
4. Save when complete

**Note:** You can edit enabled variants, but consider:
- Existing data becomes less comparable
- Better to disable, edit, then re-enable with fresh metrics

### Enabling/Disabling Variants

**To Enable:**
1. Ensure traffic allocation is set correctly
2. Click the toggle switch
3. Variant starts receiving traffic immediately

**To Disable:**
1. Click the toggle switch
2. Traffic stops immediately
3. Metrics are preserved

### Deleting a Variant

**Requirements:**
- Cannot delete official variant
- Must be disabled first

**Steps:**
1. Disable the variant
2. Click the trash icon
3. Confirm deletion
4. Data is permanently deleted

### Promoting a Variant

When a test variant wins (better metrics):

1. Click **"Promote to Official"** button
2. Confirm the action
3. The variant becomes official:
   - Gets the official star
   - Previous official becomes regular variant
   - Traffic usually set to 100%

**What happens:**
- Content from test variant becomes the new baseline
- Old official variant still exists (can delete or keep for future tests)

---

## Understanding Metrics

### Views

**What it means:** Number of unique page loads

**Why it matters:** Sample size for statistical significance

**Good to know:**
- Tracked when homepage fully loads
- One view per user per session
- Reloading page doesn't re-count

### Conversions

**What it means:** User completed a valuable action

**Current conversion events:**
1. **Account signup:** User successfully creates account
2. **Newsletter subscription:** User submits email in newsletter form

**Future additions:**
- Contact form submission
- CTA button clicks
- Product page visits

**Why it matters:** This is your success metric!

### Conversion Rate

**Formula:** `(Conversions / Views) × 100`

**Example:**
- 500 views
- 15 conversions
- Conversion rate: 3%

**Interpreting:**
- **< 2%:** Poor performance
- **2-5%:** Industry average for landing pages
- **5-10%:** Good performance
- **> 10%:** Excellent (rare)

**Remember:** Higher traffic variants may have more conversions but lower conversion rate

### Bounces

**What it means:** User left within 10 seconds of landing

**Why it matters:** Indicates poor first impression

**Bounce Rate Formula:** `(Bounces / Views) × 100`

**Interpreting:**
- **< 40%:** Good
- **40-60%:** Average
- **> 60%:** Poor - something's wrong

**Common causes of high bounce:**
- Slow page load
- Misleading ad/link
- Poor mobile experience
- Confusing layout

---

## Traffic Allocation

### The 100% Rule

**All enabled variants must total exactly 100%**

Examples:
- ✅ Official: 80%, Test A: 20%
- ✅ Official: 50%, Test A: 30%, Test B: 20%
- ❌ Official: 80%, Test A: 30% (Total: 110%)
- ❌ Official: 90% (Total: 90%, 10% wasted)

### Using the Auto-Fill Feature

1. When creating a variant, click **"Auto-Fill"** button
2. System calculates available traffic
3. Suggests using all available traffic

**Scenarios:**

**Scenario 1: Traffic Available**
- Current: Official 80% (enabled)
- Available: 20%
- Auto-fill suggests: 20%
- Result: Perfect 100% split

**Scenario 2: No Traffic Available**
- Current: Official 100% (enabled)
- Available: 0%
- Auto-fill suggests: 20% (with warning)
- Warning: "Consider reducing official to 80%"
- Action needed: Edit official variant to free up traffic

### Adjusting Traffic Allocation

**To change allocation:**

1. Navigate to variant management page
2. Find the variant you want to adjust
3. Click **"Edit"** button
4. Update traffic allocation field
5. Save changes

**Tips:**
- Start conservative (80/20)
- Can adjust mid-test if needed
- Changes take effect immediately
- Consider disabling old variant when traffic shift is large

### Multiple Tests

You can run multiple test variants simultaneously:

```
Official: 60%
Test A (New hero): 20%
Test B (Shorter form): 20%
Total: 100% ✓
```

**Considerations:**
- Each gets less traffic = takes longer to reach significance
- Can't tell if A+B combination would work
- Better to test sequentially for faster results

---

## Best Practices

### Test Planning

**Do:**
- ✅ Test one change at a time
- ✅ Have clear hypothesis
- ✅ Define success metric upfront
- ✅ Wait for statistical significance
- ✅ Document what you tested

**Don't:**
- ❌ Change multiple things at once
- ❌ End test too early
- ❌ Test tiny visual tweaks
- ❌ Ignore bounce rate
- ❌ Forget to promote winners

### Sample Size

**Minimum requirements:**
- 100 conversions per variant
- 1-2 weeks of data
- At least 500 views per variant

**Use this formula:**
```
Days needed = 100 conversions / (daily views × conversion rate)

Example:
100 conversions needed
100 daily views to variant (20% of 500 total)
3% conversion rate
= 100 / (100 × 0.03) = 33 days
```

### What to Test

**High-impact tests:**
1. **Hero headline:** First thing visitors see
2. **CTA button text:** "Get Started" vs "Sign Up Free"
3. **Hero image:** People vs product vs scenery
4. **Trust signals:** Testimonials, badges, certifications
5. **Form length:** More fields vs fewer fields

**Lower-impact tests:**
- Button color (small effect)
- Font changes (negligible unless major readability issue)
- Minor spacing adjustments

### Interpreting Results

**Variant is winning if:**
- ✅ Higher conversion rate (not just more conversions)
- ✅ Lower or equal bounce rate
- ✅ Statistical significance reached
- ✅ Pattern consistent over time

**Watch out for:**
- ⚠️ Weekend vs weekday differences
- ⚠️ Seasonal effects
- ⚠️ Marketing campaign overlaps
- ⚠️ Small sample sizes

**Example:**

```
Official Variant:
- 2,000 views
- 60 conversions
- 3.0% conversion rate
- 45% bounce rate

Test Variant:
- 500 views
- 20 conversions
- 4.0% conversion rate ← 33% improvement!
- 42% bounce rate ← Also better

Conclusion: Test is winning! But wait for more data.
```

---

## Common Scenarios

### Scenario 1: Creating Your First Test

**Goal:** Test new hero headline

**Steps:**
1. Create variant: "Hero - Shorter Headline"
2. Description: "Testing if concise headline improves clarity"
3. Traffic: 20% (auto-fill)
4. Copy from: Official
5. Edit variant → Change only hero title
6. Enable variant
7. Wait 2 weeks
8. Review metrics
9. Promote if winner, delete if loser

### Scenario 2: Test Variant is Losing

**Data:**
- Official: 3.5% conversion, 40% bounce
- Test: 2.1% conversion, 65% bounce

**Action:**
1. Disable test variant immediately
2. Delete variant (data lost - that's okay)
3. Analyze why it failed
4. Create new test with different approach

**Don't:**
- Keep running losing test (wastes traffic)
- Tweak the losing variant (need fresh start)

### Scenario 3: Test Variant is Winning

**Data:**
- Official: 2.8% conversion
- Test: 4.2% conversion (50% improvement)
- Both have 1000+ views

**Action:**
1. Click "Promote to Official" on test variant
2. New content becomes default
3. Old official is now regular variant
4. Set new official to 100% traffic
5. Disable or delete old official
6. Start planning next test!

### Scenario 4: Inconclusive Results

**Data:**
- Official: 3.1% conversion
- Test: 3.3% conversion (tiny difference)
- 100 conversions each

**Action:**
1. Let it run longer (need more data)
2. If still inconclusive after 4+ weeks:
   - No significant difference found
   - Disable test
   - Keep official
   - Try more dramatic change

### Scenario 5: Traffic Allocation Error

**Problem:** "Traffic must total 100%"

**Current state:**
- Official: 100% (enabled)
- Want to create: Test variant 20%

**Solution:**
1. Edit official variant
2. Change traffic from 100% to 80%
3. Save
4. Now create test variant with 20%
5. Total: 100% ✓

### Scenario 6: Multiple Tests

**Goal:** Test hero AND services section

**Approach 1: Sequential (Recommended)**
```
Week 1-2: Test new hero (80/20 split)
Week 3-4: Promote winner, test services (80/20 split)
```
Pros: Faster to significance, isolate effects

**Approach 2: Parallel**
```
Week 1-4: Test both simultaneously
Official: 60%
New Hero: 20%
New Services: 20%
```
Pros: Faster overall, Cons: Slower per test

---

## Troubleshooting

### "Cannot create variant - no traffic available"

**Fix:** Reduce official variant allocation to free up traffic.

### "Variant not receiving any views"

**Check:**
1. Is variant enabled? (toggle should be green)
2. Is traffic allocation > 0%?
3. Do all enabled variants total 100%?

### "Conversion rate seems wrong"

**Verify:**
1. Enough sample size? (minimum 100 conversions)
2. Seasonal effects? (holidays, events)
3. Marketing campaigns running?
4. Check bounce rate for quality signals

### "Can't delete variant"

**Requirements:**
1. Variant must be disabled first
2. Cannot delete official variant

### "Lost variant data after promotion"

**This is normal:**
- Old official becomes regular variant (keeps data)
- If you delete it, data is lost
- Keep it for historical comparison if needed

---

## Quick Reference

### Traffic Allocation Examples

| Official | Test A | Test B | Total | Valid? |
|----------|--------|--------|-------|--------|
| 100%     | -      | -      | 100%  | ✅     |
| 80%      | 20%    | -      | 100%  | ✅     |
| 70%      | 20%    | 10%    | 100%  | ✅     |
| 50%      | 50%    | -      | 100%  | ✅     |
| 90%      | -      | -      | 90%   | ❌     |
| 80%      | 30%    | -      | 110%  | ❌     |

### Metric Benchmarks

| Metric | Good | Average | Poor |
|--------|------|---------|------|
| Conversion Rate | > 5% | 2-5% | < 2% |
| Bounce Rate | < 40% | 40-60% | > 60% |

### Decision Matrix

| Conversion | Bounce | Action |
|------------|--------|--------|
| ↑ Higher   | ↓ Lower | 🎉 Promote! |
| ↑ Higher   | → Same  | ✅ Probably promote |
| ↑ Higher   | ↑ Higher | ⚠️ Investigate |
| → Same     | ↓ Lower | 🤔 Consider promoting |
| → Same     | → Same  | 🔄 Inconclusive |
| ↓ Lower    | Any    | ❌ Disable |

---

## Additional Resources

- [Main A/B Testing README](./README.md) - Technical overview
- [Developer Guide](./developer-guide.md) - For custom implementations
- [A/B Testing Calculator](https://abtestguide.com/calc/) - Check significance

## Need Help?

Contact the development team or file an issue with:
- What you're trying to do
- What's happening instead
- Screenshots if relevant
