import { create } from 'zustand';
import { createClient } from '@/utils/supabase/client';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export type RoomType = 'meeting' | 'lounge' | 'focus' | 'general';

export interface Room {
  id: string;
  name: string;
  description?: string;
  type: RoomType;
  capacity?: number;
  workspace_id: string;
  created_at: string;
  updated_at: string;
  participant_count?: number;
}

export interface RoomParticipant {
  id: string;
  user_id: string;
  room_id: string;
  joined_at: string;
  video_enabled: boolean;
  audio_enabled: boolean;
  user?: {
    id: string;
    display_name: string;
    avatar_url?: string;
    status?: string;
    status_message?: string;
  };
}

export interface Message {
  id: string;
  content: string;
  room_id: string;
  user_id: string;
  created_at: string;
  users?: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
}

interface RoomState {
  // État des salles
  rooms: Room[];
  currentRoom: Room | null;
  participants: RoomParticipant[];
  messages: Message[];

  // État de chargement et erreurs
  isLoadingRooms: boolean;
  isLoadingParticipants: boolean;
  isLoadingMessages: boolean;
  error: string | null;

  // Canaux de temps réel
  roomsChannel: RealtimeChannel | null;
  participantsChannel: RealtimeChannel | null;
  messagesChannel: RealtimeChannel | null;

  // Actions pour les salles
  setRooms: (rooms: Room[]) => void;
  setCurrentRoom: (room: Room | null) => void;
  addRoom: (room: Room) => void;
  updateRoom: (id: string, room: Partial<Room>) => void;
  deleteRoom: (id: string) => void;

  // Actions pour les participants
  setParticipants: (participants: RoomParticipant[]) => void;
  addParticipant: (participant: RoomParticipant) => void;
  updateParticipant: (id: string, participant: Partial<RoomParticipant>) => void;
  removeParticipant: (id: string) => void;

  // Actions pour les messages
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  deleteMessage: (id: string) => void;

  // Gestion des canaux en temps réel
  subscribeToRooms: (workspaceId: string) => void;
  subscribeToRoom: (roomId: string) => void;
  unsubscribeFromRooms: () => void;
  unsubscribeFromRoom: () => void;

  // Gestion des erreurs et chargement
  setError: (error: string | null) => void;
  setIsLoadingRooms: (isLoading: boolean) => void;
  setIsLoadingParticipants: (isLoading: boolean) => void;
  setIsLoadingMessages: (isLoading: boolean) => void;

  // Actions complexes
  fetchRooms: (workspaceId: string) => Promise<void>;
  fetchRoomDetails: (roomId: string) => Promise<void>;
  joinRoom: (roomId: string) => Promise<boolean>;
  leaveRoom: () => Promise<boolean>;
  sendMessage: (content: string) => Promise<boolean>;
  toggleAudio: (enabled: boolean) => Promise<boolean>;
  toggleVideo: (enabled: boolean) => Promise<boolean>;
}

