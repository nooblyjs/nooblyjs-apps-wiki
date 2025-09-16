# CMS Requirements Document

## Project Overview

### Product Vision
Create a powerful, user-friendly Content Management System (CMS) similar to Squarespace that allows users to design, build, and publish professional websites without technical expertise. The system will leverage the existing nooblyjs-core architecture and provide a visual drag-and-drop interface for website creation.

### Target Audience
- Small business owners
- Entrepreneurs
- Creative professionals
- Non-technical users who need professional websites
- Agencies building client websites
- Content creators and bloggers

## System Architecture

### Technology Stack
- **Backend Framework**: Node.js with Express
- **Template Engine**: EJS (Embedded JavaScript)
- **Core Services**: nooblyjs-core (filing, caching, logging, queueing, searching, etc.)
- **Data Storage**: JSON file-based storage with DataManager
- **File Storage**: Multi-provider support (Local, S3, GCP, Git, FTP)
- **Frontend**: HTML5, CSS3, JavaScript (vanilla/lightweight framework)
- **Authentication**: Passport.js integration

### NooblyJS-Core Services Integration

Based on the existing architecture, the CMS will utilize:

```javascript
const services = {
  filing: serviceRegistry.filing('local', { baseDir: './cms-files' }),
  cache: serviceRegistry.cache('memory'),
  logger: serviceRegistry.logger('console'),
  queue: serviceRegistry.queue('memory'),
  search: serviceRegistry.searching('memory'),
  auth: serviceRegistry.authservice(),
  ai: serviceRegistry.aiservice(),
  workflow: serviceRegistry.workflow(),
  notifications: serviceRegistry.notifying()
};
```

### Directory Structure
```
src/cms/
├── index.js                    # Main CMS factory module
├── components/
│   ├── dataManager.js          # JSON-based data persistence
│   ├── templateEngine.js       # EJS template handling
│   ├── siteBuilder.js          # Site generation logic
│   ├── assetManager.js         # Media and asset handling
│   └── themeManager.js         # Theme and template management
├── routes/
│   ├── index.js                # Route registry
│   ├── admin.js                # Admin dashboard routes
│   ├── builder.js              # Site builder API routes
│   ├── templates.js            # Template management routes
│   ├── assets.js               # Asset management routes
│   └── sites.js                # Published site routes
├── views/
│   ├── admin/
│   │   ├── dashboard.ejs       # Main admin interface
│   │   ├── site-builder.ejs    # Visual site builder
│   │   ├── templates.ejs       # Template management
│   │   ├── assets.ejs          # Media library
│   │   └── settings.ejs        # Site settings
│   ├── builder/
│   │   ├── editor.ejs          # Page editor interface
│   │   ├── components.ejs      # Component library
│   │   └── preview.ejs         # Live preview
│   ├── public/
│   │   └── [generated sites]   # Published website files
│   └── themes/
│       ├── default/            # Default theme templates
│       ├── business/           # Business theme
│       └── portfolio/          # Portfolio theme
├── activities/
│   ├── siteGenerator.js        # Background site generation
│   ├── templateProcessor.js    # Template compilation
│   └── assetProcessor.js       # Image optimization, etc.
└── middleware/
    ├── authCheck.js            # Authentication middleware
    ├── siteLoader.js           # Site context loading
    └── themeLoader.js          # Theme context loading
```

## Core Features

### 1. Visual Site Builder
- **Drag-and-Drop Interface**: Intuitive visual editor for page layout
- **Component Library**: Pre-built components (headers, footers, galleries, forms)
- **Real-time Preview**: Live preview of changes as users build
- **Responsive Design**: Automatic mobile/tablet optimization
- **Grid System**: Flexible layout grid for precise positioning

### 2. Template System
- **Professional Themes**: Multiple pre-designed themes
- **Theme Customization**: Color schemes, fonts, spacing controls
- **Custom Templates**: Ability to create custom page templates
- **Template Marketplace**: Extensible theme ecosystem

