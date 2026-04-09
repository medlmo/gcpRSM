import { useState, useMemo } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
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
import {
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Pencil,
  Trash2,
  Calculator,
  Star,
  Plus,
  FolderKanban,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import type { Bid, Tender, Supplier } from "@shared/schema"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"

type BidWithEval = Bid & {
  amount: number
  isExcessive: boolean
  isAbnormallyLow: boolean
  isRetained: boolean
  rank: number | null
  isMieuxDisante: boolean
  ecartReference: number
}

function evaluateBids(
  category: string,
  estimatedBudget: number,
  bids: Bid[]
): { evaluated: BidWithEval[]; prixDeReference: number | null; retainedCount: number } {
  const upperLimit = estimatedBudget * 1.2
  const lowerPct = category === "travaux" ? 0.8 : 0.75
  const lowerLimit = estimatedBudget * lowerPct

  const classified: BidWithEval[] = bids.map((bid) => {
    const amount = Number(bid.finalAmount)
    const isExcessive = amount > upperLimit
    const isAbnormallyLow = amount < lowerLimit
    const isRetained = !isExcessive && !isAbnormallyLow
    return { ...bid, amount, isExcessive, isAbnormallyLow, isRetained, rank: null, isMieuxDisante: false, ecartReference: 0 }
  })

  const retained = classified.filter((b) => b.isRetained)

  let prixDeReference: number | null = null
  if (retained.length > 0) {
    const avgRetained = retained.reduce((s, b) => s + b.amount, 0) / retained.length
    prixDeReference = (estimatedBudget + avgRetained) / 2
  }

  if (prixDeReference !== null) {
    const pr = prixDeReference
    classified.forEach((b) => {
      b.ecartReference = pr > 0 ? ((b.amount - pr) / pr) * 100 : 0
    })
    const belowOrEqual = retained.filter((b) => b.amount <= pr).sort((a, b) => b.amount - a.amount)
    const above = retained.filter((b) => b.amount > pr).sort((a, b) => a.amount - b.amount)
    const ranked = [...belowOrEqual, ...above]
    ranked.forEach((b, i) => {
      b.rank = i + 1
      if (i === 0) b.isMieuxDisante = true
    })
  }

  return { evaluated: classified, prixDeReference, retainedCount: retained.length }
}

const fmt = (v: number, currency = "MAD") =>
  `${v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`

const fmtPct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`

export default function Bids() {
  const { toast } = useToast()

  const [selectedTenderId, setSelectedTenderId] = useState<string>("")
  const [concurrentId, setConcurrentId] = useState<string>("")
  const [montant, setMontant] = useState<string>("")
  const [showResults, setShowResults] = useState(false)
  const [editBid, setEditBid] = useState<{ id: string; concurrentId: string; montant: string } | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: tenders, isLoading: loadingTenders } = useQuery<Tender[]>({ queryKey: ["/api/tenders"] })
  const { data: suppliers } = useQuery<Supplier[]>({ queryKey: ["/api/suppliers"] })
  const { data: bids, isLoading: loadingBids } = useQuery<Bid[]>({ queryKey: ["/api/bids"] })

  const selectedTender = tenders?.find((t) => t.id === selectedTenderId) ?? null
  const tenderBids = useMemo(
    () => bids?.filter((b) => b.tenderId === selectedTenderId) ?? [],
    [bids, selectedTenderId]
  )

  const estimation = Number(selectedTender?.estimatedBudget) || 0
  const currency = selectedTender?.currency ?? "MAD"
  const category = selectedTender?.category ?? ""
  const categoryLabel = category === "travaux" ? "Marché de travaux" : "Marché de services/fournitures"

  const createMutation = useMutation({
    mutationFn: (data: object) => apiRequest("/api/bids", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bids"] })
      toast({ title: "Offre ajoutée", description: "L'offre a été enregistrée." })
      setConcurrentId("")
      setMontant("")
      setShowResults(false)
    },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => apiRequest(`/api/bids/${id}`, "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bids"] })
      toast({ title: "Offre modifiée" })
      setEditBid(null)
      setShowResults(false)
    },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/bids/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bids"] })
      toast({ title: "Offre supprimée" })
      setDeleteId(null)
      setShowResults(false)
    },
    onError: (e: Error) => {
      toast({ title: "Erreur", description: e.message, variant: "destructive" })
      setDeleteId(null)
    },
  })

  const handleAjouter = () => {
    if (!selectedTenderId || !concurrentId || !montant) {
      toast({ title: "Champs requis", description: "Veuillez sélectionner un concurrent et saisir un montant.", variant: "destructive" })
      return
    }
    const amount = parseFloat(montant)
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Montant invalide", description: "Veuillez saisir un montant valide.", variant: "destructive" })
      return
    }
    createMutation.mutate({
      tenderId: selectedTenderId,
      supplierId: concurrentId,
      proposedAmount: amount.toString(),
      finalAmount: amount.toString(),
      currency,
      status: "submitted",
    })
  }

  const handleSaveEdit = () => {
    if (!editBid) return
    const amount = parseFloat(editBid.montant)
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Montant invalide", variant: "destructive" })
      return
    }
    updateMutation.mutate({
      id: editBid.id,
      data: {
        supplierId: editBid.concurrentId,
        proposedAmount: amount.toString(),
        finalAmount: amount.toString(),
      },
    })
  }

  const getSupplierName = (id: string) => suppliers?.find((s) => s.id === id)?.name ?? id.slice(0, 8)

  const { evaluated, prixDeReference, retainedCount } = useMemo(
    () => evaluateBids(category, estimation, tenderBids),
    [category, estimation, tenderBids]
  )

  const lowerPct = category === "travaux" ? 20 : 25

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-medium" data-testid="page-title">Offres soumises</h1>
        <p className="text-muted-foreground mt-1">Saisie et évaluation des offres par appel d'offres</p>
      </div>

      {/* Formulaire de saisie */}
      <Card>
        <CardContent className="pt-6 space-y-5">
          {/* N° AO */}
          <div className="space-y-1.5">
            <Label htmlFor="ao-select">N° Appel d'offres</Label>
            {loadingTenders ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select
                value={selectedTenderId}
                onValueChange={(v) => {
                  setSelectedTenderId(v)
                  setConcurrentId("")
                  setMontant("")
                  setShowResults(false)
                  setEditBid(null)
                }}
              >
                <SelectTrigger id="ao-select" className="h-12 text-base" data-testid="select-ao">
                  <SelectValue placeholder="Sélectionner un appel d'offres..." />
                </SelectTrigger>
                <SelectContent>
                  {tenders?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.reference} — {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {selectedTender && (
            <>
              {/* Type de marché */}
              <div className="space-y-2">
                <Label>Type de marché</Label>
                <RadioGroup value={category === "travaux" ? "travaux" : "services"} className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="travaux" id="type-travaux" disabled />
                    <Label htmlFor="type-travaux" className="cursor-default font-normal">
                      Marché de travaux
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="services" id="type-services" disabled />
                    <Label htmlFor="type-services" className="cursor-default font-normal">
                      Marché de services/fournitures
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Estimation */}
              <div className="space-y-1.5">
                <Label>Estimation du maître d'ouvrage ({currency})</Label>
                <Input
                  value={estimation > 0 ? estimation.toLocaleString("fr-FR", { minimumFractionDigits: 2 }) : "Non renseignée"}
                  readOnly
                  className="bg-muted/50 text-muted-foreground h-12"
                  data-testid="input-estimation"
                />
              </div>

              {/* Ligne ajout d'offre */}
              {!editBid && (
                <div className="flex gap-3 items-end">
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor="concurrent-select">Nom du concurrent</Label>
                    <Select value={concurrentId} onValueChange={setConcurrentId}>
                      <SelectTrigger id="concurrent-select" className="h-12" data-testid="select-concurrent">
                        <SelectValue placeholder="Nom du concurrent" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers?.filter((s) => s.status === "active").map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor="montant-input">Montant de l'offre ({currency})</Label>
                    <Input
                      id="montant-input"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={`Montant de l'offre (${currency})`}
                      value={montant}
                      onChange={(e) => setMontant(e.target.value)}
                      className="h-12"
                      data-testid="input-montant"
                      onKeyDown={(e) => e.key === "Enter" && handleAjouter()}
                    />
                  </div>
                  <Button
                    className="h-12 px-6 shrink-0 bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={handleAjouter}
                    disabled={createMutation.isPending}
                    data-testid="button-ajouter-offre"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {createMutation.isPending ? "Ajout..." : "Ajouter l'offre"}
                  </Button>
                </div>
              )}

              {/* Ligne édition */}
              {editBid && (
                <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
                  <p className="text-sm font-medium">Modifier l'offre</p>
                  <div className="flex gap-3 items-end">
                    <div className="flex-1 space-y-1.5">
                      <Label>Concurrent</Label>
                      <Select value={editBid.concurrentId} onValueChange={(v) => setEditBid({ ...editBid, concurrentId: v })}>
                        <SelectTrigger className="h-10" data-testid="select-edit-concurrent">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers?.filter((s) => s.status === "active").map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <Label>Montant ({currency})</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editBid.montant}
                        onChange={(e) => setEditBid({ ...editBid, montant: e.target.value })}
                        className="h-10"
                        data-testid="input-edit-montant"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveEdit} disabled={updateMutation.isPending} data-testid="button-save-edit">
                        {updateMutation.isPending ? "Enreg..." : "Enregistrer"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditBid(null)} data-testid="button-cancel-edit">
                        Annuler
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Liste des offres soumises */}
      {selectedTender && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Offres soumises</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingBids ? (
              <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : tenderBids.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FolderKanban className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Aucune offre saisie pour cet AO</p>
                <p className="text-xs text-muted-foreground mt-1">Utilisez le formulaire ci-dessus pour ajouter des offres</p>
              </div>
            ) : (
              <>
                <table className="w-full text-sm" data-testid="bids-table">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Concurrent</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Montant ({currency})</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenderBids.map((bid) => (
                      <tr key={bid.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors" data-testid={`bid-row-${bid.id}`}>
                        <td className="py-3 px-3" data-testid={`text-supplier-${bid.id}`}>
                          {getSupplierName(bid.supplierId)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono" data-testid={`text-amount-${bid.id}`}>
                          {Number(bid.finalAmount).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => setEditBid({ id: bid.id, concurrentId: bid.supplierId, montant: Number(bid.finalAmount).toString() })}
                              data-testid={`button-edit-${bid.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteId(bid.id)}
                              data-testid={`button-delete-${bid.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="mt-4">
                  <Button
                    className="w-full h-12 text-base font-semibold bg-rose-600 hover:bg-rose-700 text-white"
                    onClick={() => setShowResults(true)}
                    data-testid="button-calculer"
                  >
                    <Calculator className="h-5 w-5 mr-2" />
                    Calculer le prix de référence
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Résultats de l'évaluation */}
      {showResults && selectedTender && tenderBids.length > 0 && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Résultats de l'évaluation
            </CardTitle>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1">
              <span>AO : <strong>{selectedTender.reference}</strong></span>
              <span>•</span>
              <span>Catégorie : <strong>{categoryLabel}</strong></span>
              <span>•</span>
              <span>Seuil excessif : &gt;+20%</span>
              <span>•</span>
              <span>Seuil anorm. bas : &lt;-{lowerPct}%</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Résumé */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-0.5">Estimation</p>
                <p className="font-semibold text-sm" data-testid="result-estimation">
                  {estimation > 0 ? fmt(estimation, currency) : "—"}
                </p>
              </div>
              <div className="bg-primary/10 rounded-lg p-3 border border-primary/20">
                <p className="text-xs text-muted-foreground mb-0.5">Prix de référence</p>
                <p className="font-bold text-sm text-primary" data-testid="result-prix-reference">
                  {prixDeReference !== null ? fmt(prixDeReference, currency) : "Insuffisant"}
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-0.5">Offres reçues</p>
                <p className="font-semibold text-sm" data-testid="result-total">{tenderBids.length}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-0.5">Offres retenues</p>
                <p className="font-semibold text-sm text-green-600" data-testid="result-retained">{retainedCount}</p>
              </div>
            </div>

            {prixDeReference !== null && estimation > 0 && (() => {
              const ret = evaluated.filter(b => b.isRetained)
              const avg = ret.reduce((s, b) => s + b.amount, 0) / ret.length
              return (
                <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2">
                  <span className="font-medium">Calcul :</span>{" "}
                  Prix de référence = (Estimation + Moy. offres retenues) ÷ 2
                  {" "}= ({fmt(estimation, currency)} + {fmt(avg, currency)}) ÷ 2 = <strong>{fmt(prixDeReference, currency)}</strong>
                </div>
              )
            })()}

            {/* Tableau de classement */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse" data-testid="evaluation-table">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left p-3 font-medium text-muted-foreground w-14">Rang</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Concurrent</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Offre ({currency})</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Écart</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Statut</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Désignation</th>
                  </tr>
                </thead>
                <tbody>
                  {evaluated
                    .sort((a, b) => {
                      if (a.rank !== null && b.rank !== null) return a.rank - b.rank
                      if (a.rank !== null) return -1
                      if (b.rank !== null) return 1
                      return a.amount - b.amount
                    })
                    .map((bid) => (
                      <tr
                        key={bid.id}
                        className={`border-b transition-colors ${
                          bid.isMieuxDisante
                            ? "bg-yellow-50 dark:bg-yellow-950/20"
                            : bid.isRetained
                            ? "bg-green-50/40 dark:bg-green-950/10"
                            : "bg-red-50/20 dark:bg-red-950/10 opacity-75"
                        }`}
                        data-testid={`eval-row-${bid.id}`}
                      >
                        <td className="p-3">
                          {bid.rank !== null ? (
                            <span className={`font-bold ${bid.rank === 1 ? "text-yellow-600 text-base" : "text-muted-foreground"}`}>
                              #{bid.rank}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className="p-3 font-medium" data-testid={`eval-supplier-${bid.id}`}>
                          {getSupplierName(bid.supplierId)}
                        </td>
                        <td className="p-3 text-right font-mono" data-testid={`eval-amount-${bid.id}`}>
                          {bid.amount.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className={`p-3 text-right font-mono text-xs ${
                          bid.ecartReference > 0 ? "text-orange-600" : bid.ecartReference < 0 ? "text-blue-600" : "text-muted-foreground"
                        }`} data-testid={`eval-ecart-${bid.id}`}>
                          {prixDeReference !== null ? fmtPct(bid.ecartReference) : "—"}
                        </td>
                        <td className="p-3 text-center">
                          {bid.isExcessive ? (
                            <Badge variant="outline" className="border-orange-400 text-orange-600 gap-1 text-xs">
                              <TrendingUp className="h-3 w-3" />Excessive
                            </Badge>
                          ) : bid.isAbnormallyLow ? (
                            <Badge variant="outline" className="border-red-400 text-red-600 gap-1 text-xs">
                              <TrendingDown className="h-3 w-3" />Anorm. basse
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-green-500 text-green-700 gap-1 text-xs">
                              <CheckCircle className="h-3 w-3" />Retenue
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {bid.isMieuxDisante && (
                            <span className="inline-flex items-center gap-1 text-yellow-600 font-semibold text-xs" data-testid={`badge-mieux-disante-${bid.id}`}>
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              Mieux-disante
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {prixDeReference === null && tenderBids.length > 0 && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 rounded-lg text-sm text-amber-700">
                <span>⚠️</span>
                <p>Aucune offre n'est retenue (toutes excessives ou anormalement basses). Le prix de référence ne peut pas être calculé.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Confirmation suppression */}
      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'offre</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'offre sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
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
