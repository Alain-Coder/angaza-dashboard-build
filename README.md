# Angaza Foundation Dashboard

A comprehensive management dashboard for the Angaza Foundation, designed to empower and uplift marginalized communities in Malawi. This Next.js application provides a complete solution for managing foundation operations, from donations and volunteer coordination to community impact tracking and financial management.

## 🌟 Overview

The Angaza Foundation Dashboard is a full-featured web application built with modern technologies to support the foundation's mission of community empowerment in Malawi. The dashboard features a professional purple and white design that matches the foundation's branding and provides an intuitive interface for managing all aspects of foundation operations.

## 🚀 Features

### Core Modules

#### 1. **Overview Dashboard**
- Real-time metrics and KPI tracking
- Live donation counter with automatic updates
- Project status overview with progress indicators
- Volunteer activity monitoring
- Event calendar integration

#### 2. **Project Management**
- Comprehensive project tracking with progress monitoring
- Budget allocation and expense tracking
- Timeline management with milestone tracking
- Resource allocation and team assignment
- Project status reporting and analytics

#### 3. **Event Management**
- Event creation and scheduling
- RSVP tracking and attendee management
- Pachangu ticketing integration for paid events
- Event analytics and feedback collection
- Venue booking coordination

#### 4. **Personnel Management**
- Volunteer registration and profile management
- Time tracking with clock-in/out functionality
- Timesheet approval workflows
- Skill-based volunteer matching
- Performance tracking and recognition

#### 5. **Donation Management**
- Real-time donation tracking
- Pachangu payment gateway integration
- Donor relationship management
- Recurring donation setup
- Tax receipt generation
- Donation analytics and reporting

#### 6. **Financial Management**
- Financial request submission and approval workflows
- Liquidation tracking with overdue alerts
- Budget vs. actual comparison
- Expense categorization and reporting
- Financial compliance monitoring
- **Business Rule**: Users cannot submit new financial requests until current requests are fully liquidated

#### 7. **Venue & Resource Booking**
- Facility booking management
- Resource allocation tracking
- Booking conflict resolution
- Availability calendar
- Equipment maintenance scheduling

### Community Impact Modules

#### 8. **Beneficiary Management**
- Individual beneficiary profiles with demographics
- Program enrollment tracking
- Impact assessment and progress monitoring
- Family and household data management
- Service delivery history

#### 9. **Community Mapping**
- Interactive geographic visualization of communities served
- Location-based service delivery tracking
- Community demographics and needs assessment
- Geographic impact analysis
- Remote area accessibility planning

#### 10. **Impact Measurement**
- Before/after assessment tracking
- Outcome measurement and KPI monitoring
- Success story documentation
- Impact reporting and visualization
- Long-term trend analysis

#### 11. **Program Portfolio Management**
- Multi-program coordination and oversight
- Program effectiveness measurement
- Resource allocation across programs
- Cross-program impact analysis
- Program sustainability planning

#### 12. **Resource Distribution**
- Supply chain management
- Distribution tracking and logistics
- Inventory management with stock control
- Recipient verification
- Distribution impact assessment
- Real-time stock level monitoring
- Automated stock depletion alerts
- Comprehensive distribution history

### Partnership & Stakeholder Management

#### 13. **Partner Organization Management**
- Partner profile and relationship tracking
- Collaboration history and project involvement
- Communication logs and contact management
- Partnership agreement tracking
- Joint project coordination

#### 14. **Grant & Funding Management**
- Grant application tracking and management
- Funding source diversification
- Compliance requirement monitoring
- Reporting deadline management
- Financial accountability and transparency

#### 15. **Reporting & Analytics**
- Comprehensive dashboard analytics
- Custom report generation (CSV/PDF)
- Real-time data visualization
- Stakeholder reporting automation
- Performance metrics tracking

#### 16. **Administration**
- User management with role-based access control
- System configuration and settings
- Audit log tracking
- Data backup and recovery
- Security monitoring and 2FA support
- File and document management
  - Role-based file access
  - Executive director oversight
  - Upload and organization tools
  - Folder hierarchy with subfolder support
  - Grid and list view modes
  - Rename, preview, and download capabilities

## 🛠 Technology Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS v4** - Modern utility-first CSS framework
- **shadcn/ui** - High-quality React component library
- **Lucide React** - Beautiful icon library
- **Recharts** - Data visualization and charting

### Backend Integration
- **Firebase Firestore** - Real-time NoSQL database
- **Firebase Authentication** - User authentication and authorization
- **Firebase Cloud Functions** - Serverless backend logic
- **Firebase Storage** - File and media storage

### External Integrations
- **Pachangu** - Payment gateway for donations and event ticketing
- **Vercel Analytics** - Performance and usage analytics
- **Local File Storage** - Document management system

## 🎨 Design System