export const useRoomStore = create<RoomState>((set, get) => ({
  // État initial
  rooms: [],
  currentRoom: null,
  participants: [],
  messages: [],
  isLoadingRooms: false,
  isLoadingParticipants: false,
  isLoadingMessages: false,
  error: null,
  roomsChannel: null,
  participantsChannel: null,
  messagesChannel: null,

  // Setters simples
  setRooms: rooms => set({ rooms }),
  setCurrentRoom: room => set({ currentRoom: room }),
  setParticipants: participants => set({ participants }),
  setMessages: messages => set({ messages }),
  setError: error => set({ error }),
  setIsLoadingRooms: isLoading => set({ isLoadingRooms: isLoading }),
  setIsLoadingParticipants: isLoading => set({ isLoadingParticipants: isLoading }),
  setIsLoadingMessages: isLoading => set({ isLoadingMessages: isLoading }),

  // Actions pour les salles
  addRoom: room =>
    set(state => ({
      rooms: [...state.rooms, room],
    })),

  updateRoom: (id, roomData) =>
    set(state => ({
      rooms: state.rooms.map(room => (room.id === id ? { ...room, ...roomData } : room)),
      currentRoom:
        state.currentRoom?.id === id ? { ...state.currentRoom, ...roomData } : state.currentRoom,
    })),

  deleteRoom: id =>
    set(state => ({
      rooms: state.rooms.filter(room => room.id !== id),
      currentRoom: state.currentRoom?.id === id ? null : state.currentRoom,
    })),

  // Actions pour les participants
  addParticipant: participant =>
    set(state => ({
      participants: [...state.participants, participant],
    })),

  updateParticipant: (id, participantData) =>
    set(state => ({
      participants: state.participants.map(participant =>
        participant.id === id ? { ...participant, ...participantData } : participant
      ),
    })),

  removeParticipant: id =>
    set(state => ({
      participants: state.participants.filter(participant => participant.id !== id),
    })),

  // Actions pour les messages
  addMessage: message =>
    set(state => ({
      messages: [...state.messages, message],
    })),

  deleteMessage: id =>
    set(state => ({
      messages: state.messages.filter(message => message.id !== id),
    })),

  // Gestion des souscriptions en temps réel
  subscribeToRooms: workspaceId => {
    const supabase = createClient();

    // Se désabonner d'abord pour éviter les doublons
    get().unsubscribeFromRooms();

    // Créer un canal pour les salles d'un workspace
    const channel = supabase.channel(`rooms:${workspaceId}`);

    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'rooms',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload: RealtimePostgresChangesPayload<Room>) => {
          const newRoom = payload.new as Room;
          get().addRoom(newRoom);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload: RealtimePostgresChangesPayload<Room>) => {
          const updatedRoom = payload.new as Room;
          get().updateRoom(updatedRoom.id, updatedRoom);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'rooms',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload: RealtimePostgresChangesPayload<Room>) => {
          const deletedRoom = payload.old as Room;
          get().deleteRoom(deletedRoom.id);
        }
      );

    // S'abonner aux changements
    channel.subscribe((status: string) => {
      if (status !== 'SUBSCRIBED') {
        set({ error: `Erreur lors de la souscription aux salles: ${status}` });
      }
    });

    set({ roomsChannel: channel });
  },

  unsubscribeFromRooms: () => {
    const { roomsChannel } = get();
    if (roomsChannel) {
      const supabase = createClient();
      supabase.removeChannel(roomsChannel);
      set({ roomsChannel: null });
    }
  },

  subscribeToRoom: roomId => {
    const supabase = createClient();

    // Se désabonner d'abord
    get().unsubscribeFromRoom();

    // Canal pour les participants
    const participantsChannel = supabase.channel(`room_participants:${roomId}`);

    participantsChannel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_participants',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload: RealtimePostgresChangesPayload<RoomParticipant>) => {
          try {
            // Récupérer les infos complètes du participant, y compris l'utilisateur
            const { data } = await supabase
              .from('room_participants')
              .select(
                `
                *,
                users:user_id (
                  id,
                  display_name,
                  avatar_url,
                  status,
                  status_message
                )
              `
              )
              .eq('id', (payload.new as any).id)
              .single();

            if (data) {
              const newParticipant = {
                ...data,
                user: data.users,
              };
              get().addParticipant(newParticipant);
            }
          } catch (error) {
            console.error('Erreur de récupération du participant:', error);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'room_participants',
          filter: `room_id=eq.${roomId}`,
        },
        (payload: RealtimePostgresChangesPayload<RoomParticipant>) => {
          const newParticipant = payload.new as RoomParticipant & { id: string };
          get().updateParticipant(newParticipant.id, newParticipant);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'room_participants',
          filter: `room_id=eq.${roomId}`,
        },
        (payload: RealtimePostgresChangesPayload<RoomParticipant>) => {
          const oldParticipant = payload.old as Partial<RoomParticipant> & { id: string };
          get().removeParticipant(oldParticipant.id);
        }
      );

    // Canal pour les messages
    const messagesChannel = supabase.channel(`room_messages:${roomId}`);

    messagesChannel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload: RealtimePostgresChangesPayload<Message>) => {
          try {
            // Récupérer les infos complètes du message, y compris l'utilisateur
            const { data } = await supabase
              .from('chat_messages')
              .select(
                `
                *,
                users:user_id (
                  id,
                  display_name,
                  avatar_url
                )
              `
              )
              .eq('id', (payload.new as any).id)
              .single();

            if (data) {
              const newMessage = {
                ...data,
                users: data.users,
              };
              get().addMessage(newMessage);
            }
          } catch (error) {
            console.error('Erreur de récupération du message:', error);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload: RealtimePostgresChangesPayload<Message>) => {
          const oldMessage = payload.old as Partial<Message> & { id: string };
          get().deleteMessage(oldMessage.id);
        }
      );

    // S'abonner aux changements
    participantsChannel.subscribe();
    messagesChannel.subscribe();

    set({
      participantsChannel,
      messagesChannel,
    });
  },

  unsubscribeFromRoom: () => {
    const { participantsChannel, messagesChannel } = get();
    const supabase = createClient();

    if (participantsChannel) {
      supabase.removeChannel(participantsChannel);
    }

    if (messagesChannel) {
      supabase.removeChannel(messagesChannel);
    }

    set({
      participantsChannel: null,
      messagesChannel: null,
    });
  },

  // Actions complexes
  fetchRooms: async workspaceId => {
    const { setIsLoadingRooms, setRooms, setError, subscribeToRooms } = get();

    setIsLoadingRooms(true);
    setError(null);

    try {
      const supabase = createClient();

      // Récupérer les salles avec le nombre de participants
      const { data, error } = await supabase
        .from('rooms')
        .select(
          `
          *,
          participant_count:room_participants(count)
        `
        )
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Formater les données pour inclure le nombre de participants
      const formattedRooms = data.map((room: any) => ({
        ...room,
        participant_count: room.participant_count ? room.participant_count[0].count : 0,
      }));

      setRooms(formattedRooms);

      // S'abonner aux mises à jour en temps réel
      subscribeToRooms(workspaceId);
    } catch (error) {
      setError(`Erreur lors du chargement des salles: ${(error as Error).message}`);
    } finally {
      setIsLoadingRooms(false);
    }
  },

  fetchRoomDetails: async roomId => {
    const {
      setIsLoadingParticipants,
      setIsLoadingMessages,
      setParticipants,
      setMessages,
      setError,
      subscribeToRoom,
      setCurrentRoom,
    } = get();

    setIsLoadingParticipants(true);
    setIsLoadingMessages(true);
    setError(null);

    try {
      const supabase = createClient();

      // Récupérer les détails de la salle
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (roomError) throw roomError;

      setCurrentRoom(roomData);

      // Récupérer les participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('room_participants')
        .select(
          `
          *,
          users:user_id (
            id,
            display_name,
            avatar_url,
            status,
            status_message
          )
        `
        )
        .eq('room_id', roomId);

      if (participantsError) throw participantsError;

      const formattedParticipants = participantsData.map((p: any) => ({
        ...p,
        user: p.users,
      }));

      setParticipants(formattedParticipants);

      // Récupérer les messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select(
          `
          *,
          users:user_id (
            id,
            display_name,
            avatar_url
          )
        `
        )
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (messagesError) throw messagesError;

      setMessages(messagesData);

      // S'abonner aux mises à jour en temps réel
      subscribeToRoom(roomId);
    } catch (error) {
      setError(`Erreur lors du chargement des détails de la salle: ${(error as Error).message}`);
    } finally {
      setIsLoadingParticipants(false);
      setIsLoadingMessages(false);
    }
  },

  joinRoom: async roomId => {
    const { setError } = get();

    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();

      if (!userData?.user) {
        throw new Error('Utilisateur non authentifié');
      }

      const user = userData.user;

      // Récupérer le workspace_id de cette salle
      const { data: workspaceId, error: roomError } = await supabase
        .from('rooms')
        .select('workspace_id')
        .eq('id', roomId)
        .single();

      if (roomError) throw roomError;

      // Récupérer les IDs des salles du même workspace
      const { data: idsWorkspace, error: roomsError } = await supabase
        .from('rooms')
        .select('id')
        .eq('workspace_id', workspaceId);

      if (roomsError) throw roomsError;

      const roomIds = idsWorkspace.map((roomId: { id: string }) => roomId.id);

      // Quitter toutes les autres salles du même workspace
      if (roomIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('room_participants')
          .delete()
          .eq('user_id', user.id)
          .in('room_id', roomIds);

        if (deleteError) throw deleteError;
      }

      // Rejoindre la nouvelle salle
      const { error: insertError } = await supabase.from('room_participants').insert({
        room_id: roomId,
        user_id: user.id,
        joined_at: new Date().toISOString(),
        video_enabled: true,
        audio_enabled: true,
      });

      if (insertError) throw insertError;

      return true;
    } catch (error) {
      setError(`Erreur lors de l'entrée dans la salle: ${(error as Error).message}`);
      return false;
    }
  },

  leaveRoom: async () => {
    const { currentRoom, setError } = get();

    if (!currentRoom) {
      return false;
    }

    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();

      if (!userData?.user) {
        throw new Error('Utilisateur non authentifié');
      }

      const { error } = await supabase
        .from('room_participants')
        .delete()
        .eq('user_id', userData.user.id)
        .eq('room_id', currentRoom.id);

      if (error) throw error;

      return true;
    } catch (error) {
      setError(`Erreur lors de la sortie de la salle: ${(error as Error).message}`);
      return false;
    }
  },

  sendMessage: async content => {
    const { currentRoom, setError } = get();

    if (!currentRoom || !content.trim()) {
      return false;
    }

    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();

      if (!userData?.user) {
        throw new Error('Utilisateur non authentifié');
      }

      const { error } = await supabase.from('chat_messages').insert({
        room_id: currentRoom.id,
        user_id: userData.user.id,
        content: content.trim(),
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      return true;
    } catch (error) {
      setError(`Erreur lors de l'envoi du message: ${(error as Error).message}`);
      return false;
    }
  },

  toggleAudio: async enabled => {
    const { currentRoom, setError } = get();

    if (!currentRoom) {
      return false;
    }

    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();

      if (!userData?.user) {
        throw new Error('Utilisateur non authentifié');
      }

      const { error } = await supabase
        .from('room_participants')
        .update({ audio_enabled: enabled })
        .eq('user_id', userData.user.id)
        .eq('room_id', currentRoom.id);

      if (error) throw error;

      return true;
    } catch (error) {
      setError(`Erreur lors de la mise à jour du statut audio: ${(error as Error).message}`);
      return false;
    }
  },

  toggleVideo: async enabled => {
    const { currentRoom, setError } = get();

    if (!currentRoom) {
      return false;
    }

    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();

      if (!userData?.user) {
        throw new Error('Utilisateur non authentifié');
      }

      const { error } = await supabase
        .from('room_participants')
        .update({ video_enabled: enabled })
        .eq('user_id', userData.user.id)
        .eq('room_id', currentRoom.id);

      if (error) throw error;

      return true;
    } catch (error) {
      setError(`Erreur lors de la mise à jour du statut vidéo: ${(error as Error).message}`);
      return false;
    }
  },
}));
