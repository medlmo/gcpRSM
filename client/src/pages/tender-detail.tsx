import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, Edit, Trash2, FileText, Calendar, DollarSign, MapPin, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Tender } from "@shared/schema";
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

export default function TenderDetail() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const params = useParams();
  const tenderId = params.id;

  const { data: tender, isLoading, isError, refetch } = useQuery<Tender>({
    queryKey: ['/api/tenders', tenderId],
    enabled: !!tenderId,
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!tenderId) {
        throw new Error("ID de l'appel d'offres manquant");
      }
      return apiRequest(`/api/tenders/${tenderId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenders'] });
      toast({
        title: "Succès",
        description: "L'appel d'offres a été supprimé avec succès.",
      });
      navigate('/tenders');
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const normalizeStatus = (status: string) => {
    switch (status) {
      case "draft":
        return "en cours d'étude";
      case "published":
        return "publié";
      case "closed":
        return "en cours de jugement";
      case "awarded":
        return "attribué";
      case "cancelled":
        return "annulé";
      default:
        return status;
    }
  };

  const normalizeProcedureType = (procedureType: string) => {
    switch (procedureType) {
      case "AO ouvert":
        return "Appel d'offres ouvert";
      case "AO restreint":
        return "Appel d'offres restreint";
      case "Négociée compétitive":
        return "Appel d'offres ouvert simplifié";
      case "Concours":
        return "Concours architectural";
      case "Consultation":
        return "Consultation architecturale";
      default:
        return procedureType;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; label: string }> = {
      "en cours d'étude": { variant: "secondary", label: "En cours d'étude" },
      "publié": { variant: "default", label: "Publié" },
      "en cours de jugement": { variant: "outline", label: "En cours de jugement" },
      "attribué": { variant: "default", label: "Attribué" },
      "annulé": { variant: "destructive", label: "Annulé" },
    };
    const config = statusConfig[status] || statusConfig["en cours d'étude"];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      travaux: "Travaux",
      fournitures: "Fournitures",
      services: "Services",
    };
    return labels[category] || category;
  };

  if (!tenderId) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">ID manquant</h3>
        <p className="text-sm text-muted-foreground mb-6">
          L'ID de l'appel d'offres est manquant dans l'URL.
        </p>
        <Button onClick={() => navigate('/tenders')} data-testid="button-back-to-list">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour à la liste
        </Button>
      </div>
    );
  }

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

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <FileText className="h-16 w-16 text-destructive/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">Erreur de chargement</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Une erreur s'est produite lors du chargement de l'appel d'offres.
        </p>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/tenders')} variant="outline" data-testid="button-back-to-list">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à la liste
          </Button>
          <Button onClick={() => refetch()} data-testid="button-retry">
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  if (!tender) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">Appel d'offres non trouvé</h3>
        <p className="text-sm text-muted-foreground mb-6">
          L'appel d'offres que vous recherchez n'existe pas ou a été supprimé.
        </p>
        <Button onClick={() => navigate('/tenders')} data-testid="button-back-to-list">
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
            onClick={() => navigate('/tenders')}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{tender.title}</h1>
            <p className="text-muted-foreground mt-1">
              Référence: {tender.reference}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/tenders/${tenderId}/edit`)}
            disabled={!tender || isLoading}
            data-testid="button-edit"
          >
            <Edit className="w-4 h-4 mr-2" />
            Modifier
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                disabled={!tender || isLoading || deleteMutation.isPending}
                data-testid="button-delete"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                <AlertDialogDescription>
                  Êtes-vous sûr de vouloir supprimer cet appel d'offres ? Cette action est irréversible.
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
              <label className="text-sm text-muted-foreground">Référence</label>
              <div className="flex items-center gap-2 mt-1">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <p className="text-base font-medium" data-testid="text-reference">{tender.reference}</p>
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Titre</label>
              <p className="text-base mt-1" data-testid="text-title">{tender.title}</p>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Mode de passation</label>
              <p className="text-base mt-1" data-testid="text-procedureType">
                {normalizeProcedureType(tender.procedureType)}
              </p>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Catégorie</label>
              <div className="mt-1">
                <Badge variant="outline" data-testid="badge-category">
                  {getCategoryLabel(tender.category)}
                </Badge>
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Statut</label>
              <div className="mt-1" data-testid="badge-status">
                {getStatusBadge(normalizeStatus(tender.status))}
              </div>
            </div>

            {tender.lotsNumber && (
              <div>
                <label className="text-sm text-muted-foreground">Nombre de lots</label>
                <div className="flex items-center gap-2 mt-1">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  <p className="text-base" data-testid="text-lotsNumber">{tender.lotsNumber}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informations financières</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tender.estimatedBudget && (
              <div>
                <label className="text-sm text-muted-foreground">Estimation</label>
                <div className="flex items-center gap-2 mt-1">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <p className="text-base font-medium" data-testid="text-estimatedBudget">
                    {Number(tender.estimatedBudget).toLocaleString('fr-FR')} {tender.currency}
                  </p>
                </div>
              </div>
            )}

            {tender.provisionalGuaranteeAmount && (
              <div>
                <label className="text-sm text-muted-foreground">Caution provisoire</label>
                <div className="flex items-center gap-2 mt-1">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <p className="text-base" data-testid="text-provisionalGuaranteeAmount">
                    {Number(tender.provisionalGuaranteeAmount).toLocaleString('fr-FR')} {tender.currency}
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="text-sm text-muted-foreground">Devise</label>
              <p className="text-base mt-1" data-testid="text-currency">{tender.currency}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dates et délais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tender.publicationDate && (
              <div>
                <label className="text-sm text-muted-foreground">Date de publication</label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p className="text-base" data-testid="text-publicationDate">
                    {new Date(tender.publicationDate).toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="text-sm text-muted-foreground">Date et heure limite de soumission</label>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <p className="text-base" data-testid="text-submissionDeadline">
                  {new Date(tender.submissionDeadline).toLocaleString('fr-FR', {
                    dateStyle: 'long',
                    timeStyle: 'short',
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lieux</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tender.openingLocation && (
              <div>
                <label className="text-sm text-muted-foreground">Lieu d'ouverture des plis</label>
                <div className="flex items-center gap-2 mt-1">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <p className="text-base" data-testid="text-openingLocation">{tender.openingLocation}</p>
                </div>
              </div>
            )}

            {tender.executionLocation && (
              <div>
                <label className="text-sm text-muted-foreground">Lieu d'exécution</label>
                <div className="flex items-center gap-2 mt-1">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <p className="text-base" data-testid="text-executionLocation">{tender.executionLocation}</p>
                </div>
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
                  {new Date(tender.createdAt).toLocaleDateString('fr-FR', {
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
