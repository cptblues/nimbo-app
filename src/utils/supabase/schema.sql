-- Schema for Nimbo Coworking Space
-- Based on implementation plan, step 1.5

-- Extension de la table auth.users
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  status TEXT DEFAULT 'offline',
  status_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger pour créer automatiquement un profil utilisateur après inscription
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Table des workspaces
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table des membres du workspace
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- 'admin' ou 'member'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- Table des salles
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'meeting', -- 'meeting', 'lounge', 'focus', etc.
  capacity INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table des participants aux salles (présence en temps réel)
CREATE TABLE IF NOT EXISTS public.room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  video_enabled BOOLEAN DEFAULT FALSE,
  audio_enabled BOOLEAN DEFAULT FALSE,
  UNIQUE(room_id, user_id)
);

-- Table des messages de chat
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Configuration des politiques RLS (Row Level Security)

-- Activer RLS sur toutes les tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Politiques pour la table users
CREATE POLICY "Les utilisateurs authentifiés peuvent voir les profils"
  ON public.users FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Les utilisateurs peuvent modifier leur propre profil"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Politiques pour la table workspaces
CREATE POLICY "Les membres peuvent voir les workspaces dont ils font partie"
  ON public.workspaces FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = workspaces.id AND user_id = auth.uid()
    )
    OR owner_id = auth.uid()
  );

CREATE POLICY "Les utilisateurs authentifiés peuvent créer des workspaces"
  ON public.workspaces FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND owner_id = auth.uid());

CREATE POLICY "Seuls les admins peuvent modifier les workspaces"
  ON public.workspaces FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = workspaces.id AND user_id = auth.uid() AND role = 'admin'
    )
    OR owner_id = auth.uid()
  );

-- Politiques pour la table workspace_members
CREATE POLICY "Les membres peuvent voir les autres membres du workspace"
  ON public.workspace_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members AS wm
      WHERE wm.workspace_id = workspace_members.workspace_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Seuls les admins peuvent ajouter des membres"
  ON public.workspace_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = workspace_members.workspace_id AND user_id = auth.uid() AND role = 'admin'
    )
    OR 
    EXISTS (
      SELECT 1 FROM public.workspaces 
      WHERE id = workspace_members.workspace_id AND owner_id = auth.uid()
    )
  );

-- Politiques pour la table rooms
CREATE POLICY "Les membres peuvent voir les salles du workspace"
  ON public.rooms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = rooms.workspace_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Seuls les admins peuvent créer des salles"
  ON public.rooms FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = rooms.workspace_id AND user_id = auth.uid() AND role = 'admin'
    )
    OR 
    EXISTS (
      SELECT 1 FROM public.workspaces 
      WHERE id = rooms.workspace_id AND owner_id = auth.uid()
    )
  );

-- Politiques pour la table room_participants
CREATE POLICY "Les membres peuvent voir qui est présent dans les salles"
  ON public.room_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.rooms
      JOIN public.workspace_members ON rooms.workspace_id = workspace_members.workspace_id
      WHERE rooms.id = room_participants.room_id AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Les utilisateurs peuvent gérer leur propre présence"
  ON public.room_participants FOR ALL
  USING (user_id = auth.uid());

-- Politiques pour la table chat_messages
CREATE POLICY "Les membres peuvent voir les messages de la salle"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.rooms
      JOIN public.workspace_members ON rooms.workspace_id = workspace_members.workspace_id
      WHERE rooms.id = chat_messages.room_id AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Les utilisateurs peuvent créer leurs propres messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.rooms
      JOIN public.workspace_members ON rooms.workspace_id = workspace_members.workspace_id
      WHERE rooms.id = chat_messages.room_id AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Les utilisateurs peuvent modifier leurs propres messages"
  ON public.chat_messages FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Les utilisateurs peuvent supprimer leurs propres messages"
  ON public.chat_messages FOR DELETE
  USING (user_id = auth.uid());

-- Activer Supabase Realtime pour les tables qui nécessitent des mises à jour en temps réel
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages; 