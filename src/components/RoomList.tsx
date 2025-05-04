import { useState, useEffect } from 'react';
import { useRoomStore } from '@/store/roomStore';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Users, Settings, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface RoomListProps {
  workspaceId: string;
  isAdmin?: boolean;
  onCreateRoom?: () => void;
  onEditRoom?: (roomId: string) => void;
  onDeleteRoom?: (roomId: string) => void;
}

export function RoomList({
  workspaceId,
  isAdmin = false,
  onCreateRoom,
  onEditRoom,
  onDeleteRoom,
}: RoomListProps) {
  const { rooms, isLoadingRooms, error, fetchRooms, joinRoom } = useRoomStore();
  const [joinedRoomId, setJoinedRoomId] = useState<string | null>(null);

  // Récupérer les salles au chargement du composant
  useEffect(() => {
    if (workspaceId) {
      fetchRooms(workspaceId);
    }
  }, [workspaceId, fetchRooms]);

  // Gérer le clic sur une salle
  const handleJoinRoom = async (roomId: string) => {
    // Si l'utilisateur est déjà dans cette salle, ne rien faire
    if (joinedRoomId === roomId) return;

    const success = await joinRoom(roomId);
    if (success) {
      setJoinedRoomId(roomId);
    }
  };

  // Carte de skeleton pour le chargement
  const renderSkeletonCard = (index: number) => (
    <Card key={`skeleton-${index}`} className="mb-4">
      <CardHeader>
        <Skeleton className="h-6 w-1/3 mb-2" />
        <Skeleton className="h-4 w-3/4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-2/3" />
      </CardContent>
      <CardFooter className="flex justify-between">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </CardFooter>
    </Card>
  );

  // Afficher un message d'erreur si nécessaire
  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        <p>Erreur lors du chargement des salles: {error}</p>
        <Button variant="outline" className="mt-2" onClick={() => fetchRooms(workspaceId)}>
          Réessayer
        </Button>
      </div>
    );
  }

  // Afficher le skeleton pendant le chargement
  if (isLoadingRooms) {
    return (
      <div className="space-y-4">{[...Array(3)].map((_, index) => renderSkeletonCard(index))}</div>
    );
  }

  return (
    <div className="space-y-4">
      {/* En-tête avec bouton de création si l'utilisateur est admin */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Salles</h2>
        {isAdmin && onCreateRoom && (
          <Button onClick={onCreateRoom} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nouvelle salle
          </Button>
        )}
      </div>

      {/* Liste des salles */}
      {rooms.length === 0 ? (
        <div className="bg-muted p-6 rounded-md text-center">
          <p className="text-muted-foreground mb-4">
            Aucune salle n'a été créée dans cet espace de travail.
          </p>
          {isAdmin && onCreateRoom && (
            <Button onClick={onCreateRoom} variant="outline">
              <PlusCircle className="mr-2 h-4 w-4" />
              Créer une première salle
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map(room => (
            <Card
              key={room.id}
              className={`transition-colors ${joinedRoomId === room.id ? 'border-primary' : ''}`}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="mr-2">{room.name}</CardTitle>
                  <Badge variant={getRoomTypeBadgeVariant(room.type)}>
                    {getRoomTypeLabel(room.type)}
                  </Badge>
                </div>
                <CardDescription>{room.description || 'Aucune description'}</CardDescription>
              </CardHeader>

              <CardContent>
                {/* Afficher les participants actuels */}
                <div className="flex items-center mb-4">
                  <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {room.participant_count || 0} / {room.capacity || '∞'} participants
                  </span>
                </div>

                {/* Liste d'avatars des participants (à implémenter) */}
                <div className="flex -space-x-2 overflow-hidden">
                  {/* Ici, vous pourriez afficher les avatars des participants actifs */}
                </div>
              </CardContent>

              <CardFooter className="flex justify-between pt-4 border-t">
                <Button
                  onClick={() => handleJoinRoom(room.id)}
                  variant={joinedRoomId === room.id ? 'default' : 'outline'}
                >
                  {joinedRoomId === room.id ? 'Connecté' : 'Rejoindre'}
                </Button>

                {isAdmin && (
                  <div className="flex space-x-2">
                    {onEditRoom && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={e => {
                          e.stopPropagation();
                          onEditRoom(room.id);
                        }}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    )}
                    {onDeleteRoom && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={e => {
                          e.stopPropagation();
                          onDeleteRoom(room.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Fonctions utilitaires pour les badges de types de salle
function getRoomTypeLabel(type: string): string {
  switch (type) {
    case 'meeting':
      return 'Réunion';
    case 'lounge':
      return 'Lounge';
    case 'focus':
      return 'Focus';
    case 'general':
      return 'Général';
    default:
      return type;
  }
}

function getRoomTypeBadgeVariant(
  type: string
): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (type) {
    case 'meeting':
      return 'default';
    case 'lounge':
      return 'secondary';
    case 'focus':
      return 'outline';
    case 'general':
      return 'secondary';
    default:
      return 'default';
  }
}