### 3. Content Management
- **Page Management**: Create, edit, delete pages
- **Content Blocks**: Text, images, videos, forms, maps
- **SEO Tools**: Meta tags, descriptions, URL structure
- **Media Library**: Centralized asset management
- **Content Scheduling**: Publish/unpublish scheduling

### 4. E-commerce Integration
- **Product Catalog**: Product management system
- **Shopping Cart**: Built-in cart functionality
- **Payment Processing**: Integration with payment gateways
- **Inventory Management**: Stock tracking and alerts
- **Order Management**: Order processing workflow

### 5. User Management
- **Multi-user Support**: Different user roles and permissions
- **Client Access**: Allow clients to edit specific content
- **User Analytics**: Track user behavior and engagement
- **Access Controls**: Fine-grained permission system

### 6. Publishing & Hosting
- **One-click Publishing**: Deploy sites instantly
- **Domain Management**: Custom domain support
- **SSL Certificates**: Automatic HTTPS
- **CDN Integration**: Fast global content delivery
- **Backup System**: Automated site backups

## Technical Requirements

### Data Models

#### Sites
```javascript
{
  id: "unique-site-id",
  name: "My Business Site",
  domain: "mybusiness.com",
  subdomain: "mybusiness.mysite.com",
  theme: "business-pro",
  status: "published", // draft, published, archived
  userId: "owner-user-id",
  settings: {
    title: "My Business",
    description: "Professional services...",
    logo: "/assets/logo.png",
    favicon: "/assets/favicon.ico",
    analytics: "GA-123456789",
    seo: {
      metaTitle: "Custom meta title",
      metaDescription: "Custom description",
      keywords: ["business", "services"]
    }
  },
  pages: ["page-id-1", "page-id-2"],
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-15T10:30:00Z",
  publishedAt: "2025-01-15T10:30:00Z"
}
```

#### Pages
```javascript
{
  id: "unique-page-id",
  siteId: "site-id",
  name: "Home",
  slug: "home",
  title: "Welcome to My Business",
  type: "page", // page, post, product
  status: "published",
  template: "home-template",
  content: {
    sections: [
      {
        id: "section-1",
        type: "hero",
        settings: {
          backgroundImage: "/assets/hero-bg.jpg",
          title: "Welcome",
          subtitle: "We provide excellent services",
          buttonText: "Learn More",
          buttonLink: "/about"
        }
      }
    ]
  },
  seo: {
    metaTitle: "Home - My Business",
    metaDescription: "Welcome to our business...",
    keywords: ["home", "business"]
  },
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-15T10:30:00Z"
}
```

#### Components
```javascript
{
  id: "component-id",
  name: "Hero Section",
  type: "hero",
  category: "headers",
  description: "Full-width hero section with background image",
  thumbnail: "/assets/components/hero-thumb.jpg",
  template: "hero.ejs",
  settings: {
    backgroundImage: {
      type: "image",
      label: "Background Image",
      default: ""
    },
    title: {
      type: "text",
      label: "Title",
      default: "Your Title Here"
    },
    subtitle: {
      type: "textarea",
      label: "Subtitle",
      default: "Your subtitle here"
    }
  },
  createdAt: "2025-01-01T00:00:00Z"
}
```

### API Endpoints

#### Site Management
- `GET /api/cms/sites` - List user's sites
- `POST /api/cms/sites` - Create new site
- `GET /api/cms/sites/:id` - Get site details
- `PUT /api/cms/sites/:id` - Update site
- `DELETE /api/cms/sites/:id` - Delete site
- `POST /api/cms/sites/:id/publish` - Publish site
- `POST /api/cms/sites/:id/unpublish` - Unpublish site

#### Page Management
- `GET /api/cms/sites/:siteId/pages` - List site pages
- `POST /api/cms/sites/:siteId/pages` - Create new page
- `GET /api/cms/pages/:id` - Get page details
- `PUT /api/cms/pages/:id` - Update page
- `DELETE /api/cms/pages/:id` - Delete page

#### Asset Management
- `GET /api/cms/assets` - List assets
- `POST /api/cms/assets/upload` - Upload asset
- `DELETE /api/cms/assets/:id` - Delete asset
- `POST /api/cms/assets/:id/optimize` - Optimize image

