# Wasali Documentation

Complete documentation for the Wasali shipping platform. Find guides, architecture details, setup instructions, and feature documentation.

## 📑 Table of Contents

### Getting Started
- **[Setup Guide](setup.md)** - Initial project setup and configuration
- **[Infrastructure](infrastructure.md)** - Server setup, databases, and deployment

### Architecture & Design
- **[Architecture Overview](architecture.md)** - System design, data models, and technical decisions (main reference)
- **[Product Guide](product.md)** - Feature overview and product roadmap
- **[User Flows](user-flows.md)** - Complete user journey maps for all features
- **[Integrations](integrations.md)** - External service integrations (Stripe, Supabase, etc.)

### Features

#### Route Alerts 🔔 (New!)
- **[Route Alert Feature](route-alert-feature.md)** - Feature overview, architecture, usage guide
- **[Route Alert Email Setup](route-alert-email-setup.md)** - Complete deployment guide, configuration, troubleshooting
- **[Route Alert Component README](../app/route-alert/README.md)** - Component API and integration guide
- **[Edge Function README](../supabase/functions/notify-route-alert/README.md)** - Edge function documentation and deployment

#### Other Features
- **[Flag Images Setup](FLAG_IMAGES_SETUP.md)** - Country flag emoji implementation
- **[Where Are You From Update](WHERYEAREYOUFROM_UPDATE.md)** - Country selection feature changes

### Testing
- **[Test Plan - Search Results](test-plan-search-results.md)** - Testing strategy for search functionality

### Implementation Plans
Browse detailed implementation plans in the **[plans/](plans/)** folder:
- `route-alert-implementation-plan.md` - Route alert feature planning
- And more...

### Reports
View reports and analysis in the **[reports/](reports/)** folder

## 🚀 Quick Links by Role

### For New Developers
1. Start with [Setup Guide](setup.md)
2. Read [Architecture Overview](architecture.md)
3. Check [User Flows](user-flows.md) to understand features
4. Review [Integrations](integrations.md) for third-party services

### For Product Managers
1. Read [Product Guide](product.md)
2. Review [User Flows](user-flows.md)
3. Check [Architecture Overview](architecture.md) for capabilities
4. Monitor [reports/](reports/) for metrics and analysis

### For DevOps/Infrastructure
1. Review [Infrastructure](infrastructure.md)
2. Check [Setup Guide](setup.md)
3. Review [Route Alert Email Setup](route-alert-email-setup.md) for deployment
4. Check Supabase and Stripe integration details in [Integrations](integrations.md)

### For Frontend Developers
1. Read [Architecture Overview](architecture.md) - Frontend section
2. Review specific feature READMEs:
   - [Route Alert Component README](../app/route-alert/README.md)
3. Check [User Flows](user-flows.md) for UI requirements

### For Backend/Database Developers
1. Read [Architecture Overview](architecture.md) - Database section
2. Review [Integrations](integrations.md) for API details
3. Check specific feature setup guides:
   - [Route Alert Email Setup](route-alert-email-setup.md) - Database schema details

## 📚 Documentation by Topic

### Authentication & Security
- See [Architecture - Authentication](architecture.md#authentication--security)
- See [Integrations - Supabase Auth](integrations.md#authentication)

### Database & Data Models
- See [Architecture - Database Schema](architecture.md#database-schema)
- Route Alerts: [Route Alert Feature](route-alert-feature.md#data-model)

### API Integration
- See [Integrations](integrations.md) for:
  - Stripe for payments
  - Supabase for backend
  - Resend for emails
  - Google Maps for location

### Deployment
- See [Infrastructure](infrastructure.md)
- Route Alerts: [Route Alert Email Setup](route-alert-email-setup.md#deployment-steps)

### Testing
- See [Test Plan](test-plan-search-results.md)
- Route Alerts: [Route Alert Email Setup](route-alert-email-setup.md#testing)

## 📋 Feature Documentation Map

| Feature | Overview | Setup | API | Tests |
|---------|----------|-------|-----|-------|
| **Route Alerts** | [Link](route-alert-feature.md) | [Link](route-alert-email-setup.md) | [Link](../app/route-alert/README.md) | Unit & Integration |
| **Route Search** | [Architecture](architecture.md#features) | [Setup](setup.md) | [Integrations](integrations.md) | [Test Plan](test-plan-search-results.md) |
| **Payments** | [Product](product.md) | [Infrastructure](infrastructure.md) | [Integrations](integrations.md#stripe) | [Test Plan](test-plan-search-results.md) |
| **User Profiles** | [User Flows](user-flows.md) | [Setup](setup.md) | [Architecture](architecture.md) | [Test Plan](test-plan-search-results.md) |

## 🔧 Environment Setup

### Development
```bash
# See setup.md for detailed instructions
npm install
npx expo start
supabase start
```

### Production
See [Infrastructure](infrastructure.md) for deployment setup

## 📖 Documentation Standards

All documentation follows these standards:
- Clear, concise headings with emoji indicators
- Code examples where applicable
- Links to related documentation
- Troubleshooting sections for operational docs
- Table of contents for long documents

## 🔄 Keeping Documentation Updated

**Important:** Documentation should be updated alongside code changes:
1. Update relevant markdown files
2. Update [Architecture Overview](architecture.md) if changing architecture
3. Update [User Flows](user-flows.md) if changing user journey
4. Create/update feature-specific READMEs in feature folders
5. Commit documentation with code changes

## 📞 Need Help?

- **Setup Issues?** See [Setup Guide](setup.md)
- **Architecture Questions?** See [Architecture Overview](architecture.md)
- **Feature-Specific Help?** Check feature-specific READMEs
- **Deployment Issues?** See [Infrastructure](infrastructure.md)
- **Feature Implementation?** Check [plans/](plans/) folder

## 📊 Documentation Statistics

- **Total Docs**: 13+ files
- **Total Lines**: 20,000+ lines
- **Features Documented**: 10+
- **Architecture Pages**: 1 comprehensive guide
- **User Journey Maps**: Complete coverage

## 🎯 Next Steps

- Review [Setup Guide](setup.md) to get started
- Read [Architecture Overview](architecture.md) to understand the system
- Check [User Flows](user-flows.md) to see how features work
- See [Route Alert Feature](route-alert-feature.md) for the latest feature

---

**Last Updated**: March 24, 2026
**Maintained By**: Development Team
**Status**: ✅ Up to Date
