import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  Download, 
  Search, 
  Globe, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Loader2,
  ExternalLink,
  RefreshCw
} from "lucide-react";

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

function categoryBadge(cat: string) {
  const map: Record<string, string> = {
    travaux: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    fournitures: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    services: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  };
  return map[cat] ?? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export default function ImportPage() {
  const { toast } = useToast();
  const [buyerFilter, setBuyerFilter] = useState("SOUS-MASSA");
  const [result, setResult] = useState<ImportResult | null>(null);

  const previewMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/import/marchespublics", {
        buyerFilter,
        dryRun: true,
      });
      return res.json() as Promise<ImportResult>;
    },
    onSuccess: (data) => {
      setResult({ ...data, dryRun: true });
      if (data.filtered === 0) {
        toast({
          title: "Aucun résultat",
          description: `Aucun AO trouvé pour l'acheteur "${buyerFilter}" sur la première page du portail.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Prévisualisation réussie",
          description: `${data.filtered} AO trouvé(s) sur ${data.totalFound} consultations récentes.`,
        });
      }
    },
    onError: (err: any) => {
      toast({
        title: "Erreur de connexion au portail",
        description: err.message || "Impossible de contacter marchespublics.gov.ma",
        variant: "destructive",
      });
    },
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/import/marchespublics", {
        buyerFilter,
        dryRun: false,
      });
      return res.json() as Promise<ImportResult>;
    },
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/tenders"] });
      toast({
        title: "Import terminé",
        description: `${data.imported} AO importé(s), ${data.skipped} ignoré(s) (déjà présents).`,
      });
    },
    onError: (err: any) => {
      toast({
        title: "Erreur d'import",
        description: err.message || "Erreur lors de l'import",
        variant: "destructive",
      });
    },
  });

  const isLoading = previewMutation.isPending || importMutation.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Import depuis le portail national</h1>
        <p className="text-muted-foreground mt-1">
          Importer des appels d'offres depuis{" "}
          <a
            href="https://www.marchespublics.gov.ma"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1"
            data-testid="link-portal"
          >
            marchespublics.gov.ma <ExternalLink className="h-3 w-3" />
          </a>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Paramètres de recherche
          </CardTitle>
          <CardDescription>
            Le portail est interrogé en temps réel. Les AO trouvés peuvent être prévisualisés avant l'import.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="input-buyer">Acheteur public (filtre)</Label>
            <Input
              id="input-buyer"
              data-testid="input-buyer-filter"
              value={buyerFilter}
              onChange={(e) => setBuyerFilter(e.target.value)}
              placeholder="ex: SOUSS-MASSA"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Le nom de l'acheteur sera recherché dans les 500 consultations récentes du portail.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => previewMutation.mutate()}
              disabled={isLoading || !buyerFilter.trim()}
              data-testid="button-preview"
            >
              {previewMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Prévisualiser
            </Button>
            <Button
              onClick={() => importMutation.mutate()}
              disabled={isLoading || !buyerFilter.trim()}
              data-testid="button-import"
            >
              {importMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Importer
            </Button>
          </div>

          {isLoading && (
            <Alert>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Connexion au portail marchespublics.gov.ma en cours… (peut prendre 10–30 secondes)
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {result && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold" data-testid="stat-total-found">{result.totalFound}</div>
                <div className="text-sm text-muted-foreground">Consultations récentes</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-primary" data-testid="stat-filtered">{result.filtered}</div>
                <div className="text-sm text-muted-foreground">Trouvés ({buyerFilter})</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600" data-testid="stat-imported">{result.dryRun ? "—" : result.imported}</div>
                <div className="text-sm text-muted-foreground">Importés</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-yellow-600" data-testid="stat-skipped">{result.dryRun ? "—" : result.skipped}</div>
                <div className="text-sm text-muted-foreground">Ignorés (doublons)</div>
              </CardContent>
            </Card>
          </div>

          {result.errors && result.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-1">Erreurs lors de l'import :</div>
                <ul className="list-disc list-inside space-y-0.5 text-sm">
                  {result.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {result.tenders.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {result.dryRun ? "Prévisualisation" : "Résultats de l'import"} — {result.tenders.length} AO
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium">Référence</th>
                        <th className="text-left px-4 py-3 font-medium">Objet</th>
                        <th className="text-left px-4 py-3 font-medium">Catégorie</th>
                        <th className="text-left px-4 py-3 font-medium">Publication</th>
                        <th className="text-left px-4 py-3 font-medium">Date limite</th>
                        <th className="text-left px-4 py-3 font-medium">Statut</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.tenders.map((t) => {
                        const wasImported = result.importedRefs?.includes(t.reference);
                        const wasSkipped = !result.dryRun && !wasImported;
                        return (
                          <tr
                            key={t.refConsultation}
                            className="border-b hover:bg-muted/30 transition-colors"
                            data-testid={`row-tender-${t.refConsultation}`}
                          >
                            <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                              {t.reference}
                            </td>
                            <td className="px-4 py-3 max-w-xs">
                              <div className="line-clamp-2 text-sm">{t.title}</div>
                              {t.executionLocation && (
                                <div className="text-xs text-muted-foreground truncate">{t.executionLocation}</div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${categoryBadge(t.category)}`}>
                                {t.category}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                              {formatDate(t.publicationDate)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {formatDate(t.submissionDeadline)}
                            </td>
                            <td className="px-4 py-3">
                              {result.dryRun ? (
                                <Badge variant="outline" className="text-xs">À importer</Badge>
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
                            <td className="px-4 py-3">
                              <a
                                href={t.portalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-primary"
                                data-testid={`link-portal-${t.refConsultation}`}
                                title="Voir sur le portail"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  Aucun AO trouvé pour l'acheteur <strong>{buyerFilter}</strong> dans les consultations récentes.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Le portail affiche les consultations actives récentes. Essayez un filtre différent.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
