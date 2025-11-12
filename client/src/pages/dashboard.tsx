import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  TrendingUp, 
  FileText, 
  Users, 
  Briefcase,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Link } from "wouter"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDistanceToNow } from "date-fns"
import { fr } from "date-fns/locale"

interface DashboardStats {
  totalTenders: number
  activeTenders: number
  totalContracts: number
  activeContracts: number
  totalSuppliers: number
  totalBudget: number
  upcomingDeadlines: Array<{
    id: string
    reference: string
    title: string
    deadline: string
    type: "tender" | "payment" | "contract"
  }>
  recentActivity: Array<{
    id: string
    action: string
    entityType: string
    entityName: string
    timestamp: string
  }>
}

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  })

  const kpiCards = [
    {
      title: "Appels d'offres actifs",
      value: stats?.activeTenders ?? 0,
      total: stats?.totalTenders ?? 0,
      icon: FileText,
      color: "text-chart-1",
      bgColor: "bg-chart-1/10",
      testId: "stat-active-tenders"
    },
    {
      title: "Marchés en cours",
      value: stats?.activeContracts ?? 0,
      total: stats?.totalContracts ?? 0,
      icon: Briefcase,
      color: "text-chart-3",
      bgColor: "bg-chart-3/10",
      testId: "stat-active-contracts"
    },
    {
      title: "Fournisseurs",
      value: stats?.totalSuppliers ?? 0,
      icon: Users,
      color: "text-chart-4",
      bgColor: "bg-chart-4/10",
      testId: "stat-suppliers"
    },
    {
      title: "Budget total",
      value: stats?.totalBudget 
        ? `${(stats.totalBudget / 1000000).toFixed(1)}M MAD` 
        : "0 MAD",
      icon: TrendingUp,
      color: "text-chart-2",
      bgColor: "bg-chart-2/10",
      testId: "stat-budget"
    },
  ]

  const getDeadlineIcon = (type: string) => {
    switch (type) {
      case "tender": return FileText
      case "payment": return TrendingUp
      case "contract": return Briefcase
      default: return Calendar
    }
  }

  const getDeadlineBadge = (deadline: string) => {
    const daysUntil = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (daysUntil < 0) return <Badge variant="destructive">Expiré</Badge>
    if (daysUntil <= 3) return <Badge variant="destructive">Urgent</Badge>
    if (daysUntil <= 7) return <Badge className="bg-orange-500 hover:bg-orange-600">Proche</Badge>
    return <Badge variant="secondary">{daysUntil}j restants</Badge>
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-medium text-foreground" data-testid="page-title">
          Tableau de bord
        </h1>
        <p className="text-muted-foreground mt-2">
          Vue d'ensemble de la gestion des marchés publics
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          kpiCards.map((kpi, index) => {
            const Icon = kpi.icon
            return (
              <Card key={index} data-testid={kpi.testId}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {kpi.title}
                  </CardTitle>
                  <div className={`p-2 rounded-md ${kpi.bgColor}`}>
                    <Icon className={`h-4 w-4 ${kpi.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid={`${kpi.testId}-value`}>
                    {kpi.value}
                  </div>
                  {kpi.total && (
                    <p className="text-xs text-muted-foreground mt-1">
                      sur {kpi.total} au total
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              Échéances à venir
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-md" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))}
              </div>
            ) : stats?.upcomingDeadlines && stats.upcomingDeadlines.length > 0 ? (
              <div className="space-y-4" data-testid="upcoming-deadlines">
                {stats.upcomingDeadlines.map((deadline) => {
                  const Icon = getDeadlineIcon(deadline.type)
                  return (
                    <div
                      key={deadline.id}
                      className="flex items-center gap-4 p-3 rounded-md hover-elevate"
                      data-testid={`deadline-${deadline.id}`}
                    >
                      <div className="p-2 bg-accent rounded-md">
                        <Icon className="h-5 w-5 text-accent-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {deadline.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {deadline.reference}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getDeadlineBadge(deadline.deadline)}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-sm text-muted-foreground">
                  Aucune échéance à venir
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
              Activité récente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                ))}
              </div>
            ) : stats?.recentActivity && stats.recentActivity.length > 0 ? (
              <div className="space-y-4" data-testid="recent-activity">
                {stats.recentActivity.map((activity) => (
                  <div key={activity.id} className="border-l-2 border-primary pl-3 py-1">
                    <p className="text-sm">
                      <span className="font-medium">{activity.action}</span>
                      {" - "}
                      <span className="text-muted-foreground">{activity.entityName}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.timestamp), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-sm text-muted-foreground">
                  Aucune activité récente
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <Link href="/tenders">
          <Button data-testid="button-view-tenders">
            <FileText className="mr-2 h-4 w-4" />
            Gérer les appels d'offres
          </Button>
        </Link>
        <Link href="/contracts">
          <Button variant="outline" data-testid="button-view-contracts">
            <Briefcase className="mr-2 h-4 w-4" />
            Voir les marchés
          </Button>
        </Link>
      </div>
    </div>
  )
}
