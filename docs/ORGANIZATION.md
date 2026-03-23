# Documentation Organization Guide

This guide explains the structure and organization of Wasali documentation.

## Folder Structure

```
docs/
├── README.md                          # Main docs index (START HERE)
├── ORGANIZATION.md                    # This file
│
├── Core Documentation
├── setup.md                           # Initial setup & configuration
├── architecture.md                    # System architecture & design
├── infrastructure.md                  # Server & deployment setup
├── integrations.md                    # Third-party integrations
├── product.md                         # Product overview & roadmap
├── user-flows.md                      # User journey maps
│
├── Feature Documentation
├── route-alert-feature.md             # Route alert feature guide
├── route-alert-email-setup.md         # Route alert deployment
├── FLAG_IMAGES_SETUP.md               # Flag images feature
├── WHERYEAREYOUFROM_UPDATE.md         # Country selection feature
│
├── Testing
├── test-plan-search-results.md        # Search feature tests
│
├── Implementation Plans
├── plans/                             # Detailed implementation plans
│   ├── route-alert-implementation-plan.md
│   └── ...
│
└── Reports
    └── reports/                       # Project reports & analysis
        └── ...
```

## Documentation Types

### 1. Core Documentation (Reference Materials)

**Purpose**: Provide comprehensive reference for system design and setup

**Files**:
- `architecture.md` - Complete system design (THE MAIN REFERENCE)
- `setup.md` - Getting started guide
- `infrastructure.md` - Deployment and server setup
- `integrations.md` - External service APIs
- `product.md` - Product features and roadmap
- `user-flows.md` - User journey maps

**When to Reference**:
- Architecture decisions
- Database schema
- API design
- Deployment procedures
- Feature overview

### 2. Feature Documentation

**Purpose**: Guide for implementing, deploying, and using specific features

**Files**:
- `route-alert-feature.md` - Feature overview and architecture
- `route-alert-email-setup.md` - Deployment and configuration
- `FLAG_IMAGES_SETUP.md` - Flag image implementation
- `WHERYEAREYOUFROM_UPDATE.md` - Country selection feature

**Location**:
- Overview in `docs/`
- Implementation details in feature folders:
  - `app/route-alert/README.md` - Component API
  - `supabase/functions/notify-route-alert/README.md` - Edge function

**When to Create**:
- New feature being added
- Feature requires setup/deployment
- Feature has configuration options

### 3. Testing Documentation

**Purpose**: Testing strategy and procedures

**Files**:
- `test-plan-search-results.md` - Search feature testing

**When to Create**:
- Complex feature needs testing strategy
- Testing procedures are non-obvious

### 4. Implementation Plans (plans/ folder)

**Purpose**: Detailed step-by-step implementation guides

**Files**:
- `plans/route-alert-implementation-plan.md`
- And more...

**When to Create**:
- Major feature implementation
- Complex refactoring
- Cross-team coordination needed

### 5. Reports (reports/ folder)

**Purpose**: Project metrics, analysis, and status reports

**When to Create**:
- Performance analysis
- Feature metrics
- Project status reports
- Technical debt assessment

## How to Find Documentation

### By Role

**Developer**: Start with [README.md](README.md) → [Architecture](architecture.md) → Feature-specific guide

**Product Manager**: [README.md](README.md) → [Product](product.md) → [User Flows](user-flows.md)

**DevOps**: [README.md](README.md) → [Infrastructure](infrastructure.md) → Feature setup guides

**QA/Tester**: [README.md](README.md) → [Test Plans](test-plan-search-results.md) → Feature guides

### By Topic

