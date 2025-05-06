-- Fonction pour accepter une invitation et ajouter l'utilisateur comme membre du workspace
CREATE OR REPLACE FUNCTION public.accept_workspace_invitation(invitation_id UUID, user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- S'assurer que l'invitation est en attente
  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_invitations
    WHERE id = invitation_id AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Invitation non valide ou déjà traitée';
  END IF;
  
  -- Récupérer les détails de l'invitation
  DECLARE
    workspace_id UUID;
    member_role TEXT;
  BEGIN
    SELECT 
      wi.workspace_id, wi.role INTO workspace_id, member_role
    FROM 
      public.workspace_invitations wi
    WHERE 
      wi.id = invitation_id;
    
    -- Vérifier si l'utilisateur est déjà membre
    IF EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_id = workspace_id AND user_id = user_id
    ) THEN
      -- Mettre à jour le statut de l'invitation même si l'utilisateur est déjà membre
      UPDATE public.workspace_invitations
      SET status = 'accepted', updated_at = NOW()
      WHERE id = invitation_id;
      
      RETURN;
    END IF;
    
    -- Ajouter l'utilisateur comme membre
    INSERT INTO public.workspace_members (
      workspace_id,
      user_id,
      role
    ) VALUES (
      workspace_id,
      user_id,
      member_role
    );
    
    -- Mettre à jour le statut de l'invitation
    UPDATE public.workspace_invitations
    SET status = 'accepted', updated_at = NOW()
    WHERE id = invitation_id;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 