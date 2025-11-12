import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { 
  Settings as SettingsIcon,
  Bell,
  Download,
  Database,
  Mail,
  Shield,
  Globe
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-medium" data-testid="page-title">
          Paramètres
        </h1>
        <p className="text-muted-foreground mt-2">
          Configuration du système
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>
              Configurer les alertes et notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notifications email</Label>
                <p className="text-sm text-muted-foreground">
                  Recevoir les alertes par email
                </p>
              </div>
              <Switch defaultChecked data-testid="switch-email-notifications" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Alertes échéances</Label>
                <p className="text-sm text-muted-foreground">
                  Notification avant les dates limites
                </p>
              </div>
              <Switch defaultChecked data-testid="switch-deadline-alerts" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Alertes paiements</Label>
                <p className="text-sm text-muted-foreground">
                  Notification des échéances de paiement
                </p>
              </div>
              <Switch defaultChecked data-testid="switch-payment-alerts" />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="notification-days">Jours avant échéance</Label>
              <Input 
                id="notification-days"
                type="number" 
                defaultValue="7" 
                min="1"
                data-testid="input-notification-days"
              />
              <p className="text-xs text-muted-foreground">
                Nombre de jours avant l'échéance pour envoyer une alerte
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Import automatique</CardTitle>
            </div>
            <CardDescription>
              Configuration de l'import depuis marchespublics.gov.ma
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Import automatique</Label>
                <p className="text-sm text-muted-foreground">
                  Activer l'import planifié
                </p>
              </div>
              <Switch defaultChecked data-testid="switch-auto-import" />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="import-frequency">Fréquence</Label>
              <Select defaultValue="daily">
                <SelectTrigger id="import-frequency" data-testid="select-import-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Toutes les heures</SelectItem>
                  <SelectItem value="daily">Quotidien</SelectItem>
                  <SelectItem value="weekly">Hebdomadaire</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="import-time">Heure d'exécution</Label>
              <Input 
                id="import-time"
                type="time" 
                defaultValue="03:00"
                data-testid="input-import-time"
              />
            </div>
            <Separator />
            <Button variant="outline" className="w-full" data-testid="button-test-import">
              Tester l'import maintenant
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Configuration email</CardTitle>
            </div>
            <CardDescription>
              Paramètres du serveur email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="smtp-server">Serveur SMTP</Label>
              <Input 
                id="smtp-server"
                type="text" 
                placeholder="smtp.exemple.ma"
                data-testid="input-smtp-server"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-port">Port</Label>
              <Input 
                id="smtp-port"
                type="number" 
                defaultValue="587"
                data-testid="input-smtp-port"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-email">Email expéditeur</Label>
              <Input 
                id="smtp-email"
                type="email" 
                placeholder="marches@administration.gov.ma"
                data-testid="input-smtp-email"
              />
            </div>
            <Button variant="outline" className="w-full" data-testid="button-test-email">
              Tester la configuration
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Base de données</CardTitle>
            </div>
            <CardDescription>
              Gestion et maintenance de la base de données
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Sauvegarde automatique</Label>
                <p className="text-sm text-muted-foreground">
                  Sauvegarde quotidienne de la base
                </p>
              </div>
              <Switch defaultChecked data-testid="switch-auto-backup" />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Dernière sauvegarde</Label>
              <p className="text-sm text-muted-foreground">
                Il y a 12 heures
              </p>
            </div>
            <Separator />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" data-testid="button-backup-now">
                Sauvegarder maintenant
              </Button>
              <Button variant="outline" className="flex-1" data-testid="button-restore">
                Restaurer
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Langue et région</CardTitle>
            </div>
            <CardDescription>
              Paramètres de localisation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="language">Langue</Label>
              <Select defaultValue="fr">
                <SelectTrigger id="language" data-testid="select-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="ar">العربية</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Fuseau horaire</Label>
              <Select defaultValue="africa-casablanca">
                <SelectTrigger id="timezone" data-testid="select-timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="africa-casablanca">Africa/Casablanca (GMT+1)</SelectItem>
                  <SelectItem value="utc">UTC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Devise</Label>
              <Select defaultValue="mad">
                <SelectTrigger id="currency" data-testid="select-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mad">MAD (Dirham marocain)</SelectItem>
                  <SelectItem value="eur">EUR (Euro)</SelectItem>
                  <SelectItem value="usd">USD (Dollar américain)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Sécurité</CardTitle>
            </div>
            <CardDescription>
              Paramètres de sécurité et accès
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Authentification à deux facteurs</Label>
                <p className="text-sm text-muted-foreground">
                  Renforcer la sécurité des comptes
                </p>
              </div>
              <Switch data-testid="switch-2fa" />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="session-timeout">Délai d'expiration de session</Label>
              <Select defaultValue="60">
                <SelectTrigger id="session-timeout" data-testid="select-session-timeout">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 heure</SelectItem>
                  <SelectItem value="120">2 heures</SelectItem>
                  <SelectItem value="480">8 heures</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <Button variant="outline" className="w-full" data-testid="button-view-logs">
              Voir les journaux d'activité
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-4">
        <Button variant="outline" data-testid="button-cancel-settings">
          Annuler
        </Button>
        <Button data-testid="button-save-settings">
          Enregistrer les paramètres
        </Button>
      </div>
    </div>
  )
}
