# Système de Gestion des Rôles et Permissions

## Vue d'ensemble

Le système de gestion des marchés publics implémente un contrôle d'accès basé sur les rôles (RBAC) avec quatre rôles distincts, chacun ayant des permissions spécifiques.

## Rôles

### 1. Admin
- **Accès complet** à toutes les fonctionnalités
- Peut gérer les utilisateurs et les paramètres
- Peut ajouter, modifier et supprimer toutes les ressources

### 2. Marches Manager (Gestionnaire des Marchés)
- Peut ajouter, modifier et supprimer : appels d'offres, fournisseurs, offres
- Peut ajouter et modifier (mais pas supprimer) : marchés, ordres de service, avenants
- **Ne peut PAS ajouter, modifier ni supprimer de décomptes** (invoices) - lecture seule
- Pas d'accès à la section Administration

### 3. Technical Service (Service Technique)
- **Peut voir** les onglets : Appels d'offres, Fournisseurs, Marchés (lecture seule)
- **Peut ajouter, modifier et supprimer** dans l'onglet Exécution :
  - Ordres de service (service_orders)
  - Avenants (amendments)  
  - Décomptes (invoices)
- Ne peut pas ajouter/modifier/supprimer les appels d'offres, fournisseurs, offres ou marchés

### 4. Ordonnateur
- **Accès en lecture seule** à toutes les sections
- Ne peut ni ajouter, ni modifier, ni supprimer quoi que ce soit
- Peut uniquement visualiser les données

## Matrice des Permissions

| Ressource | Admin | Marches Manager | Technical Service | Ordonnateur |
|-----------|-------|-----------------|-------------------|-------------|
| **Administration** |
| Utilisateurs | ✅ CRUD | ❌ | ❌ | ❌ |
| Paramètres | ✅ CRUD | ❌ | ❌ | ❌ |
| **Gestion** |
| Appels d'offres | ✅ CRUD | ✅ CRUD | 👁️ Lecture | 👁️ Lecture |
| Fournisseurs | ✅ CRUD | ✅ CRUD | 👁️ Lecture | 👁️ Lecture |
| Offres | ✅ CRUD | ✅ CRUD | ❌ | 👁️ Lecture |
| Marchés | ✅ CRUD | ✅ CR-U (pas de suppression) | 👁️ Lecture | 👁️ Lecture |
| **Exécution** |
| Ordres de service | ✅ CRUD | ✅ CR-U (pas de suppression) | ✅ CRUD | 👁️ Lecture |
| Avenants | ✅ CRUD | ✅ CR-U (pas de suppression) | ✅ CRUD | 👁️ Lecture |
| Décomptes | ✅ CRUD | 👁️ Lecture seule | ✅ CRUD | 👁️ Lecture |

*CRUD = Create, Read, Update, Delete*

## Implémentation

### Côté Client

#### 1. Système de Permissions (`client/src/lib/permissions.ts`)

Fournit des fonctions utilitaires pour vérifier les permissions :

```typescript
import { canAdd, canEdit, canDelete, canAccessAdmin } from "@/lib/permissions";

// Vérifier si l'utilisateur peut ajouter une ressource
if (canAdd(user, "tender")) {
  // Afficher le bouton "Créer un appel d'offres"
}

// Vérifier si l'utilisateur peut modifier
if (canEdit(user, "invoice")) {
  // Afficher le bouton "Modifier"
}

// Vérifier l'accès administration
if (canAccessAdmin(user)) {
  // Afficher les liens administration
}
```

#### 2. Hook d'Authentification (`client/src/hooks/use-auth.ts`)

Le hook `useAuth` expose les fonctions de permissions :

```typescript
import { useAuth } from "@/hooks/use-auth";

function MyComponent() {
  const { user, canAdd, canEdit, canDelete, canAccessAdmin } = useAuth();

  return (
    <div>
      {canAdd("tender") && (
        <Button onClick={handleCreate}>Créer</Button>
      )}
      
      {canEdit("tender") && (
        <Button onClick={handleEdit}>Modifier</Button>
      )}
      
      {canDelete("tender") && (
        <Button onClick={handleDelete}>Supprimer</Button>
      )}
    </div>
  );
}
```

#### 3. Interface Utilisateur

La sidebar masque automatiquement les sections Administration pour les non-admins en utilisant le helper `canAccessAdmin` :

