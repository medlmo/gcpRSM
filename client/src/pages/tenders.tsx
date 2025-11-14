import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Plus, 
  Search, 
  Filter,
  FileText,
  Calendar,
  DollarSign,
  Layers,
  Download,
  Eye,
  Edit,
  Trash2
} from "lucide-react"
import { Link } from "wouter"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { formatDistanceToNow } from "date-fns"
import { fr } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { apiRequest, queryClient } from "@/lib/queryClient"
import type { Tender } from "@shared/schema"

export default function Tenders() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [tenderToDelete, setTenderToDelete] = useState<Tender | null>(null)
  const { toast } = useToast()

  const { data: tenders, isLoading } = useQuery<Tender[]>({
    queryKey: ["/api/tenders"],
  })

  const deleteMutation = useMutation({
    mutationFn: async (tenderId: string) => {
      return apiRequest(`/api/tenders/${tenderId}`, 'DELETE')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenders'] })
      toast({
        title: "Succès",
        description: "L'appel d'offres a été supprimé avec succès.",
      })
      setDeleteDialogOpen(false)
      setTenderToDelete(null)
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const handleDeleteClick = (tender: Tender) => {
    setTenderToDelete(tender)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (tenderToDelete) {
      deleteMutation.mutate(tenderToDelete.id)
    }
  }

  const normalizeStatus = (status: string) => {
    switch (status) {
      case "draft":
        return "en cours d'étude"
      case "published":
        return "publié"
      case "closed":
        return "en cours de jugement"
      case "awarded":
        return "attribué"
      case "cancelled":
        return "annulé"
      default:
        return status
    }
  }

  const normalizeProcedureType = (procedureType: string) => {
    switch (procedureType) {
      case "AO ouvert":
        return "Appel d'offres ouvert"
      case "AO restreint":
        return "Appel d'offres restreint"
      case "Négociée compétitive":
        return "Appel d'offres ouvert simplifié"
      case "Concours":
        return "Concours architectural"
      case "Consultation":
        return "Consultation architecturale"
      default:
        return procedureType
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; label: string }> = {
      "en cours d'étude": { variant: "secondary", label: "En cours d'étude" },
      "publié": { variant: "default", label: "Publié" },
      "en cours de jugement": { variant: "outline", label: "En cours de jugement" },
      "attribué": { variant: "default", label: "Attribué" },
      "annulé": { variant: "destructive", label: "Annulé" },
      draft: { variant: "secondary", label: "Brouillon" },
      published: { variant: "default", label: "Publié" },
      closed: { variant: "outline", label: "Clôturé" },
      awarded: { variant: "default", label: "Attribué" },
      cancelled: { variant: "destructive", label: "Annulé" },
    }
    const config = statusConfig[status] || statusConfig["en cours d'étude"]
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      travaux: "Travaux",
      fournitures: "Fournitures",
      services: "Services",
    }
    return labels[category] || category
  }

  const getProcedureLabel = (procedure: string) => {
    const normalized = normalizeProcedureType(procedure)
    const labels: Record<string, string> = {
      "Appel d'offres ouvert": "Appel d'offres ouvert",
      "Appel d'offres ouvert simplifié": "AO ouvert simplifié",
      "Appel d'offres restreint": "Appel d'offres restreint",
      "Concours architectural": "Concours architectural",
      "Consultation architecturale": "Consultation architecturale",
      "Appel à manifestation d'intérêt": "Appel à manifestation d'intérêt",
    }
    return labels[normalized] || normalized
  }

  const filteredTenders = tenders?.filter(tender => {
    const normalizedStatus = normalizeStatus(tender.status)
    const matchesSearch = 
      tender.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tender.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      normalizeProcedureType(tender.procedureType).toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === "all" || normalizedStatus === statusFilter
    const matchesCategory = categoryFilter === "all" || tender.category === categoryFilter
    
    return matchesSearch && matchesStatus && matchesCategory
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-medium" data-testid="page-title">
            Appels d'offres
          </h1>
          <p className="text-muted-foreground mt-2">
            Gestion complète des appels d'offres
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" data-testid="button-import">
            <Download className="mr-2 h-4 w-4" />
            Importer depuis marchespublics.gov.ma
          </Button>
          <Link href="/tenders/new">
            <Button data-testid="button-create-tender">
              <Plus className="mr-2 h-4 w-4" />
              Nouvel appel d'offres
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par référence, titre ou maître d'ouvrage..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40" data-testid="select-status">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="en cours d'étude">En cours d'étude</SelectItem>
                  <SelectItem value="publié">Publié</SelectItem>
                  <SelectItem value="en cours de jugement">En cours de jugement</SelectItem>
                  <SelectItem value="attribué">Attribué</SelectItem>
                  <SelectItem value="annulé">Annulé</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40" data-testid="select-category">
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes catégories</SelectItem>
                  <SelectItem value="travaux">Travaux</SelectItem>
                  <SelectItem value="fournitures">Fournitures</SelectItem>
                  <SelectItem value="services">Services</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-6">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredTenders && filteredTenders.length > 0 ? (
            <div className="space-y-4" data-testid="tenders-list">
              {filteredTenders.map((tender) => (
                <Card 
                  key={tender.id} 
                  className="hover-elevate"
                  data-testid={`tender-card-${tender.id}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-lg">
                            {tender.title}
                          </CardTitle>
                          {getStatusBadge(normalizeStatus(tender.status))}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="font-medium">{tender.reference}</span>
                          <span>•</span>
                          <span>{getCategoryLabel(tender.category)}</span>
                          <span>•</span>
                          <span>{getProcedureLabel(tender.procedureType)}</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Link href={`/tenders/${tender.id}`}>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            data-testid={`button-view-${tender.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/tenders/${tender.id}/edit`}>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            data-testid={`button-edit-${tender.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDeleteClick(tender)}
                          data-testid={`button-delete-${tender.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground">Date & heure limite</p>
                          <p className="font-medium">
                            {tender.submissionDeadline ? (
                              <>
                                {new Date(tender.submissionDeadline).toLocaleString('fr-FR', {
                                  dateStyle: "long",
                                  timeStyle: "short",
                                })}
                                <span className="text-xs text-muted-foreground ml-2">
                                  ({formatDistanceToNow(new Date(tender.submissionDeadline), {
                                    addSuffix: true,
                                    locale: fr,
                                  })})
                                </span>
                              </>
                            ) : "Non définie"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground">Budget estimatif</p>
                          <p className="font-medium">
                            {tender.estimatedBudget 
                              ? `${Number(tender.estimatedBudget).toLocaleString('fr-FR')} ${tender.currency}`
                              : "Non communiqué"
                            }
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground">Nombre de lots</p>
                          <p className="font-medium">{tender.lotsNumber ?? "Non défini"}</p>
                        </div>
                      </div>
                    </div>
                    {tender.importedFrom && (
                      <div className="mt-4 pt-4 border-t">
                        <Badge variant="outline" className="text-xs">
                          <Download className="mr-1 h-3 w-3" />
                          Importé depuis {tender.importedFrom}
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucun appel d'offres trouvé</h3>
              <p className="text-sm text-muted-foreground mb-6">
                {searchQuery || statusFilter !== "all" || categoryFilter !== "all"
                  ? "Essayez de modifier vos filtres de recherche"
                  : "Commencez par créer votre premier appel d'offres"
                }
              </p>
              {!searchQuery && statusFilter === "all" && categoryFilter === "all" && (
                <Link href="/tenders/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Créer un appel d'offres
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer l'appel d'offres "{tenderToDelete?.title}" ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
