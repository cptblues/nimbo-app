# Configuration du modèle de données Supabase

Ce dossier contient les fichiers nécessaires à la configuration du modèle de données Supabase pour le projet Nimbo.

## Structure des tables

Le fichier `schema.sql` définit les tables suivantes :

1. **users** - Extension de la table auth.users pour stocker les informations des profils utilisateurs
2. **workspaces** - Les espaces de travail virtuels
3. **workspace_members** - Association des utilisateurs aux workspaces avec leurs rôles
4. **rooms** - Les salles virtuelles à l'intérieur des workspaces
5. **room_participants** - Les utilisateurs actuellement présents dans les salles
6. **chat_messages** - Les messages échangés dans les salles

## Comment appliquer le schéma

### Option 1 : Via l'interface Supabase SQL Editor

1. Connectez-vous à votre projet Supabase
2. Naviguez vers l'onglet "SQL Editor"
3. Créez une nouvelle requête
4. Copiez le contenu du fichier `schema.sql`
5. Exécutez la requête

### Option 2 : Via la CLI Supabase

Si vous avez la CLI Supabase installée et configurée :

```bash
supabase db push --project-ref <project-ref> schema.sql
```

## Row Level Security (RLS)

Le schéma configure des politiques RLS pour chaque table, garantissant que :

- Les utilisateurs ne peuvent voir que les workspaces auxquels ils appartiennent
- Seuls les administrateurs peuvent modifier les workspaces ou ajouter des membres
- Les utilisateurs ne peuvent voir que les salles des workspaces dont ils sont membres
- Chaque utilisateur ne peut gérer que sa propre présence dans les salles
- Les utilisateurs ne peuvent voir et envoyer des messages que dans les salles où ils sont membres

## Tests de vérification

Pour vérifier que le schéma a été correctement appliqué, exécutez ces requêtes de test dans SQL Editor :

```sql
-- Vérifier les contraintes de clé étrangère
SELECT conname AS constraint_name,
       conrelid::regclass AS table_name,
       a.attname AS column_name,
       confrelid::regclass AS referenced_table,
       af.attname AS referenced_column
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE c.contype = 'f'
AND c.conrelid::regclass::text LIKE 'public.%';

-- Vérifier les politiques RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

## Supabase Realtime

Le schéma active également Supabase Realtime pour les tables qui nécessitent des mises à jour en temps réel :

- `users` (pour les statuts)
- `room_participants` (pour la présence)
- `chat_messages` (pour les messages instantanés)

Pour utiliser ces fonctionnalités en temps réel dans l'application, référez-vous aux utilsations de Supabase Realtime dans la documentation du projet.
