import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { insertTenderSchema, type InsertTender, type Tender } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function TenderForm() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const params = useParams();
  const tenderId = params.id;
  const isEditing = !!tenderId;

  const { data: tender, isLoading } = useQuery<Tender>({
    queryKey: ['/api/tenders', tenderId],
    enabled: isEditing,
  });

  const TENDER_STATUSES = [
    "en cours d'étude",
    "publié",
    "en cours de jugement",
    "attribué",
    "annulé",
  ] as const;

  type TenderStatus = typeof TENDER_STATUSES[number];

  const normalizeStatus = (status: string): TenderStatus => {
    switch (status) {
      case "draft":
        return "en cours d'étude";
      case "published":
        return "publié";
      case "closed":
        return "en cours de jugement";
      case "awarded":
        return "attribué";
      case "cancelled":
        return "annulé";
      default:
        return "en cours d'étude";
    }
  };

  const normalizeProcedureType = (procedureType: string) => {
    switch (procedureType) {
      case "AO ouvert":
        return "Appel d'offres ouvert";
      case "AO restreint":
        return "Appel d'offres restreint";
      case "Négociée compétitive":
        return "Appel d'offres ouvert simplifié";
      case "Concours":
        return "Concours architectural";
      case "Consultation":
        return "Consultation architecturale";
      default:
        return procedureType;
    }
  };

  const form = useForm<InsertTender>({
    resolver: zodResolver(insertTenderSchema),
    defaultValues: {
      reference: "",
      title: "",
      masterAgency: "",
      procedureType: "Appel d'offres ouvert",
      category: "travaux",
      estimatedBudget: "",
      currency: "MAD",
      status: "en cours d'étude",
      publicationDate: undefined,
      submissionDeadline: new Date().toISOString().split('T')[0],
      lotsNumber: undefined,
      provisionalGuaranteeAmount: "",
      openingLocation: "",
      executionLocation: "",
    },
  });

  useEffect(() => {
    if (tender && isEditing) {
      form.reset({
        reference: tender.reference,
        title: tender.title,
        masterAgency: tender.masterAgency,
        procedureType: normalizeProcedureType(tender.procedureType),
        category: tender.category,
        estimatedBudget: tender.estimatedBudget ? String(tender.estimatedBudget) : "",
        currency: tender.currency,
        status: normalizeStatus(tender.status),
        publicationDate: tender.publicationDate ? new Date(tender.publicationDate).toISOString().split('T')[0] : undefined,
        submissionDeadline: new Date(tender.submissionDeadline).toISOString().split('T')[0],
        lotsNumber: tender.lotsNumber ?? undefined,
        provisionalGuaranteeAmount: tender.provisionalGuaranteeAmount ? String(tender.provisionalGuaranteeAmount) : "",
        openingLocation: tender.openingLocation || "",
        executionLocation: tender.executionLocation || "",
      });
    }
  }, [tender, isEditing, form]);

  const createMutation = useMutation({
    mutationFn: (data: InsertTender) => apiRequest('/api/tenders', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenders'] });
      toast({ title: "Succès", description: "L'appel d'offres a été créé." });
      navigate('/tenders');
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: InsertTender) => apiRequest(`/api/tenders/${tenderId}`, 'PATCH', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tenders', tenderId] });
      toast({ title: "Succès", description: "L'appel d'offres a été modifié." });
      navigate('/tenders');
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const sanitizeTenderPayload = (data: InsertTender): InsertTender => {
    const optionalString = (value?: string | null) => {
      if (value === undefined || value === null) {
        return undefined;
      }
      const trimmed = value.toString().trim();
      return trimmed === "" ? undefined : trimmed;
    };

    const cleanedLotsNumber =
      data.lotsNumber !== undefined && data.lotsNumber !== null && !Number.isNaN(data.lotsNumber)
        ? data.lotsNumber
        : undefined;

    return {
      ...data,
      reference: data.reference.trim(),
      title: data.title.trim(),
      masterAgency: data.masterAgency.trim(),
      status: normalizeStatus(data.status),
      procedureType: normalizeProcedureType(data.procedureType),
      estimatedBudget: optionalString(data.estimatedBudget),
      provisionalGuaranteeAmount: optionalString(data.provisionalGuaranteeAmount),
      openingLocation: optionalString(data.openingLocation),
      executionLocation: optionalString(data.executionLocation),
      lotsNumber: cleanedLotsNumber,
      publicationDate:
        typeof data.publicationDate === "string" ? optionalString(data.publicationDate) : data.publicationDate,
    };
  };

  const onSubmit = (data: InsertTender) => {
    const payload = sanitizeTenderPayload(data);
    if (isEditing) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  if (isEditing && isLoading) {
    return <div className="p-6">Chargement...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/tenders')} data-testid="button-back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-3xl font-bold">{isEditing ? "Modifier l'appel d'offres" : "Nouvel appel d'offres"}</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Référence *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-reference" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titre *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lotsNumber"
                render={({ field }) => {
                  const { ref, value, onChange, ...rest } = field;
                  return (
                    <FormItem>
                      <FormLabel>Nombre de lots</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          value={value ?? ''}
                          onChange={(event) => {
                            const inputValue = event.target.value;
                            onChange(inputValue === "" ? undefined : Number(inputValue));
                          }}
                          ref={ref}
                          data-testid="input-lotsNumber"
                          {...rest}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="masterAgency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maître d'ouvrage *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-masterAgency" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estimatedBudget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimation (MAD)</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} data-testid="input-estimatedBudget" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="provisionalGuaranteeAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Montant caution provisoire</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} data-testid="input-provisionalGuaranteeAmount" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="procedureType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mode de Passation *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-procedureType">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Appel d'offres ouvert">Appel d'offres ouvert</SelectItem>
                          <SelectItem value="Appel d'offres ouvert simplifié">Appel d'offres ouvert simplifié</SelectItem>
                          <SelectItem value="Appel d'offres restreint">Appel d'offres restreint</SelectItem>
                          <SelectItem value="Concours architectural">Concours architectural</SelectItem>
                          <SelectItem value="Consultation architecturale">Consultation architecturale</SelectItem>
                          <SelectItem value="Appel à manifestation d'intérêt">Appel à manifestation d'intérêt</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Catégorie *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="travaux">Travaux</SelectItem>
                          <SelectItem value="fournitures">Fournitures</SelectItem>
                          <SelectItem value="services">Services</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Statut *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="en cours d'étude">En cours d'étude</SelectItem>
                          <SelectItem value="publié">Publié</SelectItem>
                          <SelectItem value="en cours de jugement">En cours de jugement</SelectItem>
                          <SelectItem value="attribué">Attribué</SelectItem>
                          <SelectItem value="annulé">Annulé</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="submissionDeadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date limite de soumission *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={typeof field.value === 'string' ? field.value : field.value?.toISOString().split('T')[0] || ''} data-testid="input-submissionDeadline" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="openingLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lieu d'ouverture des plis</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} data-testid="input-openingLocation" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="executionLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lieu d'exécution</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} data-testid="input-executionLocation" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-submit"
            >
              <Save className="w-4 h-4 mr-2" />
              {isEditing ? 'Enregistrer' : 'Créer'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/tenders')} data-testid="button-cancel">
              Annuler
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
