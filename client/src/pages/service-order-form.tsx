import { useLocation } from "wouter";
import { ArrowLeft, Construction } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ServiceOrderForm() {
  const [, navigate] = useLocation();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate('/execution')}
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-3xl font-bold">Nouvel ordre de service</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fonctionnalité en cours de développement</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Construction className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">Page en construction</h3>
          <p className="text-sm text-muted-foreground text-center mb-6">
            Le formulaire de création d'ordre de service sera bientôt disponible.
          </p>
          <Button onClick={() => navigate('/execution')} data-testid="button-back-to-execution">
            Retour à l'exécution
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
