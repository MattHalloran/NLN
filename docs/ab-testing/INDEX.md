# A/B Testing Documentation - Navigation

Welcome to the NLN A/B Testing System documentation! This index will help you find the right documentation for your needs.

---

## 📚 Documentation Overview

### 1. [**System README**](./README.md) - Start Here!
**For:** Everyone
**Purpose:** High-level overview of the A/B testing system

**Contents:**
- System architecture and flow
- Key concepts (variants, traffic allocation, metrics)
- Quick start guides
- Troubleshooting common issues
- Technical specifications

**Read this if you:**
- Are new to the A/B testing system
- Want to understand how it works
- Need technical specifications
- Are troubleshooting issues

---

### 2. [**Admin User Guide**](./admin-guide.md)
**For:** Admins, Product Managers, Marketing
**Purpose:** Step-by-step instructions for using the A/B testing UI

**Contents:**
- Creating your first A/B test
- Managing variants (create, edit, enable, delete, promote)
- Understanding metrics (views, conversions, bounce rate)
- Traffic allocation strategies
- Best practices and common scenarios
- Decision-making frameworks

**Read this if you:**
- Manage the website content
- Want to run A/B tests
- Need to interpret test results
- Are making data-driven decisions

---

### 3. [**Developer Implementation Guide**](./developer-guide.md)
**For:** Software Engineers, Frontend Developers
**Purpose:** Technical guide for implementing and extending the system

**Contents:**
- Architecture deep-dive
- Adding conversion tracking to new features
- Code examples and patterns
- Testing locally
- Extending the system
- Complete code reference
- Troubleshooting developer issues

**Read this if you:**
- Are adding new features
- Need to implement conversion tracking
- Want to extend the A/B testing system
- Are debugging tracking issues
- Need code examples

---

### 4. [**Conversion Tracking Reference**](./conversion-tracking.md)
**For:** Developers, Product Managers
**Purpose:** Complete reference for conversion tracking

**Contents:**
- What is a conversion?
- Current conversion points
- Planned conversion points
- Best practices for tracking
- Conversion rate calculations
- Debugging conversions
- Testing strategies
- Advanced custom conversions

**Read this if you:**
- Need to add new conversion tracking
- Want to understand current conversions
- Are debugging conversion issues
- Need conversion rate benchmarks
- Want to customize tracking

---

## 🎯 Quick Navigation by Role

### I'm an **Admin** or **Product Manager**
1. Start with: [README.md](./README.md) - Quick Start section
2. Then read: [Admin User Guide](./admin-guide.md) - Full walkthrough
3. Reference: [README.md](./README.md) - Metrics section

### I'm a **Frontend Developer**
1. Start with: [README.md](./README.md) - Architecture section
2. Then read: [Developer Guide](./developer-guide.md) - Implementation details
3. Reference: [Conversion Tracking](./conversion-tracking.md) - When adding features

### I'm a **New Developer** on the team
1. Start with: [README.md](./README.md) - Complete overview
2. Then read: [Developer Guide](./developer-guide.md) - Code structure
3. Practice: Follow [Developer Guide](./developer-guide.md) - Testing Locally
4. Reference: All docs as needed

### I'm a **Backend Developer**
1. Start with: [README.md](./README.md) - Architecture section
2. Focus on: Server-side components in [Developer Guide](./developer-guide.md)
3. Reference: API endpoints in [README.md](./README.md)

---

## 🔍 Quick Lookup by Topic

| Topic | Documentation | Section |
|-------|--------------|---------|
| **Creating a test** | [Admin Guide](./admin-guide.md) | Creating Your First A/B Test |
| **Traffic allocation** | [Admin Guide](./admin-guide.md) | Traffic Allocation |
| **Understanding metrics** | [Admin Guide](./admin-guide.md) | Understanding Metrics |
| **Adding conversion tracking** | [Developer Guide](./developer-guide.md) | Adding Conversion Tracking |
| **System architecture** | [README.md](./README.md) | Architecture |
| **API endpoints** | [Developer Guide](./developer-guide.md) | Code Reference |
| **Debugging conversions** | [Conversion Tracking](./conversion-tracking.md) | Debugging Conversions |
| **Best practices** | [Admin Guide](./admin-guide.md) | Best Practices |
| **Testing locally** | [Developer Guide](./developer-guide.md) | Testing Locally |
| **Troubleshooting** | [README.md](./README.md) | Troubleshooting |

