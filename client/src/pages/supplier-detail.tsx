import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, Edit, Trash2, Building2, Mail, Phone, MapPin, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Supplier } from "@shared/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function SupplierDetail() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const params = useParams();
  const supplierId = params.id;

  const { data: supplier, isLoading } = useQuery<Supplier>({
    queryKey: ['/api/suppliers', supplierId],
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest(`/api/suppliers/${supplierId}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      toast({
        title: "Succès",
        description: "Le fournisseur a été supprimé avec succès.",
      });
      navigate('/suppliers');
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; label: string }> = {
      active: { variant: "default", label: "Actif" },
      inactive: { variant: "outline", label: "Inactif" },
      blacklisted: { variant: "destructive", label: "Liste noire" },
    };
    const config = statusConfig[status] || statusConfig.active;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      travaux: "Travaux",
      fournitures: "Fournitures",
      services: "Services",
      etudes: "Études",
    };
    return labels[category] || category;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Building2 className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">Fournisseur non trouvé</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Le fournisseur que vous recherchez n'existe pas ou a été supprimé.
        </p>
        <Button onClick={() => navigate('/suppliers')} data-testid="button-back-to-list">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour à la liste
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/suppliers')}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{supplier.name}</h1>
            <p className="text-muted-foreground mt-1">
              Détails du fournisseur
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/suppliers/${supplierId}/edit`)}
            data-testid="button-edit"
          >
            <Edit className="w-4 h-4 mr-2" />
            Modifier
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" data-testid="button-delete">
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                <AlertDialogDescription>
                  Êtes-vous sûr de vouloir supprimer ce fournisseur ? Cette action est irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-cancel-delete">Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate()}
                  data-testid="button-confirm-delete"
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Informations générales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Nom</label>
              <p className="text-base font-medium mt-1" data-testid="text-name">{supplier.name}</p>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">ICE</label>
              <div className="flex items-center gap-2 mt-1">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <p className="text-base" data-testid="text-registrationNumber">{supplier.registrationNumber}</p>
              </div>
            </div>

            {supplier.taxId && (
              <div>
                <label className="text-sm text-muted-foreground">IF</label>
                <p className="text-base mt-1" data-testid="text-taxId">{supplier.taxId}</p>
              </div>
            )}

            <div>
              <label className="text-sm text-muted-foreground">Catégorie</label>
              <div className="mt-1">
                <Badge variant="outline" data-testid="badge-category">
                  {getCategoryLabel(supplier.category || "travaux")}
                </Badge>
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Statut</label>
              <div className="mt-1" data-testid="badge-status">
                {getStatusBadge(supplier.status)}
              </div>
            </div>

          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Coordonnées</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {supplier.address && (
              <div>
                <label className="text-sm text-muted-foreground">Adresse</label>
                <p className="text-base mt-1" data-testid="text-address">{supplier.address}</p>
              </div>
            )}

            {supplier.city && (
              <div>
                <label className="text-sm text-muted-foreground">Ville</label>
                <div className="flex items-center gap-2 mt-1">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <p className="text-base" data-testid="text-city">{supplier.city}</p>
                </div>
              </div>
            )}

            {supplier.phone && (
              <div>
                <label className="text-sm text-muted-foreground">Téléphone</label>
                <div className="flex items-center gap-2 mt-1">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <p className="text-base" data-testid="text-phone">{supplier.phone}</p>
                </div>
              </div>
            )}

            {supplier.email && (
              <div>
                <label className="text-sm text-muted-foreground">Email</label>
                <div className="flex items-center gap-2 mt-1">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <p className="text-base" data-testid="text-email">{supplier.email}</p>
                </div>
              </div>
            )}

            {supplier.contactPerson && (
              <div>
                <label className="text-sm text-muted-foreground">Personne de contact</label>
                <p className="text-base mt-1" data-testid="text-contactPerson">{supplier.contactPerson}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Informations système</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <label className="text-sm text-muted-foreground">Date de création</label>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <p className="text-base" data-testid="text-createdAt">
                  {new Date(supplier.createdAt).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
