# Système de Gestion des Marchés Publics - Administration Marocaine

## Vue d'ensemble

Application web complète de gestion des marchés publics pour une administration marocaine. Le système numérise le processus complet de passation, de suivi et d'exécution des marchés publics conformément à la réglementation marocaine.

## État actuel du projet

**Date**: 12 novembre 2025
**Version**: 1.0.0 (MVP en cours de développement)
**Stack technique**: Full-stack JavaScript avec React, Express, PostgreSQL

### Fonctionnalités implémentées (Frontend)

#### 1. Architecture et Design
- ✅ Système de design professionnel avec couleurs administration marocaine (vert et rouge)
- ✅ Mode sombre/clair avec ThemeProvider
- ✅ Sidebar de navigation collapsible
- ✅ Design responsive (mobile, tablette, desktop)
- ✅ Composants Shadcn UI personnalisés
- ✅ Typographie Roboto pour interface professionnelle

#### 2. Pages et fonctionnalités
- ✅ **Dashboard**: Vue d'ensemble avec KPIs, échéances à venir, activité récente
- ✅ **Appels d'offres**: Liste avec filtres avancés, recherche, statuts, catégories
- ✅ **Fournisseurs**: Gestion complète avec performances et scores
- ✅ **Offres**: Évaluation et comparaison des soumissions
- ✅ **Marchés**: Suivi des contrats avec progression et pénalités
- ✅ **Exécution**: Gestion ordres de service, avenants, décomptes (onglets)
- ✅ **Rapports**: Générateur de rapports personnalisables (PDF, Excel)
- ✅ **Utilisateurs**: Gestion des utilisateurs et rôles
- ✅ **Paramètres**: Configuration système complète

#### 3. Schéma de données
- ✅ Modèles complets pour toutes les entités (users, suppliers, tenders, bids, contracts, service_orders, amendments, invoices, notifications)
- ✅ Relations Drizzle ORM configurées
- ✅ Schémas de validation Zod pour toutes les entités
- ✅ Types TypeScript générés automatiquement

### Dernières modifications (Phase 2 - Backend terminée)

**Backend implémenté**:
- ✅ API REST complète pour toutes les entités (CRUD complet)
- ✅ Base de données PostgreSQL configurée avec Drizzle ORM
- ✅ Schéma de base de données poussé et opérationnel
- ✅ Routes API pour: users, suppliers, tenders, bids, contracts, service orders, amendments, invoices, notifications
- ✅ Validation des données avec Zod sur toutes les routes
- ✅ Dashboard stats endpoint avec calculs agrégés
- ✅ Gestion des erreurs et codes de statut HTTP appropriés

### En cours de développement

**Phase 3 - Intégration** (en cours):
- Connexion frontend-backend (TanStack Query)
- Gestion d'état complète
- États de chargement et erreurs
- Tests end-to-end
- Optimisations de performance

**Fonctionnalités avancées** (à venir):
- Module de scraping marchespublics.gov.ma (node-cron + cheerio)
- Système de notifications email (nodemailer)
- Authentification JWT avec gestion des rôles
- Génération de documents PDF (PV, contrats, décomptes)
- Export Excel pour rapports

## Structure du projet

```
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/               # Composants Shadcn UI
│   │   │   ├── theme-provider.tsx
│   │   │   ├── theme-toggle.tsx
│   │   │   └── app-sidebar.tsx
│   │   ├── pages/
│   │   │   ├── dashboard.tsx
│   │   │   ├── tenders.tsx
│   │   │   ├── suppliers.tsx
│   │   │   ├── bids.tsx
│   │   │   ├── contracts.tsx
│   │   │   ├── execution.tsx
│   │   │   ├── reports.tsx
│   │   │   ├── users.tsx
│   │   │   └── settings.tsx
│   │   ├── lib/
│   │   ├── App.tsx
│   │   └── index.css
│   └── index.html
├── server/
│   ├── index.ts
│   ├── routes.ts
│   └── storage.ts
├── shared/
│   └── schema.ts              # Schéma complet de la base de données
└── design_guidelines.md        # Directives de design
```

## Modèle de données

### Entités principales

1. **Users** (Utilisateurs)
   - Rôles: admin, marches_manager, ordonnateur, technical_service
   - Authentification et gestion des permissions

2. **Suppliers** (Fournisseurs)
   - Informations entreprise (RC, ICE, contacts)
   - Score de performance
   - Statut (actif, suspendu, blacklisté)