---

## 📖 Reading Recommendations

### Scenario: "I want to test a new hero headline"
**Path:**
1. [Admin Guide](./admin-guide.md) → Scenario 1: Creating Your First Test
2. [Admin Guide](./admin-guide.md) → Understanding Metrics
3. [README.md](./README.md) → Best Practices

### Scenario: "I'm adding a contact form and need to track conversions"
**Path:**
1. [Developer Guide](./developer-guide.md) → Adding Conversion Tracking
2. [Conversion Tracking](./conversion-tracking.md) → Implementation Pattern
3. [Developer Guide](./developer-guide.md) → Testing Locally

### Scenario: "Metrics aren't updating"
**Path:**
1. [README.md](./README.md) → Troubleshooting
2. [Developer Guide](./developer-guide.md) → Troubleshooting
3. [Conversion Tracking](./conversion-tracking.md) → Debugging Conversions

### Scenario: "I want to understand how the system works"
**Path:**
1. [README.md](./README.md) → Architecture
2. [README.md](./README.md) → Key Concepts
3. [Developer Guide](./developer-guide.md) → Architecture Overview

---

## 🎓 Learning Path

### Beginner (Never used A/B testing before)
1. Read: [README.md](./README.md) - Overview and Key Concepts
2. Read: [Admin Guide](./admin-guide.md) - Getting Started
3. Practice: Create a test variant (80/20 split)
4. Learn: [Admin Guide](./admin-guide.md) - Understanding Metrics
5. Wait: Let test run 1-2 weeks
6. Analyze: Review results and make decision

### Intermediate (Used A/B testing, new to this system)
1. Skim: [README.md](./README.md) - Architecture
2. Read: [Admin Guide](./admin-guide.md) - Managing Variants
3. Practice: Run your first test
4. Learn: [README.md](./README.md) - Metrics Tracked
5. Explore: [Admin Guide](./admin-guide.md) - Common Scenarios

### Advanced (Want to customize/extend)
1. Read: [Developer Guide](./developer-guide.md) - Complete guide
2. Read: [Conversion Tracking](./conversion-tracking.md) - Full reference
3. Explore: Code in `/packages/ui/src/` and `/packages/server/src/`
4. Implement: Add custom tracking or metrics
5. Test: Follow testing guidelines

---

## 🆘 Getting Help

### Quick Help
- **General questions:** See [README.md](./README.md) → Troubleshooting
- **Admin UI issues:** See [Admin Guide](./admin-guide.md) → Troubleshooting
- **Developer issues:** See [Developer Guide](./developer-guide.md) → Troubleshooting
- **Conversion tracking:** See [Conversion Tracking](./conversion-tracking.md) → Debugging

### Still Stuck?
File an issue with:
- What you're trying to do
- What documentation you've read
- What's happening vs what you expected
- Screenshots (if UI-related)
- Code snippets (if development-related)
- Console errors or network requests

---

## 📝 Documentation Maintenance

### Last Updated
2025-10-22 - Complete documentation overhaul after system improvements

### Recent Changes
- ✅ Fixed conversion tracking (was completely broken)
- ✅ Added 30-day session expiration
- ✅ Improved traffic allocation UX
- ✅ Enhanced error handling
- ✅ Created comprehensive documentation

### Contributing
To update documentation:
1. Make changes to relevant `.md` file
2. Update this index if adding new docs
3. Update "Last Updated" date above
4. Test all links still work
5. Submit PR with changes

---

## 🗺️ Documentation Map

```
/docs/ab-testing/
├── INDEX.md                    ← You are here
├── README.md                   ← Start here for overview
├── admin-guide.md              ← For admins/PMs
├── developer-guide.md          ← For developers
└── conversion-tracking.md      ← Conversion reference
```

---

## External Resources

- [A/B Testing Guide](https://vwo.com/ab-testing/) - General A/B testing concepts
- [Statistical Calculator](https://abtestguide.com/calc/) - Calculate significance
- [Conversion Rate Benchmarks](https://www.invespcro.com/blog/conversion-rate-optimization-stats/) - Industry standards
- [React Documentation](https://react.dev) - React fundamentals
- [Zustand Documentation](https://github.com/pmndrs/zustand) - State management library

---

**Happy testing! 🎉**

If you find these docs helpful, consider improving them for the next person. If you find them confusing, please let us know so we can make them better!
