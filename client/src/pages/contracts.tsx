import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Search, 
  Briefcase,
  Calendar,
  DollarSign,
  Building2,
  Eye,
  FileText,
  AlertCircle,
  TrendingUp
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
import { Progress } from "@/components/ui/progress"
import type { Contract } from "@shared/schema"

export default function Contracts() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const { data: contracts, isLoading } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
  })

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

  const calculateProgress = (contract: Contract) => {
    if (!contract.startDate || !contract.plannedEndDate) return 0
    
    const start = new Date(contract.startDate).getTime()
    const end = new Date(contract.actualEndDate || contract.plannedEndDate).getTime()
    const now = Date.now()
    
    const total = end - start
    const elapsed = now - start
    
    return Math.min(Math.max((elapsed / total) * 100, 0), 100)
  }

  const filteredContracts = contracts?.filter(contract => {
    const matchesSearch = 
      contract.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.contractNumber.toLowerCase().includes(searchQuery.toLowerCase())
    
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
            Suivi des marchés attribués et en cours d'exécution
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par numéro ou titre de marché..."
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
                  <CardContent>
                    <div className="space-y-3">
                      <Skeleton className="h-2 w-full" />
                      <div className="flex gap-6">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredContracts && filteredContracts.length > 0 ? (
            <div className="space-y-4" data-testid="contracts-list">
              {filteredContracts.map((contract) => {
                const progress = calculateProgress(contract)
                const hasDelay = contract.executionDelay && Number(contract.executionDelay) > 0
                const hasPenalties = contract.accumulatedPenalties && Number(contract.accumulatedPenalties) > 0
                
                return (
                  <Card 
                    key={contract.id} 
                    className="hover-elevate"
                    data-testid={`contract-card-${contract.id}`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <CardTitle className="text-lg">
                              {contract.title}
                            </CardTitle>
                            {getStatusBadge(contract.status)}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="font-medium">{contract.contractNumber}</span>
                          </div>
                        </div>
                        <Link href={`/contracts/${contract.id}`}>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            data-testid={`button-view-${contract.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Progression</span>
                          <span className="font-medium">{progress.toFixed(0)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-muted-foreground">Montant</p>
                            <p className="font-medium">
                              {Number(contract.contractAmount).toLocaleString('fr-FR')} {contract.currency}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-muted-foreground">Date de signature</p>
                            <p className="font-medium">
                              {new Date(contract.signatureDate).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-muted-foreground">Fin prévue</p>
                            <p className="font-medium">
                              {new Date(contract.plannedEndDate).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                        </div>
                      </div>

                      {(hasDelay || hasPenalties) && (
                        <div className="flex gap-2 pt-2 border-t">
                          {hasDelay && (
                            <Badge variant="outline" className="text-orange-600">
                              <AlertCircle className="mr-1 h-3 w-3" />
                              Retard: {contract.executionDelay}j
                            </Badge>
                          )}
                          {hasPenalties && (
                            <Badge variant="destructive">
                              <TrendingUp className="mr-1 h-3 w-3" />
                              Pénalités: {Number(contract.accumulatedPenalties).toLocaleString('fr-FR')} {contract.currency}
                            </Badge>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Briefcase className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucun marché trouvé</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery || statusFilter !== "all"
                  ? "Essayez de modifier vos filtres de recherche"
                  : "Les marchés apparaîtront ici après attribution des appels d'offres"
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
