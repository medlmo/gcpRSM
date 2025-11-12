# Design Guidelines: Moroccan Public Procurement Management System

## Design Approach

**Selected Framework**: Material Design for Government/Enterprise Applications

**Justification**: This is a data-intensive, workflow-driven government administration tool requiring maximum clarity, accessibility, and efficiency. Material Design provides the robust component library and interaction patterns needed for complex enterprise applications while maintaining visual polish.

**Core Principles**:
- Data clarity and scannability over visual flourish
- Predictable, learnable interaction patterns
- Accessibility and internationalization (French/Arabic support)
- Professional credibility appropriate for government context

## Typography System

**Primary Font**: Roboto (Material Design standard)
- Headings: Roboto Medium (500)
  - H1: text-3xl (page titles)
  - H2: text-2xl (section headers)
  - H3: text-xl (card/panel titles)
  - H4: text-lg (subsection headers)
- Body: Roboto Regular (400)
  - Base: text-base (forms, tables, general content)
  - Small: text-sm (metadata, secondary info)
  - Tiny: text-xs (labels, hints)
- UI Elements: Roboto Medium (500) for buttons, tabs, menu items

**Arabic Support**: Add Noto Sans Arabic via Google Fonts for bilingual capability

## Layout System

**Spacing Scale**: Use Tailwind units 2, 4, 6, 8, 12, 16, 24 exclusively
- Component padding: p-4 to p-6
- Section spacing: gap-8, space-y-8
- Page margins: px-6 md:px-8 lg:px-12
- Card spacing: p-6