### Color Palette
- **Primary**: Purple (#7c3aed) - Matching Angaza Foundation branding
- **Secondary**: Light gray (#f3f4f6) for subtle backgrounds
- **Accent**: Lighter purple (#8b5cf6) for interactive elements
- **Background**: Clean white (#ffffff) for optimal readability
- **Text**: Dark gray (#1f2937) for excellent contrast

### Typography
- **Primary Font**: System UI fonts - Modern, readable sans-serif
- **Monospace Font**: System monospace fonts - For code and data display
- **Font Weights**: Regular (400), Medium (500), Semibold (600), Bold (700)

### Layout
- **Sidebar Navigation**: Fixed left sidebar with icon-based navigation
- **Responsive Design**: Mobile-first approach with breakpoint optimization
- **Card-based Layout**: Consistent card components for content organization
- **Professional Spacing**: Consistent padding and margins throughout

## 🔧 Installation & Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn package manager
- Firebase project setup
- Pachangu merchant account (for payment integration)

### Local Development

1. **Clone the repository**
\`\`\`bash
git clone <repository-url>
cd angaza-foundation-dashboard
\`\`\`

2. **Install dependencies**
\`\`\`bash
npm install
# or
yarn install
\`\`\`

3. **Environment Configuration**
Create a `.env.local` file with the following variables:
\`\`\`env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Pachangu Integration
PACHANGU_API_KEY=your_pachangu_api_key
PACHANGU_MERCHANT_ID=your_merchant_id
NEXT_PUBLIC_PACHANGU_PUBLIC_KEY=your_public_key

# Application URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
\`\`\`

4. **Run the development server**
\`\`\`bash
npm run dev
# or
yarn dev
\`\`\`

5. **Open your browser**
Navigate to [http://localhost:3000](http://localhost:3000)

### Production Deployment

The application is optimized for deployment on Vercel:

1. **Deploy to Vercel**
\`\`\`bash
vercel --prod
\`\`\`

2. **Configure Environment Variables**
Add all environment variables in the Vercel dashboard under Project Settings > Environment Variables.

3. **Set up Firebase Security Rules**
Configure Firestore security rules for production use.

## 🔒 Security Considerations

### Current Security Measures
- **Client-side validation** for all form inputs
- **Role-based access control** through navigation restrictions
- **Input sanitization** for search and filter functionality
- **Secure environment variable handling**
- **HTTPS enforcement** in production

### Security Recommendations

#### High Priority
1. **Implement server-side authentication** using Firebase Auth
2. **Add Firestore security rules** to protect data access
3. **Implement proper session management** with secure tokens
4. **Add CSRF protection** for form submissions
5. **Implement rate limiting** for API endpoints

#### Medium Priority
1. **Add input validation** on the server side
2. **Implement audit logging** for sensitive operations
3. **Add two-factor authentication** for admin users
4. **Secure file upload validation** for document management
5. **Implement data encryption** for sensitive information

#### Security Audit Findings
- ⚠️ **Missing Authentication**: Currently no server-side authentication implementation
- ⚠️ **Client-side Only**: All logic runs on the client without server validation
- ⚠️ **No Data Protection**: Firestore security rules need implementation
- ⚠️ **Missing CSRF Protection**: Forms vulnerable to cross-site request forgery
- ⚠️ **No Rate Limiting**: API endpoints need protection against abuse

## 📊 Data Models

### Core Entities
- **Users**: Staff, volunteers, and administrators
- **Projects**: Foundation initiatives and programs
- **Events**: Meetings, workshops, and community gatherings
- **Donations**: Financial contributions and donor information
- **Beneficiaries**: Community members served by the foundation
- **Partners**: Collaborating organizations and stakeholders
- **Grants**: Funding sources and compliance tracking

### Relationships
- Users can be assigned to multiple projects
- Projects can have multiple events and beneficiaries
- Donations can be linked to specific projects or general fund
- Partners can collaborate on multiple projects
- Grants can fund multiple projects

## 📚 Documentation

For detailed information about specific features, see the documentation in the `docs` directory:

- [File Management System](./docs/file-management.md)
- [Resource Distribution System](./docs/resource-distribution.md)

## 🚀 Future Enhancements

### Planned Features
1. **Mobile Application** - React Native companion app
2. **Offline Functionality** - PWA capabilities for remote areas
3. **Multi-language Support** - English and Chichewa localization
4. **Advanced Analytics** - Machine learning insights
5. **API Integration** - RESTful API for third-party integrations
6. **Automated Reporting** - Scheduled report generation
7. **SMS Notifications** - Community outreach via SMS
8. **Blockchain Integration** - Transparent donation tracking

### Technical Improvements
1. **Server-side Rendering** - Enhanced SEO and performance
2. **Caching Strategy** - Redis integration for better performance
3. **Database Optimization** - Query optimization and indexing
4. **Testing Suite** - Comprehensive unit and integration tests
5. **CI/CD Pipeline** - Automated testing and deployment
6. **Monitoring & Logging** - Application performance monitoring

## 🤝 Contributing

### Development Guidelines
1. Follow TypeScript best practices
2. Use consistent naming conventions
3. Write comprehensive comments for complex logic
4. Implement proper error handling
5. Follow the established design system

### Code Style
- Use Prettier for code formatting
- Follow ESLint rules for code quality
- Use semantic commit messages
- Write descriptive variable and function names

## 📄 License

This project is proprietary software developed for the Angaza Foundation. All rights reserved.

## 📞 Support

For technical support or questions about the dashboard:
- **Email**: tech@angazafoundation.org
- **Website**: [https://angazafoundation.org](https://angazafoundation.org)
- **Documentation**: Internal wiki and user guides

## 🙏 Acknowledgments

- **Angaza Foundation Team** - For their vision and requirements
- **shadcn/ui** - For the excellent component library
- **Vercel** - For hosting and deployment platform
- **Firebase** - For backend infrastructure
- **Pachangu** - For payment processing services

---

**Built with ❤️ for community empowerment in Malawi**