**Authentication**: [Architecture - Auth Section](architecture.md#authentication--security)

**Database**: [Architecture - Database Section](architecture.md#database-schema)

**API**: [Integrations](integrations.md)

**Features**: [Feature Documentation Map](README.md#-feature-documentation-map)

**Deployment**: [Infrastructure](infrastructure.md)

## Naming Conventions

### File Names
- Use lowercase with hyphens: `route-alert-feature.md`
- Be descriptive: `route-alert-email-setup.md` not `setup.md`
- Add context for ambiguous names

### Headings
- Use clear, descriptive headings
- Use emoji indicators for sections (🔔, 📚, 🚀, etc.)
- Create table of contents for long documents (>2000 lines)

### Links
- Use relative links: `[Architecture](architecture.md)`
- Use descriptive link text: `[Setup Guide](setup.md)` not `[Click here](setup.md)`
- Link to relevant sections when applicable

## Documentation Content Standards

### Every Doc Should Have

1. **Title with emoji** (if applicable)
   ```markdown
   # Route Alert Feature 🔔
   ```

2. **Quick Summary** (1-2 sentences)
   ```markdown
   Complete guide to implementing route alert notifications.
   ```

3. **Table of Contents** (for docs >1000 lines)
   ```markdown
   ## 📑 Contents
   - [Overview](#overview)
   - [Setup](#setup)
   ...
   ```

4. **Clear Sections** with descriptive headings

5. **Code Examples** (if applicable)
   ```typescript
   // Example code
   ```

6. **Links to Related Docs**
   - See also: [Other Docs](other.md)

### Feature Documentation Should Include

1. Quick Start
2. Architecture/Design
3. API Reference
4. Configuration Options
5. Deployment Instructions
6. Testing Procedures
7. Troubleshooting
8. Related Files

## Updating Documentation

### When to Update

1. **Code Changes**: Update relevant docs
2. **Architecture Changes**: Update [Architecture](architecture.md)
3. **User Journey Changes**: Update [User Flows](user-flows.md)
4. **New Features**: Create feature docs
5. **Setup Changes**: Update [Setup Guide](setup.md)

### How to Update

1. Find relevant document
2. Update content
3. Update related links (especially [README.md](README.md))
4. Check all links still work
5. Commit with code changes

### Version Control

- **One commit**: Code + related docs
- **Separate commit**: If ONLY docs being updated
- **Commit Message**: Mention which docs were updated
  ```
  feat: implement route alerts
  - Add route-alert feature implementation
  - Update architecture.md with new schema
  - Add route alert feature documentation
  ```

## Cross-Referencing

### When to Link

- Related features
- Dependencies
- Prerequisites
- See also sections
- Implementation details

### Link Format

```markdown
# Bad Links
- Click here: [Link](setup.md)
- More info: [Link](architecture.md)

# Good Links
- See [Setup Guide](setup.md) for configuration
- Feature architecture explained in [Architecture Overview](architecture.md#route-alerts)
- Related feature: [Another Feature](feature.md)
```

## Documentation Tools

### Markdown Features Used

- **Headings**: H1-H4 for hierarchy
- **Lists**: Numbered and bulleted
- **Code blocks**: Syntax highlighting
- **Tables**: For comparisons
- **Links**: To related docs
- **Emphasis**: Bold and italic
- **Blockquotes**: For important notes

### Tools for Writing

- **Editor**: VSCode with Markdown Preview
- **Linter**: markdownlint (optional)
- **Preview**: GitHub markdown preview

## Keeping Documentation Organized

### Regular Maintenance

- **Monthly**: Review docs for outdated info
- **Per Release**: Update architecture if changed
- **Per Feature**: Add feature documentation
- **When Moving**: Update links if files reorganized

### Cleanup

- Remove outdated docs
- Consolidate similar topics
- Update all links to removed docs
- Update [README.md](README.md) table of contents

## Example: Adding New Feature Documentation

### Step 1: Create Feature Docs
```
docs/
└── my-feature.md
```

### Step 2: Create Component README (if needed)
```
app/my-feature/
├── components/
├── services/
├── types/
└── README.md  # API reference
```

### Step 3: Update docs/README.md
Add to feature table and quick links section

### Step 4: Update architecture.md (if needed)
Add to Features section

### Step 5: Commit
```
feat: add my-feature

- Add feature implementation
- Add docs/my-feature.md
- Add app/my-feature/README.md
- Update docs/README.md with links
```

## Questions?

- Check [README.md](README.md) for quick links
- Review [Architecture](architecture.md) for system overview
- Search docs folder for keywords
- Check related feature docs

---

**Status**: ✅ Up to Date
**Last Updated**: March 24, 2026
**Maintained By**: Development Team
