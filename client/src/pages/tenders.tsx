import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Trash2,
  FileArchive,
  Globe,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Tender } from "@shared/schema";

interface ScrapedTender {
  refConsultation: string;
  orgAcronyme: string;
  reference: string;
  title: string;
  procedureType: string;
  category: string;
  publicationDate: string | null;
  submissionDeadline: string | null;
  buyer: string;
  executionLocation: string | null;
  portalUrl: string;
}

interface ImportResult {
  tenders: ScrapedTender[];
  totalFound: number;
  filtered: number;
  imported: number;
  skipped: number;
  errors: string[];
  importedRefs: string[];
  dryRun?: boolean;
}

function formatPortalDate(d: string | null): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function categoryColor(cat: string) {
  const map: Record<string, string> = {
    travaux: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    fournitures: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    services: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  };
  return map[cat] ?? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
}

export default function Tenders() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tenderToDelete, setTenderToDelete] = useState<Tender | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [buyerFilter, setBuyerFilter] = useState("REGION DE SOUS-MASSA");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();

  const previewMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/api/import/marchespublics", "POST", { buyerFilter, dryRun: true });
      return res.json() as Promise<ImportResult>;
    },
    onSuccess: (data) => {
      setImportResult({ ...data, dryRun: true });
      if (data.filtered === 0) {
        toast({ title: "Aucun résultat", description: `Aucun AO trouvé pour "${buyerFilter}".`, variant: "destructive" });
      } else {
        toast({ title: "Prévisualisation", description: `${data.filtered} AO trouvé(s) sur ${data.totalFound} consultations récentes.` });
      }
    },
    onError: (err: any) => {
      toast({ title: "Erreur de connexion", description: err.message || "Impossible de contacter le portail.", variant: "destructive" });
    },
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/api/import/marchespublics", "POST", { buyerFilter, dryRun: false });
      return res.json() as Promise<ImportResult>;
    },
    onSuccess: (data) => {
      setImportResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/tenders"] });
      toast({ title: "Import terminé", description: `${data.imported} AO importé(s), ${data.skipped} ignoré(s).` });
    },
    onError: (err: any) => {
      toast({ title: "Erreur d'import", description: err.message || "Erreur lors de l'import.", variant: "destructive" });
    },
  });

  const { data: tenders, isLoading } = useQuery<Tender[]>({
    queryKey: ["/api/tenders"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (tenderId: string) => {
      return apiRequest(`/api/tenders/${tenderId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenders"] });
      toast({
        title: "Succès",
        description: "L'appel d'offres a été supprimé avec succès.",
      });
      setDeleteDialogOpen(false);
      setTenderToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDeleteClick = (tender: Tender) => {
    setTenderToDelete(tender);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (tenderToDelete) {
      deleteMutation.mutate(tenderToDelete.id);
    }
  };

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
      publié: { variant: "default", label: "Publié" },
      "en cours de jugement": {
        variant: "outline",
        label: "En cours de jugement",
      },
      attribué: { variant: "default", label: "Attribué" },
      annulé: { variant: "destructive", label: "Annulé" },
      draft: { variant: "secondary", label: "Brouillon" },
      published: { variant: "default", label: "Publié" },
      closed: { variant: "outline", label: "Clôturé" },
      awarded: { variant: "default", label: "Attribué" },
      cancelled: { variant: "destructive", label: "Annulé" },
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

  const getProcedureLabel = (procedure: string) => {
    const normalized = normalizeProcedureType(procedure);
    const labels: Record<string, string> = {
      "Appel d'offres ouvert": "Appel d'offres ouvert",
      "Appel d'offres ouvert simplifié": "AO ouvert simplifié",
      "Appel d'offres restreint": "Appel d'offres restreint",
      "Concours architectural": "Concours architectural",
      "Consultation architecturale": "Consultation architecturale",
      "Appel à manifestation d'intérêt": "Appel à manifestation d'intérêt",
    };
    return labels[normalized] || normalized;
  };

  const hasActiveFilters =
    searchQuery !== "" || statusFilter !== "all" || categoryFilter !== "all";

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setCategoryFilter("all");
  };

  const filteredTenders = tenders?.filter((tender) => {
    const normalizedStatus = normalizeStatus(tender.status);
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      tender.title.toLowerCase().includes(q) ||
      tender.reference.toLowerCase().includes(q) ||
      tender.procedureType.toLowerCase().includes(q) ||
      normalizeProcedureType(tender.procedureType).toLowerCase().includes(q) ||
      (tender.description ?? "").toLowerCase().includes(q) ||
      (tender.openingLocation ?? "").toLowerCase().includes(q) ||
      (tender.executionLocation ?? "").toLowerCase().includes(q) ||
      tender.category.toLowerCase().includes(q);

    const matchesStatus =
      statusFilter === "all" || normalizedStatus === statusFilter;
    const matchesCategory =
      categoryFilter === "all" || tender.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

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
          <Button variant="outline" data-testid="button-import" onClick={() => { setImportResult(null); setImportDialogOpen(true); }}>
            <Globe className="mr-2 h-4 w-4" />
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
            <div className="flex gap-2 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44" data-testid="select-status">
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
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="text-muted-foreground"
                  data-testid="button-reset-filters"
                >
                  Effacer les filtres
                </Button>
              )}
            </div>
          </div>
          {!isLoading && tenders && (
            <p className="text-sm text-muted-foreground mt-1" data-testid="text-results-count">
              {filteredTenders?.length ?? 0} résultat{(filteredTenders?.length ?? 0) !== 1 ? "s" : ""} sur {tenders.length} appel{tenders.length !== 1 ? "s" : ""} d'offres
            </p>
          )}
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
                          <span className="font-medium">
                            {tender.reference}
                          </span>
                          <span>•</span>
                          <span>{getCategoryLabel(tender.category)}</span>
                          <span>•</span>
                          <span>{getProcedureLabel(tender.procedureType)}</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {tender.documentUrl && (
                          <a href={tender.documentUrl} target="_blank" rel="noreferrer" title="Télécharger le dossier">
                            <Button
                              variant="ghost"
                              size="icon"
                              data-testid={`button-download-${tender.id}`}
                            >
                              <FileArchive className="h-4 w-4 text-primary" />
                            </Button>
                          </a>
                        )}
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
                          <p className="text-muted-foreground">
                            Date & heure limite
                          </p>
                          <p className="font-medium">
                            {tender.submissionDeadline ? (
                              <>
                                {new Date(
                                  tender.submissionDeadline,
                                ).toLocaleString("fr-FR", {
                                  dateStyle: "long",
                                  timeStyle: "short",
                                })}
                                <span className="text-xs text-muted-foreground ml-2">
                                  (
                                  {formatDistanceToNow(
                                    new Date(tender.submissionDeadline),
                                    {
                                      addSuffix: true,
                                      locale: fr,
                                    },
                                  )}
                                  )
                                </span>
                              </>
                            ) : (
                              "Non définie"
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground">Estimation</p>
                          <p className="font-medium">
                            {tender.estimatedBudget
                              ? `${Number(tender.estimatedBudget).toLocaleString("fr-FR")} ${tender.currency}`
                              : "Non communiqué"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground">
                            Nombre de lots
                          </p>
                          <p className="font-medium">
                            {tender.lotsNumber ?? "Non défini"}
                          </p>
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
              <h3 className="text-lg font-medium mb-2">
                Aucun appel d'offres trouvé
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                {searchQuery ||
                statusFilter !== "all" ||
                categoryFilter !== "all"
                  ? "Essayez de modifier vos filtres de recherche"
                  : "Commencez par créer votre premier appel d'offres"}
              </p>
              {!searchQuery &&
                statusFilter === "all" &&
                categoryFilter === "all" && (
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

      {/* ── Modal import portail ─────────────────────────────────────────── */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Importer depuis marchespublics.gov.ma
            </DialogTitle>
            <DialogDescription>
              Le portail est interrogé en temps réel. Prévisualisez avant d'importer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="import-buyer">Acheteur public (correspondance exacte)</Label>
              <Input
                id="import-buyer"
                data-testid="input-buyer-filter"
                value={buyerFilter}
                onChange={(e) => setBuyerFilter(e.target.value)}
                disabled={previewMutation.isPending || importMutation.isPending}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => previewMutation.mutate()}
                disabled={previewMutation.isPending || importMutation.isPending || !buyerFilter.trim()}
                data-testid="button-preview"
              >
                {previewMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                Prévisualiser
              </Button>
              <Button
                size="sm"
                onClick={() => importMutation.mutate()}
                disabled={previewMutation.isPending || importMutation.isPending || !buyerFilter.trim()}
                data-testid="button-import-confirm"
              >
                {importMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                Importer
              </Button>
            </div>

            {(previewMutation.isPending || importMutation.isPending) && (
              <Alert>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <AlertDescription>Connexion au portail en cours… (10–30 secondes)</AlertDescription>
              </Alert>
            )}

            {importResult && (
              <>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "Consultations récentes", value: importResult.totalFound, color: "" },
                    { label: `Trouvés (${buyerFilter.split(" ").pop()})`, value: importResult.filtered, color: "text-primary" },
                    { label: "Importés", value: importResult.dryRun ? "—" : importResult.imported, color: "text-green-600" },
                    { label: "Doublons", value: importResult.dryRun ? "—" : importResult.skipped, color: "text-yellow-600" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-lg border p-3">
                      <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                      <div className="text-xs text-muted-foreground">{s.label}</div>
                    </div>
                  ))}
                </div>

                {importResult.errors?.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <ul className="list-disc list-inside text-sm space-y-0.5">
                        {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {importResult.tenders.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 border-b">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium">Référence</th>
                          <th className="text-left px-3 py-2 font-medium">Objet</th>
                          <th className="text-left px-3 py-2 font-medium">Catégorie</th>
                          <th className="text-left px-3 py-2 font-medium">Date limite</th>
                          <th className="text-left px-3 py-2 font-medium">Statut</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResult.tenders.map((t) => {
                          const wasImported = importResult.importedRefs?.includes(t.reference);
                          return (
                            <tr key={t.refConsultation} className="border-b last:border-0 hover:bg-muted/30" data-testid={`row-import-${t.refConsultation}`}>
                              <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{t.reference}</td>
                              <td className="px-3 py-2 max-w-[240px]">
                                <div className="line-clamp-2">{t.title}</div>
                              </td>
                              <td className="px-3 py-2">
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${categoryColor(t.category)}`}>
                                  {t.category}
                                </span>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-muted-foreground text-xs">{formatPortalDate(t.submissionDeadline)}</td>
                              <td className="px-3 py-2">
                                {importResult.dryRun ? (
                                  <span className="text-xs text-muted-foreground">À importer</span>
                                ) : wasImported ? (
                                  <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Importé
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-yellow-600 text-xs font-medium">
                                    <XCircle className="h-3.5 w-3.5" /> Doublon
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <a href={t.portalUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary" data-testid={`link-portal-${t.refConsultation}`}>
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground text-sm py-6">
                    Aucun AO trouvé pour <strong>{buyerFilter}</strong> dans les consultations récentes.
                  </p>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer l'appel d'offres "
              {tenderToDelete?.title}" ? Cette action est irréversible.
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
  );
}
