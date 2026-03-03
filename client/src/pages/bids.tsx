import { useState, useMemo } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  FolderKanban,
  DollarSign,
  Award,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Plus,
  Trash2,
  Calculator,
  Star,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { Bid, Tender, Supplier } from "@shared/schema"
import { insertBidSchema } from "@shared/schema"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"

type BidWithEval = Bid & {
  amount: number
  isExcessive: boolean
  isAbnormallyLow: boolean
  isRetained: boolean
  rank: number | null
  isMieuxDisante: boolean
  ecartEstimation: number
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
    const ecartEstimation = ((amount - estimatedBudget) / estimatedBudget) * 100
    return { ...bid, amount, isExcessive, isAbnormallyLow, isRetained, rank: null, isMieuxDisante: false, ecartEstimation }
  })

  const retained = classified.filter((b) => b.isRetained)

  let prixDeReference: number | null = null
  if (retained.length > 0) {
    const avgRetained = retained.reduce((s, b) => s + b.amount, 0) / retained.length
    prixDeReference = (estimatedBudget + avgRetained) / 2
  }

  if (prixDeReference !== null) {
    const pr = prixDeReference
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

const bidFormSchema = insertBidSchema.extend({
  proposedAmount: z.string().min(1, "Montant proposé requis"),
  finalAmount: z.string().min(1, "Montant final requis"),
  discount: z.string().optional(),
  deliveryTime: z.coerce.number().int().min(0).optional().nullable(),
})
type BidFormData = z.infer<typeof bidFormSchema>

export default function Bids() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTenderId, setSelectedTenderId] = useState<string>("all")
  const [expandedTenders, setExpandedTenders] = useState<Set<string>>(new Set())
  const [addBidTenderId, setAddBidTenderId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { toast } = useToast()

  const { data: bids, isLoading: bidsLoading } = useQuery<Bid[]>({ queryKey: ["/api/bids"] })
  const { data: tenders } = useQuery<Tender[]>({ queryKey: ["/api/tenders"] })
  const { data: suppliers } = useQuery<Supplier[]>({ queryKey: ["/api/suppliers"] })

  const form = useForm<BidFormData>({
    resolver: zodResolver(bidFormSchema),
    defaultValues: {
      tenderId: "",
      supplierId: "",
      proposedAmount: "",
      finalAmount: "",
      discount: "",
      deliveryTime: undefined,
      currency: "MAD",
      status: "submitted",
    },
  })

  const createBidMutation = useMutation({
    mutationFn: (data: BidFormData) => apiRequest("/api/bids", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bids"] })
      toast({ title: "Succès", description: "L'offre a été enregistrée." })
      setAddBidTenderId(null)
      form.reset()
    },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/bids/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bids"] })
      toast({ title: "Succès", description: "L'offre a été supprimée." })
      setDeleteId(null)
    },
    onError: (e: Error) => {
      toast({ title: "Erreur", description: e.message, variant: "destructive" })
      setDeleteId(null)
    },
  })

  const onSubmitBid = (data: BidFormData) => {
    createBidMutation.mutate({ ...data, tenderId: addBidTenderId! })
  }

  const getSupplierName = (supplierId: string) =>
    suppliers?.find((s) => s.id === supplierId)?.name ?? supplierId.slice(0, 8)

  const toggleExpand = (id: string) => {
    setExpandedTenders((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const tendersWithBids = useMemo(() => {
    if (!tenders || !bids) return []
    return tenders
      .filter((t) => {
        const hasBids = bids.some((b) => b.tenderId === t.id)
        const matchesSearch =
          t.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.title.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesTender = selectedTenderId === "all" || t.id === selectedTenderId
        return hasBids && matchesSearch && matchesTender
      })
      .map((tender) => {
        const tenderBids = bids.filter((b) => b.tenderId === tender.id)
        const estimation = Number(tender.estimatedBudget) || 0
        const { evaluated, prixDeReference, retainedCount } = evaluateBids(
          tender.category,
          estimation,
          tenderBids
        )
        return { tender, evaluated, prixDeReference, retainedCount, estimation }
      })
  }, [tenders, bids, searchQuery, selectedTenderId])

  const getClassificationBadge = (bid: BidWithEval) => {
    if (bid.isExcessive)
      return <Badge variant="outline" className="border-orange-400 text-orange-600 gap-1"><TrendingUp className="h-3 w-3" />Excessive</Badge>
    if (bid.isAbnormallyLow)
      return <Badge variant="outline" className="border-red-400 text-red-600 gap-1"><TrendingDown className="h-3 w-3" />Anorm. basse</Badge>
    return <Badge variant="outline" className="border-green-500 text-green-700 gap-1"><CheckCircle className="h-3 w-3" />Retenue</Badge>
  }

  const formatAmount = (v: number, currency = "MAD") =>
    `${v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`

  const formatPct = (v: number) => {
    const sign = v >= 0 ? "+" : ""
    return `${sign}${v.toFixed(2)}%`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-medium" data-testid="page-title">Offres soumises</h1>
          <p className="text-muted-foreground mt-1">Évaluation des offres et calcul du prix de référence</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par référence ou titre d'AO..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <Select value={selectedTenderId} onValueChange={setSelectedTenderId}>
              <SelectTrigger className="w-64" data-testid="select-tender">
                <SelectValue placeholder="Tous les AO" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les AO</SelectItem>
                {tenders?.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.reference} — {t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {bidsLoading ? (
            <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
          ) : tendersWithBids.length > 0 ? (
            <div className="space-y-6" data-testid="bids-evaluation-list">
              {tendersWithBids.map(({ tender, evaluated, prixDeReference, retainedCount, estimation }) => {
                const isExpanded = expandedTenders.has(tender.id)
                const mieuxDisante = evaluated.find((b) => b.isMieuxDisante)
                const lowerPct = tender.category === "travaux" ? 20 : 25
                const upperPct = 20

                return (
                  <Card key={tender.id} className="border-2" data-testid={`tender-group-${tender.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Badge variant="secondary" className="font-mono text-xs">{tender.reference}</Badge>
                            <Badge variant="outline" className="text-xs capitalize">{tender.category}</Badge>
                          </div>
                          <CardTitle className="text-base mt-1">{tender.title}</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setAddBidTenderId(tender.id)
                              form.reset({
                                tenderId: tender.id,
                                supplierId: "",
                                proposedAmount: "",
                                finalAmount: "",
                                discount: "",
                                deliveryTime: undefined,
                                currency: tender.currency,
                                status: "submitted",
                              })
                            }}
                            data-testid={`button-add-bid-${tender.id}`}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Ajouter offre
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleExpand(tender.id)}
                            data-testid={`button-toggle-${tender.id}`}
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground mb-0.5">Estimation maître d'ouvrage</p>
                          <p className="font-semibold text-sm" data-testid={`text-estimation-${tender.id}`}>
                            {estimation > 0 ? formatAmount(estimation, tender.currency) : "—"}
                          </p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                            <Calculator className="h-3 w-3" /> Prix de référence
                          </p>
                          <p className="font-semibold text-sm text-primary" data-testid={`text-prix-reference-${tender.id}`}>
                            {prixDeReference !== null ? formatAmount(prixDeReference, tender.currency) : "—"}
                          </p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground mb-0.5">Offres reçues / retenues</p>
                          <p className="font-semibold text-sm" data-testid={`text-counts-${tender.id}`}>
                            {evaluated.length} / <span className="text-green-600">{retainedCount}</span>
                          </p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /> Mieux-disante
                          </p>
                          <p className="font-semibold text-sm truncate" data-testid={`text-mieux-disante-${tender.id}`}>
                            {mieuxDisante ? getSupplierName(mieuxDisante.supplierId) : "—"}
                          </p>
                        </div>
                      </div>

                      {estimation > 0 && (
                        <div className="mt-2 text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded p-2 flex flex-wrap gap-x-4 gap-y-1">
                          <span>Seuil excessif : &gt; {formatAmount(estimation * (1 + upperPct / 100), tender.currency)} (+{upperPct}%)</span>
                          <span>Seuil anorm. bas : &lt; {formatAmount(estimation * (1 - lowerPct / 100), tender.currency)} (-{lowerPct}%)</span>
                        </div>
                      )}
                    </CardHeader>

                    {isExpanded && (
                      <CardContent className="pt-0">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <tr className="border-b bg-muted/30">
                                <th className="text-left p-3 font-medium text-muted-foreground w-12">Rang</th>
                                <th className="text-left p-3 font-medium text-muted-foreground">Concurrent</th>
                                <th className="text-right p-3 font-medium text-muted-foreground">Offre financière</th>
                                <th className="text-right p-3 font-medium text-muted-foreground">Écart / Estim.</th>
                                <th className="text-center p-3 font-medium text-muted-foreground">Qualification</th>
                                <th className="text-center p-3 font-medium text-muted-foreground">Mieux-disante</th>
                                <th className="w-10"></th>
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
                                        ? "bg-yellow-50 dark:bg-yellow-950/20 font-medium"
                                        : bid.isRetained
                                        ? "bg-green-50/50 dark:bg-green-950/10"
                                        : "bg-red-50/30 dark:bg-red-950/10 opacity-75"
                                    }`}
                                    data-testid={`bid-row-${bid.id}`}
                                  >
                                    <td className="p-3">
                                      {bid.rank !== null ? (
                                        <span className={`font-bold ${bid.rank === 1 ? "text-yellow-600" : "text-muted-foreground"}`}>
                                          #{bid.rank}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground">—</span>
                                      )}
                                    </td>
                                    <td className="p-3">
                                      <span data-testid={`text-supplier-${bid.id}`}>{getSupplierName(bid.supplierId)}</span>
                                    </td>
                                    <td className="p-3 text-right font-mono" data-testid={`text-amount-${bid.id}`}>
                                      {formatAmount(bid.amount, bid.currency)}
                                    </td>
                                    <td className={`p-3 text-right font-mono text-xs ${
                                      bid.ecartEstimation > 0 ? "text-orange-600" : bid.ecartEstimation < 0 ? "text-blue-600" : "text-muted-foreground"
                                    }`} data-testid={`text-ecart-${bid.id}`}>
                                      {estimation > 0 ? formatPct(bid.ecartEstimation) : "—"}
                                    </td>
                                    <td className="p-3 text-center">
                                      {getClassificationBadge(bid)}
                                    </td>
                                    <td className="p-3 text-center">
                                      {bid.isMieuxDisante && (
                                        <span className="inline-flex items-center gap-1 text-yellow-600 font-semibold text-xs" data-testid={`badge-mieux-disante-${bid.id}`}>
                                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                          Mieux-disante
                                        </span>
                                      )}
                                    </td>
                                    <td className="p-3">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-destructive/70 hover:text-destructive"
                                        onClick={() => setDeleteId(bid.id)}
                                        data-testid={`button-delete-${bid.id}`}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>

                        {prixDeReference !== null && (
                          <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm">
                            <p className="font-medium text-primary mb-1 flex items-center gap-2">
                              <Calculator className="h-4 w-4" />
                              Détail du calcul du prix de référence
                            </p>
                            <p className="text-muted-foreground text-xs">
                              Prix de référence = (Estimation + Moyenne des offres retenues) ÷ 2
                              {estimation > 0 && retainedCount > 0 && (() => {
                                const retained = evaluated.filter(b => b.isRetained)
                                const avg = retained.reduce((s, b) => s + b.amount, 0) / retained.length
                                return ` = (${formatAmount(estimation, tender.currency)} + ${formatAmount(avg, tender.currency)}) ÷ 2 = ${formatAmount(prixDeReference, tender.currency)}`
                              })()}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FolderKanban className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucune offre trouvée</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery || selectedTenderId !== "all"
                  ? "Essayez de modifier vos filtres"
                  : "Les offres soumises apparaîtront ici. Sélectionnez un AO et ajoutez des offres."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Bid Dialog */}
      <Dialog open={Boolean(addBidTenderId)} onOpenChange={(open) => !open && setAddBidTenderId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ajouter une offre</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitBid)} className="space-y-4">
              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Concurrent *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-supplier">
                          <SelectValue placeholder="Sélectionner un concurrent" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {suppliers?.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="proposedAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Montant proposé *</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" placeholder="0.00" {...field} data-testid="input-proposed-amount" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="finalAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Offre financière * <span className="text-xs text-muted-foreground">(retenue)</span></FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" placeholder="0.00" {...field} data-testid="input-final-amount" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="discount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Remise (%)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" max="100" step="0.01" placeholder="0" {...field} value={field.value ?? ""} data-testid="input-discount" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="deliveryTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Délai (jours)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="Ex: 90"
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                          data-testid="input-delivery-time"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAddBidTenderId(null)}>Annuler</Button>
                <Button type="submit" disabled={createBidMutation.isPending} data-testid="button-submit-bid">
                  {createBidMutation.isPending ? "Enregistrement..." : "Enregistrer l'offre"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
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
