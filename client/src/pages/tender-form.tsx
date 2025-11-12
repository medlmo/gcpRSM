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
import { Textarea } from "@/components/ui/textarea";
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

  const form = useForm<InsertTender>({
    resolver: zodResolver(insertTenderSchema),
    defaultValues: {
      reference: "",
      title: "",
      description: "",
      masterAgency: "",
      procedureType: "AO ouvert",
      category: "travaux",
      estimatedBudget: "0",
      currency: "MAD",
      status: "draft",
      publicationDate: undefined,
      submissionDeadline: new Date().toISOString().split('T')[0],
      openingDate: undefined,
    },
  });

  useEffect(() => {
    if (tender && isEditing) {
      form.reset({
        reference: tender.reference,
        title: tender.title,
        description: tender.description || "",
        masterAgency: tender.masterAgency,
        procedureType: tender.procedureType,
        category: tender.category,
        estimatedBudget: tender.estimatedBudget || "0",
        currency: tender.currency,
        status: tender.status,
        publicationDate: tender.publicationDate ? new Date(tender.publicationDate).toISOString().split('T')[0] : undefined,
        submissionDeadline: new Date(tender.submissionDeadline).toISOString().split('T')[0],
        openingDate: tender.openingDate ? new Date(tender.openingDate).toISOString().split('T')[0] : undefined,
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

  const onSubmit = (data: InsertTender) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ''} data-testid="input-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
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
                      <FormLabel>Budget estimé (MAD)</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} data-testid="input-estimatedBudget" />
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
                      <FormLabel>Type de procédure *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-procedureType">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="AO ouvert">Appel d'offres ouvert</SelectItem>
                          <SelectItem value="AO restreint">Appel d'offres restreint</SelectItem>
                          <SelectItem value="Négociée compétitive">Négociée compétitive</SelectItem>
                          <SelectItem value="Concours">Concours</SelectItem>
                          <SelectItem value="Consultation">Consultation</SelectItem>
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
                          <SelectItem value="draft">Brouillon</SelectItem>
                          <SelectItem value="published">Publié</SelectItem>
                          <SelectItem value="closed">Clôturé</SelectItem>
                          <SelectItem value="awarded">Attribué</SelectItem>
                          <SelectItem value="cancelled">Annulé</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  name="openingDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date d'ouverture des plis</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={typeof field.value === 'string' ? field.value : field.value?.toISOString().split('T')[0] || ''} data-testid="input-openingDate" />
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