#### Template Management
- `GET /api/cms/templates` - List available templates
- `GET /api/cms/templates/:id` - Get template details
- `POST /api/cms/templates` - Create custom template

### Database Schema (JSON Files)

#### sites.json
```json
[
  {
    "id": "site-123",
    "name": "My Portfolio",
    "domain": "portfolio.com",
    "theme": "creative-pro",
    "status": "published",
    "userId": "user-456"
  }
]
```

#### pages.json
```json
[
  {
    "id": "page-789",
    "siteId": "site-123",
    "name": "About",
    "slug": "about",
    "content": { /* page content */ }
  }
]
```

#### templates.json
```json
[
  {
    "id": "template-001",
    "name": "Business Homepage",
    "category": "business",
    "preview": "/templates/business/preview.jpg"
  }
]
```

#### assets.json
```json
[
  {
    "id": "asset-001",
    "filename": "hero-image.jpg",
    "url": "/uploads/hero-image.jpg",
    "size": 1024000,
    "type": "image/jpeg"
  }
]
```

## User Interface Requirements

### Admin Dashboard
- **Site Overview**: List of user's sites with status indicators
- **Quick Actions**: Create new site, duplicate site, site settings
- **Analytics Summary**: Traffic, pages views, conversion metrics
- **Recent Activity**: Latest changes and updates

### Visual Editor
- **Canvas Area**: Main editing workspace
- **Component Sidebar**: Drag-and-drop component library
- **Properties Panel**: Component settings and styling options
- **Toolbar**: Undo/redo, save, preview, publish actions
- **Layer Panel**: Page structure and element hierarchy

### Template Gallery
- **Category Filters**: Business, portfolio, blog, e-commerce
- **Search Functionality**: Find templates by keyword
- **Preview Mode**: Full-screen template previews
- **Customization Options**: Color schemes, font choices

### Media Library
- **Upload Interface**: Drag-and-drop file uploads
- **File Organization**: Folders and tagging system
- **Image Editor**: Basic cropping and optimization
- **Stock Integration**: Access to stock photo libraries

## Security Requirements

### Authentication & Authorization
- **User Registration**: Email verification and secure passwords
- **Multi-factor Authentication**: Optional 2FA for enhanced security
- **Role-based Access**: Admin, editor, viewer permissions
- **Session Management**: Secure session handling

### Data Protection
- **Input Validation**: Sanitize all user inputs
- **XSS Prevention**: Escape output and validate content
- **CSRF Protection**: Token-based CSRF prevention
- **SQL Injection**: Use parameterized queries (though using JSON files)

### File Security
- **Upload Restrictions**: Limit file types and sizes
- **Virus Scanning**: Scan uploaded files for malware
- **Secure Storage**: Encrypted file storage options
- **Access Controls**: Restrict file access based on permissions

## Performance Requirements

### Response Times
- **Page Load**: < 3 seconds for published sites
- **Editor Response**: < 1 second for interface interactions
- **Image Optimization**: Automatic compression and resizing
- **Caching Strategy**: Leverage nooblyjs-core caching service

### Scalability
- **Concurrent Users**: Support 100+ simultaneous editors
- **Site Limits**: No hard limits on pages or content
- **Storage Efficiency**: Optimize JSON file operations
- **CDN Integration**: Global content delivery

## SEO & Marketing Features

### Search Engine Optimization
- **Meta Tag Management**: Title, description, keywords
- **Structured Data**: Schema.org markup generation
- **XML Sitemaps**: Automatic sitemap generation
- **Robot.txt**: Customizable robots.txt files

### Analytics Integration
- **Google Analytics**: Easy GA4 integration
- **Custom Events**: Track user interactions
- **Performance Metrics**: Core Web Vitals monitoring
- **A/B Testing**: Built-in testing framework

### Marketing Tools
- **Email Integration**: Newsletter signup forms
- **Social Media**: Social sharing buttons and feeds
- **Contact Forms**: Customizable contact forms
- **Lead Generation**: Lead capture and management

