import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Briefcase,
  Calendar,
  Building2,
  Pencil,
  Trash2,
  Plus,
  DollarSign,
  Clock,
  ShieldCheck,
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
import type { Contract, Tender, Supplier } from "@shared/schema"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"

export default function Contracts() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { toast } = useToast()

  const { data: contracts, isLoading } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
  })

  const { data: tenders } = useQuery<Tender[]>({
    queryKey: ["/api/tenders"],
  })

  const { data: suppliers } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/contracts/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] })
      toast({ title: "Succès", description: "Le marché a été supprimé." })
      setDeleteId(null)
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" })
      setDeleteId(null)
    },
  })

  const getTenderReference = (tenderId: string) => {
    const tender = tenders?.find((t) => t.id === tenderId)
    return tender ? `${tender.reference}` : "—"
  }

  const getSupplierName = (supplierId: string) => {
    const supplier = suppliers?.find((s) => s.id === supplierId)
    return supplier ? supplier.name : "—"
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; label: string }> = {
      signed: { variant: "secondary", label: "Signé" },
      in_progress: { variant: "default", label: "En cours" },
      suspended: { variant: "outline", label: "Suspendu" },
      completed: { variant: "default", label: "Terminé" },
      terminated: { variant: "destructive", label: "Résilié" },
    }
    const config = statusConfig[status] || statusConfig.signed
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const formatDate = (value: string | Date | null | undefined) => {
    if (!value) return "—"
    const d = new Date(value as string)
    if (isNaN(d.getTime())) return "—"
    return d.toLocaleDateString("fr-FR")
  }

  const formatAmount = (value: string | number | null | undefined, currency = "MAD") => {
    if (!value) return "—"
    return `${Number(value).toLocaleString("fr-FR")} ${currency}`
  }

  const filteredContracts = contracts?.filter((contract) => {
    const tender = tenders?.find((t) => t.id === contract.tenderId)
    const supplier = suppliers?.find((s) => s.id === contract.supplierId)
    const matchesSearch =
      contract.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.contractNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tender?.reference || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (supplier?.name || "").toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || contract.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-medium" data-testid="page-title">
            Marchés
          </h1>
          <p className="text-muted-foreground mt-2">
            Gestion et suivi des marchés
          </p>
        </div>
        <Link href="/contracts/new">
          <Button data-testid="button-new-contract">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau marché
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par numéro, titre, AO, prestataire..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44" data-testid="select-status">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="signed">Signé</SelectItem>
                <SelectItem value="in_progress">En cours</SelectItem>
                <SelectItem value="suspended">Suspendu</SelectItem>
                <SelectItem value="completed">Terminé</SelectItem>
                <SelectItem value="terminated">Résilié</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <div className="grid grid-cols-3 gap-4">
                        <Skeleton className="h-4" />
                        <Skeleton className="h-4" />
                        <Skeleton className="h-4" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredContracts && filteredContracts.length > 0 ? (
            <div className="space-y-4" data-testid="contracts-list">
              {filteredContracts.map((contract) => (
                <Card
                  key={contract.id}
                  className="hover-elevate"
                  data-testid={`contract-card-${contract.id}`}
                >
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                          <span
                            className="font-semibold text-base"
                            data-testid={`text-contract-number-${contract.id}`}
                          >
                            {contract.contractNumber}
                          </span>
                          {getStatusBadge(contract.status)}
                        </div>
                        <p
                          className="text-muted-foreground text-sm mb-4"
                          data-testid={`text-title-${contract.id}`}
                        >
                          {contract.title}
                        </p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
                          <div className="flex items-start gap-2">
                            <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                            <div>
                              <p className="text-muted-foreground text-xs">Réf. AO</p>
                              <p
                                className="font-medium"
                                data-testid={`text-tender-${contract.id}`}
                              >
                                {getTenderReference(contract.tenderId)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                            <div>
                              <p className="text-muted-foreground text-xs">Prestataire</p>
                              <p
                                className="font-medium"
                                data-testid={`text-supplier-${contract.id}`}
                              >
                                {getSupplierName(contract.supplierId)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                            <div>
                              <p className="text-muted-foreground text-xs">Montant TTC</p>
                              <p
                                className="font-medium"
                                data-testid={`text-amount-${contract.id}`}
                              >
                                {formatAmount(contract.totalAmount ?? contract.contractAmount, contract.currency)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                            <div>
                              <p className="text-muted-foreground text-xs">Délai exécution</p>
                              <p
                                className="font-medium"
                                data-testid={`text-execution-delay-${contract.id}`}
                              >
                                {contract.executionDelay ? `${contract.executionDelay} j` : "—"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                            <div>
                              <p className="text-muted-foreground text-xs">Date Visa</p>
                              <p
                                className="font-medium"
                                data-testid={`text-visa-date-${contract.id}`}
                              >
                                {formatDate(contract.visaDate)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                            <div>
                              <p className="text-muted-foreground text-xs">Date Commencement</p>
                              <p
                                className="font-medium"
                                data-testid={`text-start-date-${contract.id}`}
                              >
                                {formatDate(contract.startDate)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start gap-2">
                            <ShieldCheck className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                            <div>
                              <p className="text-muted-foreground text-xs">Délai garantie</p>
                              <p
                                className="font-medium"
                                data-testid={`text-guarantee-delay-${contract.id}`}
                              >
                                {contract.guaranteeDelay ? `${contract.guaranteeDelay} mois` : "—"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                            <div>
                              <p className="text-muted-foreground text-xs">Caution définitive</p>
                              <p
                                className="font-medium"
                                data-testid={`text-guarantee-amount-${contract.id}`}
                              >
                                {formatAmount(contract.guaranteeAmount, contract.currency)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 shrink-0">
                        <Link href={`/contracts/${contract.id}/edit`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`button-edit-${contract.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(contract.id)}
                          data-testid={`button-delete-${contract.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Briefcase className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucun marché trouvé</h3>
              <p className="text-sm text-muted-foreground mb-6">
                {searchQuery || statusFilter !== "all"
                  ? "Essayez de modifier vos filtres de recherche"
                  : "Commencez par créer votre premier marché"}
              </p>
              {!searchQuery && statusFilter === "all" && (
                <Link href="/contracts/new">
                  <Button data-testid="button-new-contract-empty">
                    <Plus className="h-4 w-4 mr-2" />
                    Nouveau marché
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le marché</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Toutes les données associées (ordres de service,
              avenants, décomptes) seront également supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