```typescript
// Recommandé: utiliser le helper du hook
import { useAuth } from "@/hooks/use-auth";

function AppSidebar() {
  const { user, canAccessAdmin } = useAuth();
  
  return (
    <Sidebar>
      {/* ... */}
      {canAccessAdmin() && (
        <SidebarGroup>
          <SidebarGroupLabel>Administration</SidebarGroupLabel>
          {/* Liens administration */}
        </SidebarGroup>
      )}
    </Sidebar>
  );
}

// Alternative (si le hook n'est pas disponible dans le contexte)
{user?.role === "admin" && (
  <SidebarGroup>
    <SidebarGroupLabel>Administration</SidebarGroupLabel>
    {/* Liens administration */}
  </SidebarGroup>
)}
```

### Côté Serveur

#### 1. Middlewares de Protection (`server/permissions.ts`)

Trois middlewares principaux :

```typescript
// Vérifier le rôle
requireRole("admin", "marches_manager")

// Vérifier une permission spécifique
requirePermission("add_tender")

// Vérifier la permission sur une ressource
requireResourcePermission("tender", "add")
```

#### 2. Protection des Routes (`server/routes.ts`)

Chaque route modifiante est protégée :

```typescript
// Admin uniquement
app.get("/api/users", requireRole("admin"), async (req, res) => {
  // ...
});

// Permissions basées sur la ressource
app.post("/api/tenders", requireResourcePermission("tender", "add"), async (req, res) => {
  // ...
});

app.post("/api/invoices", requireResourcePermission("invoice", "add"), async (req, res) => {
  // Le marches_manager sera bloqué ici
});
```

## Utilisation dans les Pages

### Exemple : Page Appels d'Offres

```typescript
import { useAuth } from "@/hooks/use-auth";

export default function TendersPage() {
  const { user, canAdd, canEdit, canDelete } = useAuth();

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1>Appels d'Offres</h1>
        {canAdd("tender") && (
          <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-tender">
            Créer un appel d'offres
          </Button>
        )}
      </div>

      <Table>
        {/* Liste des appels d'offres */}
        <TableRow>
          <TableCell>{tender.title}</TableCell>
          <TableCell>
            {canEdit("tender") && (
              <Button onClick={() => handleEdit(tender)} data-testid={`button-edit-tender-${tender.id}`}>
                Modifier
              </Button>
            )}
            {canDelete("tender") && (
              <Button onClick={() => handleDelete(tender)} data-testid={`button-delete-tender-${tender.id}`}>
                Supprimer
              </Button>
            )}
          </TableCell>
        </TableRow>
      </Table>
    </div>
  );
}
```

## Sécurité

### Protection en Profondeur

Le système implémente une protection à plusieurs niveaux :

1. **Interface Utilisateur** : Les boutons/liens sont masqués
2. **Routes API** : Les middlewares bloquent les requêtes non autorisées
3. **Validation** : Les permissions sont vérifiées à chaque étape

### Codes de Statut HTTP

- `401 Unauthorized` : Utilisateur non authentifié
- `403 Forbidden` : Utilisateur authentifié mais sans permission

## Comptes de Test

Après avoir exécuté `npm run seed`, les comptes suivants sont disponibles :

```
Admin:
  Email: admin@example.com
  Mot de passe: admin123

Gestionnaire des Marchés:
  Email: marches.manager@example.com
  Mot de passe: ChangeMe123!

Ordonnateur:
  Email: ordonnateur@example.com
  Mot de passe: ChangeMe123!

Service Technique:
  Email: technical.service@example.com
  Mot de passe: ChangeMe123!
```

## Bonnes Pratiques

1. **Toujours vérifier les permissions côté serveur** : Ne jamais se fier uniquement à l'interface
2. **Utiliser les helpers du hook useAuth** : Plus maintenable que des vérifications manuelles
3. **Cacher ET désactiver** : Pour une meilleure UX, masquer les boutons non autorisés
4. **Messages d'erreur clairs** : Informer l'utilisateur quand il n'a pas la permission

## Extension du Système

### Ajouter une Nouvelle Permission

1. Ajouter le type dans `client/src/lib/permissions.ts` et `server/permissions.ts`
2. Mettre à jour `rolePermissions` dans les deux fichiers
3. Appliquer le middleware sur les routes concernées
4. Utiliser les helpers dans l'interface utilisateur

### Ajouter un Nouveau Rôle

1. Définir le rôle dans `UserRole` type
2. Créer l'entrée dans `rolePermissions`
3. Mettre à jour la matrice de permissions ci-dessus
4. Tester toutes les combinaisons de permissions

## Tests

Pour tester les permissions :

1. Se connecter avec chaque rôle
2. Vérifier que seules les actions autorisées sont visibles
3. Tenter d'accéder directement aux routes API (doit être bloqué)
4. Vérifier les codes de statut HTTP appropriés
