import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Search, 
  ClipboardCheck,
  FileText,
  Plus,
  Calendar,
  Eye,
  DollarSign
} from "lucide-react"
import { Link } from "wouter"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { ServiceOrder, Amendment, Invoice } from "@shared/schema"

export default function Execution() {
  const [searchQuery, setSearchQuery] = useState("")

  const { data: serviceOrders, isLoading: loadingOrders } = useQuery<ServiceOrder[]>({
    queryKey: ["/api/service-orders"],
  })

  const { data: amendments, isLoading: loadingAmendments } = useQuery<Amendment[]>({
    queryKey: ["/api/amendments"],
  })

  const { data: invoices, isLoading: loadingInvoices } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  })

  const getOrderTypeBadge = (type: string) => {
    const config: Record<string, { variant: any; label: string }> = {
      start: { variant: "default", label: "Démarrage" },
      suspension: { variant: "destructive", label: "Suspension" },
      resumption: { variant: "default", label: "Reprise" },
      modification: { variant: "outline", label: "Modification" },
    }
    const item = config[type] || config.start
    return <Badge variant={item.variant}>{item.label}</Badge>
  }

  const getAmendmentTypeBadge = (type: string) => {
    const config: Record<string, { variant: any; label: string }> = {
      delay_extension: { variant: "outline", label: "Prolongation délai" },
      price_revision: { variant: "default", label: "Révision prix" },
      scope_change: { variant: "secondary", label: "Modification objet" },
    }
    const item = config[type] || config.delay_extension
    return <Badge variant={item.variant}>{item.label}</Badge>
  }

  const getInvoiceStatusBadge = (status: string) => {
    const config: Record<string, { variant: any; label: string }> = {
      draft: { variant: "secondary", label: "Brouillon" },
      submitted: { variant: "outline", label: "Soumis" },
      approved: { variant: "default", label: "Approuvé" },
      paid: { variant: "default", label: "Payé" },
      rejected: { variant: "destructive", label: "Rejeté" },
    }
    const item = config[status] || config.draft
    return <Badge variant={item.variant}>{item.label}</Badge>
  }

  const getInvoiceTypeBadge = (type: string) => {
    const config: Record<string, { label: string }> = {
      advance: { label: "Avance" },
      provisional: { label: "Provisoire" },
      final: { label: "Définitif" },
    }
    return config[type]?.label || type
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-medium" data-testid="page-title">
            Exécution des marchés
          </h1>
          <p className="text-muted-foreground mt-2">
            Gestion des ordres de service, avenants et décomptes
          </p>
        </div>
      </div>

      <Tabs defaultValue="service-orders" className="space-y-6">
        <TabsList>
          <TabsTrigger value="service-orders" data-testid="tab-service-orders">
            Ordres de service
          </TabsTrigger>
          <TabsTrigger value="amendments" data-testid="tab-amendments">
            Avenants
          </TabsTrigger>
          <TabsTrigger value="invoices" data-testid="tab-invoices">
            Décomptes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="service-orders" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="relative flex-1 mr-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un ordre de service..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-orders"
                />
              </div>
              <Button data-testid="button-create-order">
                <Plus className="mr-2 h-4 w-4" />
                Nouvel ordre
              </Button>
            </CardHeader>
            <CardContent>
              {loadingOrders ? (
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              ) : serviceOrders && serviceOrders.length > 0 ? (
                <div className="space-y-4" data-testid="service-orders-list">
                  {serviceOrders.map((order) => (
                    <Card key={order.id} className="hover-elevate" data-testid={`order-${order.id}`}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <CardTitle className="text-base">{order.orderNumber}</CardTitle>
                              {getOrderTypeBadge(order.orderType)}
                            </div>
                            <p className="text-sm text-muted-foreground">{order.description}</p>
                          </div>
                          <Button variant="ghost" size="icon" data-testid={`button-view-order-${order.id}`}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-6 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>Date: {new Date(order.orderDate).toLocaleDateString('fr-FR')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>Effet: {new Date(order.effectiveDate).toLocaleDateString('fr-FR')}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <ClipboardCheck className="h-16 w-16 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Aucun ordre de service</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Commencez par créer votre premier ordre de service
                  </p>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Créer un ordre
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="amendments" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="relative flex-1 mr-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un avenant..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-amendments"
                />
              </div>
              <Button data-testid="button-create-amendment">
                <Plus className="mr-2 h-4 w-4" />
                Nouvel avenant
              </Button>
            </CardHeader>
            <CardContent>
              {loadingAmendments ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              ) : amendments && amendments.length > 0 ? (
                <div className="space-y-4" data-testid="amendments-list">
                  {amendments.map((amendment) => (
                    <Card key={amendment.id} className="hover-elevate" data-testid={`amendment-${amendment.id}`}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <CardTitle className="text-base">{amendment.amendmentNumber}</CardTitle>
                              {getAmendmentTypeBadge(amendment.amendmentType)}
                            </div>
                            <p className="text-sm text-muted-foreground">{amendment.description}</p>
                          </div>
                          <Button variant="ghost" size="icon" data-testid={`button-view-amendment-${amendment.id}`}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-6 text-sm flex-wrap">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>Date: {new Date(amendment.amendmentDate).toLocaleDateString('fr-FR')}</span>
                          </div>
                          {amendment.amountAdjustment && Number(amendment.amountAdjustment) !== 0 && (
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              <span className={Number(amendment.amountAdjustment) > 0 ? "text-green-600" : "text-red-600"}>
                                Ajustement: {Number(amendment.amountAdjustment) > 0 ? "+" : ""}
                                {Number(amendment.amountAdjustment).toLocaleString('fr-FR')}
                              </span>
                            </div>
                          )}
                          {amendment.delayExtension && Number(amendment.delayExtension) > 0 && (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>Prolongation: {amendment.delayExtension} jours</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Aucun avenant</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Les avenants aux marchés apparaîtront ici
                  </p>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Créer un avenant
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="relative flex-1 mr-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un décompte..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-invoices"
                />
              </div>
              <Button data-testid="button-create-invoice">
                <Plus className="mr-2 h-4 w-4" />
                Nouveau décompte
              </Button>
            </CardHeader>
            <CardContent>
              {loadingInvoices ? (
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              ) : invoices && invoices.length > 0 ? (
                <div className="space-y-4" data-testid="invoices-list">
                  {invoices.map((invoice) => (
                    <Card key={invoice.id} className="hover-elevate" data-testid={`invoice-${invoice.id}`}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <CardTitle className="text-base">{invoice.invoiceNumber}</CardTitle>
                              {getInvoiceStatusBadge(invoice.status)}
                              <Badge variant="outline">{getInvoiceTypeBadge(invoice.invoiceType)}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {invoice.workDescription || "Décompte"}
                            </p>
                          </div>
                          <Button variant="ghost" size="icon" data-testid={`button-view-invoice-${invoice.id}`}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Montant brut</p>
                            <p className="font-medium">{Number(invoice.grossAmount).toLocaleString('fr-FR')}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Retenue</p>
                            <p className="font-medium text-red-600">
                              -{Number(invoice.retentionAmount).toLocaleString('fr-FR')}
                            </p>
                          </div>
                          {invoice.penaltiesAmount && Number(invoice.penaltiesAmount) > 0 && (
                            <div>
                              <p className="text-muted-foreground">Pénalités</p>
                              <p className="font-medium text-red-600">
                                -{Number(invoice.penaltiesAmount).toLocaleString('fr-FR')}
                              </p>
                            </div>
                          )}
                          <div>
                            <p className="text-muted-foreground">Net à payer</p>
                            <p className="font-bold text-primary">
                              {Number(invoice.netAmount).toLocaleString('fr-FR')}
                            </p>
                          </div>
                        </div>
                        {invoice.progressPercentage && (
                          <div className="mt-4 pt-4 border-t">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Avancement</span>
                              <span className="font-medium">{invoice.progressPercentage}%</span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <DollarSign className="h-16 w-16 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Aucun décompte</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Les décomptes de paiement apparaîtront ici
                  </p>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Créer un décompte
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