## Integration Requirements

### Third-party Services
- **Payment Gateways**: Stripe, PayPal, Square integration
- **Email Services**: SendGrid, Mailchimp integration
- **Social Platforms**: Facebook, Instagram, Twitter feeds
- **Maps**: Google Maps, OpenStreetMap integration

### API Integrations
- **REST API**: Full REST API for external integrations
- **Webhooks**: Event-driven webhooks for automation
- **Import/Export**: Site backup and migration tools
- **Plugin System**: Extensible plugin architecture

## Mobile Responsiveness

### Responsive Design
- **Mobile-first**: Design for mobile, enhance for desktop
- **Touch Optimization**: Touch-friendly interface elements
- **Progressive Web App**: PWA capabilities for mobile users
- **Performance**: Optimized for mobile networks

### Mobile Editor
- **Touch Interface**: Touch-optimized editing experience
- **Simplified UI**: Streamlined mobile interface
- **Offline Capability**: Basic offline editing support
- **Quick Actions**: Fast access to common functions

## Quality Assurance

### Testing Strategy
- **Unit Testing**: Component and function testing
- **Integration Testing**: API and service integration tests
- **User Testing**: Usability testing with target users
- **Performance Testing**: Load and stress testing

### Browser Compatibility
- **Modern Browsers**: Chrome, Firefox, Safari, Edge
- **Mobile Browsers**: iOS Safari, Chrome Mobile
- **Accessibility**: WCAG 2.1 AA compliance
- **Progressive Enhancement**: Graceful degradation

## Deployment & Operations

### Hosting Options
- **Self-hosted**: Deploy on user's own infrastructure
- **Managed Hosting**: Provide managed hosting services
- **Cloud Integration**: AWS, GCP, Azure deployment options
- **Edge Computing**: Edge deployment for global performance

### Monitoring & Maintenance
- **Application Monitoring**: Performance and error tracking
- **Automated Backups**: Regular data and site backups
- **Update Management**: Automatic security and feature updates
- **Support System**: Built-in help and support tools

## Success Metrics

### User Engagement
- **Time to First Site**: Measure onboarding efficiency
- **Feature Adoption**: Track feature usage and adoption
- **User Retention**: Monthly and yearly retention rates
- **Support Tickets**: Reduce support requests through UX

### Business Metrics
- **Site Creation Rate**: Sites created per month
- **Publishing Rate**: Sites that go live vs. abandoned
- **User Growth**: New user acquisition and growth
- **Revenue per User**: Monetization effectiveness

## Future Enhancements

### Phase 2 Features
- **AI-powered Design**: Automated design suggestions
- **Advanced E-commerce**: Inventory management, shipping
- **Multi-language Support**: International localization
- **White-label Solutions**: Branded CMS for agencies

### Phase 3 Features
- **Collaborative Editing**: Real-time collaborative features
- **Version Control**: Git-like version control for sites
- **Advanced Analytics**: Custom analytics dashboard
- **Marketplace**: Template and plugin marketplace

## Implementation Timeline

### Phase 1 (Months 1-3): Core Foundation
- Basic site builder infrastructure
- Template system implementation
- User authentication and management
- File upload and asset management

### Phase 2 (Months 4-6): Visual Editor
- Drag-and-drop page builder
- Component library development
- Real-time preview functionality
- Mobile responsive editing

### Phase 3 (Months 7-9): Publishing & Optimization
- Site publishing system
- SEO tools and optimization
- Performance optimization
- Basic e-commerce features

### Phase 4 (Months 10-12): Advanced Features
- Advanced customization options
- Third-party integrations
- Analytics and reporting
- Mobile app development

## Conclusion

This CMS will leverage the robust nooblyjs-core architecture to provide a comprehensive, user-friendly website building platform. By following Squarespace's proven UX patterns while implementing our own technical innovations, we can create a competitive product that serves both technical and non-technical users effectively.

The modular architecture ensures scalability and maintainability, while the integration with nooblyjs-core services provides enterprise-grade reliability and performance.