**Grid Structure**:
- Main dashboard: 3-column metrics grid (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- Data tables: Full-width with horizontal scroll on mobile
- Form layouts: 2-column on desktop (grid-cols-1 lg:grid-cols-2), single-column mobile
- Sidebar navigation: Fixed left sidebar (w-64) with collapsible mobile drawer

**Container Strategy**:
- Application shell: Full viewport with fixed navigation
- Content area: max-w-7xl mx-auto with responsive padding
- Forms and details: max-w-4xl for optimal readability
- Wide tables: Full container width with overflow-x-auto

## Component Library

### Navigation
**Top Bar** (sticky, h-16):
- Logo/Institution name (left)
- Global search bar (center-left, w-96)
- User menu, notifications bell, language toggle (right)
- Breadcrumb navigation below (h-12, border-b)

**Sidebar Navigation** (fixed left, w-64):
- Collapsible sections for: Appels d'offres, Fournisseurs, Marchés, Exécution, Rapports, Administration
- Active state with subtle left border accent
- Icon + label pattern using Material Icons
- Role-based visibility

### Dashboard Components
**Metric Cards**:
- Elevated cards (shadow-md) with p-6
- Large number display (text-4xl font-bold)
- Label below (text-sm)
- Trend indicator (arrow + percentage) where applicable
- Subtle icon in top-right corner

**Data Tables**:
- Zebra striping for row differentiation
- Fixed header on scroll (sticky top-0)
- Sortable columns with arrow indicators
- Inline action buttons (icon-only) in rightmost column
- Pagination controls at bottom (items per page selector + page navigation)
- Bulk selection with top checkbox column
- Row hover state for interactivity feedback

**Charts** (using Chart.js):
- Line graphs for budget trends over time
- Bar charts for comparative analysis (participation rates, savings)
- Donut charts for status distribution
- Responsive with min-h-80
- Subtle grid lines, clear axis labels

### Forms
**Standard Form Pattern**:
- Label above input (text-sm font-medium, mb-2)
- Full-width inputs with border and focus ring
- Help text below (text-xs, text-gray-600)
- Required field indicator (red asterisk)
- Error messages in text-sm with warning icon

**Input Types**:
- Text fields: h-10 with px-3, rounded border
- Dropdowns: Custom select with chevron icon
- Date pickers: Calendar popup interface
- File uploads: Drag-and-drop zone with file list preview
- Rich text editor for descriptions (Quill.js integration)

**Form Layout**:
- Multi-step wizard for complex processes (Appel d'offres creation)
- Progress indicator at top showing current step
- Actions bar at bottom (Cancel, Previous, Next/Submit)
- Validation on blur with inline error display

### Content Displays
**Tender Cards** (Appels d'offres listing):
- Elevated cards in grid (gap-6)
- Header: Reference number + Status badge
- Body: Title (font-medium, text-lg), Organization, Deadline (with countdown if <7 days)
- Footer: Budget estimate, Action button
- Status badges: outlined pills with distinct visual states (Ouvert, Clôturé, Attribué)

**Document Viewer**:
- Embedded PDF viewer (PDF.js) for DCE documents
- Sidebar with document outline/sections
- Download and print actions in header
- Annotation capability for internal review

**Timeline Component** (Execution tracking):
- Vertical timeline with date markers on left
- Event cards: Order de service, Amendments, Payments
- Expandable detail view
- Status icons (checkmark, warning, pending)

### Action Elements
**Primary Buttons**: 
- Solid filled style, h-10, px-6, rounded
- Use for main actions (Créer, Soumettre, Valider)

**Secondary Buttons**:
- Outlined style matching primary
- Use for alternative actions (Annuler, Retour)

**Icon Buttons**:
- h-10 w-10, circular or square with rounded corners
- Use in tables and toolbars (Edit, Delete, View, Export)

**Floating Action Button**:
- Fixed bottom-right for primary creation action on list views
- Circular, large (h-14 w-14), with drop shadow

### Alerts & Notifications
**Toast Notifications**:
- Slide in from top-right
- Success, warning, error, info variants with icons
- Auto-dismiss after 5s with manual close option

**Alert Banners**:
- Full-width at page top for critical system messages
- Dismissible with close button
- Icons matching severity level

**Notification Center**:
- Dropdown from bell icon
- List of recent alerts with timestamps
- Mark as read functionality
- Link to full notification history page

## Page Templates

### Dashboard Homepage
- 4-metric summary cards (top row)
- 2-column layout below: Recent tenders list (left, 2/3 width) + Upcoming deadlines (right, 1/3 width)
- Quick actions toolbar below metrics
- Activity feed at bottom showing recent system actions

### Tender Management
- Filter sidebar (left, w-72): Date range, Status, Budget range, Organization
- Main content: Grid of tender cards with search above
- Top actions bar: New tender button, Export, Bulk actions
- Advanced search collapsible panel

### Tender Detail View
- Header: Reference, title, status badge
- Tab navigation: Overview, Documents, Submissions, Evaluation, Contract
- Two-column layout: Main content (left), Metadata sidebar (right, w-80)
- Fixed action bar at bottom with context-specific buttons

### Form Pages (Create/Edit)
- Centered form container (max-w-4xl)
- Card-based layout with sections
- Sticky save/cancel buttons at bottom of viewport
- Auto-save draft indicator

### Reports Page
- Filter panel at top (collapsible)
- Export format selector (PDF, Excel)
- Preview area with pagination
- Print-optimized CSS for generated reports

## Responsive Behavior

**Breakpoints**:
- Mobile: < 768px (single column, drawer navigation)
- Tablet: 768px - 1024px (2-column where appropriate)
- Desktop: > 1024px (full multi-column layouts)

**Mobile Optimizations**:
- Hamburger menu for sidebar
- Stack metric cards vertically
- Horizontal scroll for wide tables
- Simplified charts with tap for details
- Bottom tab bar for primary navigation on mobile

## Interactions & Feedback

**Loading States**:
- Skeleton screens for initial page loads
- Spinner overlays for actions (submissions, imports)
- Progress bars for multi-step operations (file uploads, batch processing)

**Empty States**:
- Illustration + helpful text + primary action button
- Guide users to first action (e.g., "Create your first tender")

**Animations**: Minimal and purposeful
- Page transitions: 200ms fade
- Dropdown/modal: 150ms scale + fade
- No scroll-triggered animations
- Focus on instant feedback over decoration

## Accessibility
- WCAG 2.1 AA compliance
- Keyboard navigation for all interactive elements
- Screen reader labels (aria-label) on icon-only buttons
- Focus indicators visible and distinct
- Form validation accessible via aria-live regions

---

This design creates a professional, efficient enterprise application optimized for the complex workflows of public procurement management while maintaining visual polish and modern UX standards.