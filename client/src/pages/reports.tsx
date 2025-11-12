import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  FileBarChart,
  Download,
  FileText,
  BarChart3,
  PieChart,
  Calendar,
  DollarSign
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

export default function Reports() {
  const [reportType, setReportType] = useState<string>("")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [format, setFormat] = useState<string>("pdf")

  const reportTypes = [
    {
      id: "tenders-summary",
      title: "Synthèse des appels d'offres",
      description: "État complet des appels d'offres par période",
      icon: FileText,
      color: "text-chart-1"
    },
    {
      id: "contracts-analysis",
      title: "Analyse des marchés",
      description: "Statistiques et indicateurs clés des marchés",
      icon: BarChart3,
      color: "text-chart-2"
    },
    {
      id: "budget-tracking",
      title: "Suivi budgétaire",
      description: "Analyse budgétaire et consommation",
      icon: DollarSign,
      color: "text-chart-4"
    },
    {
      id: "suppliers-performance",
      title: "Performance des fournisseurs",
      description: "Évaluation et statistiques fournisseurs",
      icon: PieChart,
      color: "text-chart-3"
    },
    {
      id: "execution-status",
      title: "État d'exécution",
      description: "Suivi détaillé de l'exécution des marchés",
      icon: BarChart3,
      color: "text-chart-5"
    },
  ]

  const handleGenerateReport = () => {
    console.log("Generating report:", { reportType, startDate, endDate, format })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-medium" data-testid="page-title">
            Rapports et analyses
          </h1>
          <p className="text-muted-foreground mt-2">
            Génération de rapports personnalisés
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Types de rapports disponibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="report-types">
              {reportTypes.map((report) => {
                const Icon = report.icon
                const isSelected = reportType === report.id
                
                return (
                  <Card 
                    key={report.id}
                    className={`cursor-pointer hover-elevate ${
                      isSelected ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => setReportType(report.id)}
                    data-testid={`report-type-${report.id}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-accent rounded-md">
                          <Icon className={`h-5 w-5 ${report.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base mb-1">
                            {report.title}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground">
                            {report.description}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Paramètres du rapport</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Type de rapport</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger data-testid="select-report-type">
                  <SelectValue placeholder="Sélectionner un rapport" />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map((report) => (
                    <SelectItem key={report.id} value={report.id}>
                      {report.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start-date">Date de début</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-10"
                  data-testid="input-start-date"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">Date de fin</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pl-10"
                  data-testid="input-end-date"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Format d'export</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger data-testid="select-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel (XLSX)</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4 space-y-2">
              <Button 
                className="w-full" 
                disabled={!reportType || !startDate || !endDate}
                onClick={handleGenerateReport}
                data-testid="button-generate-report"
              >
                <Download className="mr-2 h-4 w-4" />
                Générer le rapport
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Le rapport sera téléchargé au format {format.toUpperCase()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rapports prédéfinis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="hover-elevate cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base">Rapport mensuel</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Synthèse complète du mois en cours
                </p>
                <Button variant="outline" size="sm" className="w-full" data-testid="button-monthly-report">
                  <Download className="mr-2 h-4 w-4" />
                  Télécharger
                </Button>
              </CardContent>
            </Card>

            <Card className="hover-elevate cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base">Rapport annuel</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Bilan annuel détaillé
                </p>
                <Button variant="outline" size="sm" className="w-full" data-testid="button-annual-report">
                  <Download className="mr-2 h-4 w-4" />
                  Télécharger
                </Button>
              </CardContent>
            </Card>

            <Card className="hover-elevate cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base">Rapport budgétaire</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  État détaillé du budget
                </p>
                <Button variant="outline" size="sm" className="w-full" data-testid="button-budget-report">
                  <Download className="mr-2 h-4 w-4" />
                  Télécharger
                </Button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
