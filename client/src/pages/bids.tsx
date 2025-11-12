import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Search, 
  FolderKanban,
  DollarSign,
  Star,
  Eye,
  Award,
  AlertCircle
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
import type { Bid } from "@shared/schema"

export default function Bids() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const { data: bids, isLoading } = useQuery<Bid[]>({
    queryKey: ["/api/bids"],
  })

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; label: string }> = {
      submitted: { variant: "secondary", label: "Soumise" },
      under_review: { variant: "outline", label: "En évaluation" },
      qualified: { variant: "default", label: "Qualifiée" },
      disqualified: { variant: "destructive", label: "Disqualifiée" },
      awarded: { variant: "default", label: "Retenue" },
      rejected: { variant: "destructive", label: "Rejetée" },
    }
    const config = statusConfig[status] || statusConfig.submitted
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const filteredBids = bids?.filter(bid => {
    const matchesSearch = 
      bid.tenderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bid.supplierId.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || bid.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-medium" data-testid="page-title">
            Offres soumises
          </h1>
          <p className="text-muted-foreground mt-2">
            Évaluation et comparaison des offres
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher des offres..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40" data-testid="select-status">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="submitted">Soumise</SelectItem>
                <SelectItem value="under_review">En évaluation</SelectItem>
                <SelectItem value="qualified">Qualifiée</SelectItem>
                <SelectItem value="disqualified">Disqualifiée</SelectItem>
                <SelectItem value="awarded">Retenue</SelectItem>
                <SelectItem value="rejected">Rejetée</SelectItem>
              </SelectContent>
            </Select>
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
                      <Skeleton className="h-6 w-24" />
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : filteredBids && filteredBids.length > 0 ? (
            <div className="space-y-4" data-testid="bids-list">
              {filteredBids.map((bid) => {
                const hasScores = bid.technicalScore || bid.financialScore || bid.totalScore
                
                return (
                  <Card 
                    key={bid.id} 
                    className="hover-elevate"
                    data-testid={`bid-card-${bid.id}`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <CardTitle className="text-lg">
                              Offre - AO #{bid.tenderId.slice(0, 8)}
                            </CardTitle>
                            {getStatusBadge(bid.status)}
                            {bid.rank === 1 && (
                              <Badge variant="default" className="gap-1">
                                <Award className="h-3 w-3" />
                                1er rang
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>Fournisseur: {bid.supplierId.slice(0, 8)}</span>
                            <span>•</span>
                            <span>
                              Soumise le {new Date(bid.submissionDate).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                        </div>
                        <Link href={`/bids/${bid.id}`}>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            data-testid={`button-view-${bid.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-muted-foreground">Montant proposé</p>
                            <p className="font-medium">
                              {Number(bid.proposedAmount).toLocaleString('fr-FR')} {bid.currency}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-muted-foreground">Montant final</p>
                            <p className="font-medium">
                              {Number(bid.finalAmount).toLocaleString('fr-FR')} {bid.currency}
                            </p>
                            {bid.discount && Number(bid.discount) > 0 && (
                              <p className="text-xs text-green-600">
                                Remise: {bid.discount}%
                              </p>
                            )}
                          </div>
                        </div>
                        {bid.deliveryTime && (
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-muted-foreground">Délai de livraison</p>
                              <p className="font-medium">{bid.deliveryTime} jours</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {hasScores && (
                        <div className="pt-4 border-t">
                          <div className="grid grid-cols-3 gap-4 text-center">
                            {bid.technicalScore && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Score technique</p>
                                <div className="flex items-center justify-center gap-1">
                                  <Star className="h-4 w-4 text-yellow-500" />
                                  <span className="font-bold">{bid.technicalScore}</span>
                                </div>
                              </div>
                            )}
                            {bid.financialScore && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Score financier</p>
                                <div className="flex items-center justify-center gap-1">
                                  <Star className="h-4 w-4 text-green-500" />
                                  <span className="font-bold">{bid.financialScore}</span>
                                </div>
                              </div>
                            )}
                            {bid.totalScore && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Score total</p>
                                <div className="flex items-center justify-center gap-1">
                                  <Star className="h-4 w-4 text-blue-500" />
                                  <span className="font-bold text-lg">{bid.totalScore}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {bid.disqualificationReason && (
                        <div className="pt-4 border-t">
                          <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-md">
                            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-destructive">Raison de disqualification</p>
                              <p className="text-sm text-muted-foreground mt-1">{bid.disqualificationReason}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FolderKanban className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucune offre trouvée</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery || statusFilter !== "all"
                  ? "Essayez de modifier vos filtres de recherche"
                  : "Les offres soumises apparaîtront ici"
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