3. **Tenders** (Appels d'offres)
   - Référence, titre, description
   - Type de procédure (AO ouvert, restreint, consultation, concours)
   - Budget estimatif, dates limites
   - Import automatique depuis marchespublics.gov.ma

4. **Bids** (Offres)
   - Montants proposés et finaux
   - Scores techniques et financiers
   - Classement et attribution

5. **Contracts** (Marchés)
   - Montant contractuel, dates
   - Calcul automatique des pénalités de retard
   - Suivi d'avancement

6. **ServiceOrders** (Ordres de service)
   - Types: démarrage, suspension, reprise, modification
   - Dates et descriptions

7. **Amendments** (Avenants)
   - Prolongation délais, révision prix, modification objet
   - Ajustements budgétaires

8. **Invoices** (Décomptes)
   - Avance, provisoires, définitifs
   - Calculs: montant brut, retenue, pénalités, net à payer
   - Pourcentage d'avancement

9. **Notifications** (Alertes)
   - Échéances, paiements, expirations
   - Envoi par email planifié

## Configuration du design

### Couleurs principales
- **Primaire**: Vert marocain `hsl(142 70% 35%)` - Appels d'offres, actions principales
- **Destructive**: Rouge `hsl(0 72% 45%)` - Alertes, pénalités, actions critiques
- **Accent**: Vert clair `hsl(142 15% 95%)` - Éléments secondaires
- **Graphiques**: 
  - Chart-1: Vert `hsl(142 70% 35%)`
  - Chart-2: Rouge `hsl(0 72% 45%)`
  - Chart-3: Bleu `hsl(210 80% 45%)`
  - Chart-4: Jaune `hsl(43 90% 50%)`
  - Chart-5: Violet `hsl(280 60% 50%)`

### Typographie
- **Police principale**: Roboto (Google Fonts)
- **Police arabe**: Noto Sans Arabic (support bilingue)
- **Hiérarchie**: 
  - H1: 3xl (titres de page)
  - H2: 2xl (sections)
  - H3: xl (cartes)
  - Body: base (contenu)

### Espacements
- Padding pages: 6 (mobile) → 8 (desktop)
- Gap entre cartes: 4-6
- Padding cartes: 6

## Technologies utilisées

### Frontend
- **React 18** avec TypeScript
- **Wouter** pour routing
- **TanStack Query** pour data fetching
- **React Hook Form** + Zod pour formulaires
- **Shadcn UI** pour composants
- **Tailwind CSS** pour styling
- **Lucide React** pour icônes
- **date-fns** pour dates (locale française)

### Backend (à implémenter)
- **Express.js** pour serveur API
- **PostgreSQL** (Neon) pour base de données
- **Drizzle ORM** pour gestion BD
- **Node-cron** pour tâches planifiées
- **Cheerio** pour scraping web
- **Nodemailer** pour emails

### Développement
- **Vite** pour build et dev server
- **TypeScript** pour type safety
- **ESLint** pour code quality

## Prochaines étapes

### Phase 2 - Backend (en cours)
1. Créer la base de données PostgreSQL
2. Implémenter les routes API REST
3. Développer la logique métier
4. Configurer l'authentification JWT
5. Implémenter le module d'import automatique
6. Mettre en place le système de notifications

### Phase 3 - Intégration
1. Connecter toutes les pages aux APIs
2. Implémenter la gestion d'état complète
3. Ajouter les états de chargement et erreurs
4. Tests end-to-end avec Playwright
5. Optimisations de performance

## Conventions de code

### Nommage
- **Composants**: PascalCase (ex: `AppSidebar`)
- **Fichiers**: kebab-case (ex: `app-sidebar.tsx`)
- **Variables**: camelCase (ex: `searchQuery`)
- **Constantes**: SCREAMING_SNAKE_CASE (ex: `API_BASE_URL`)

### Structure des composants
```tsx
// 1. Imports
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"

// 2. Types/Interfaces
interface Props { ... }

// 3. Composant
export default function MyComponent() {
  // 3.1 State
  const [state, setState] = useState()
  
  // 3.2 Queries/Mutations
  const { data } = useQuery({ ... })
  
  // 3.3 Handlers
  const handleClick = () => { ... }
  
  // 3.4 Render
  return (...)
}
```

### Test IDs
Tous les éléments interactifs ont des `data-testid` pour les tests:
- **Boutons**: `button-{action}-{target}` (ex: `button-create-tender`)
- **Inputs**: `input-{name}` (ex: `input-search`)
- **Selects**: `select-{name}` (ex: `select-status`)
- **Navigation**: `nav-{page}` (ex: `nav-dashboard`)

## Base de données

### Configuration
- **Type**: PostgreSQL (Neon Serverless)
- **ORM**: Drizzle
- **Migrations**: `npm run db:push`

### Commandes utiles
```bash
# Pousser le schéma vers la BD
npm run db:push

# Forcer la migration
npm run db:push --force

# Studio Drizzle (visualisation)
npm run db:studio
```

## Démarrage du projet

```bash
# Installer les dépendances
npm install

# Démarrer en développement
npm run dev

# Build pour production
npm run build
```

## Notes importantes

- ✅ Le frontend est complètement responsive
- ✅ Support mode sombre/clair
- ✅ Tous les composants sont typés avec TypeScript
- ✅ Design system cohérent basé sur Material Design
- ⏳ Backend en cours de développement
- ⏳ Module d'import marchespublics.gov.ma à implémenter
- ⏳ Système de notifications à configurer

## Références

- **Portail des marchés publics**: https://www.marchespublics.gov.ma
- **Réglementation**: Décrets sur les marchés publics marocains
- **Design system**: Material Design adapté au contexte gouvernemental
