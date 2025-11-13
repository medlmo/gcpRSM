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
import { insertSupplierSchema, type InsertSupplier, type Supplier } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function SupplierForm() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const params = useParams();
  const supplierId = params.id;
  const isEditing = !!supplierId;

  const { data: supplier, isLoading } = useQuery<Supplier>({
    queryKey: ['/api/suppliers', supplierId],
    enabled: isEditing,
  });

  const form = useForm<InsertSupplier>({
    resolver: zodResolver(insertSupplierSchema),
    defaultValues: {
      name: "",
      registrationNumber: "",
      taxId: "",
      address: "",
      city: "",
      phone: "",
      email: "",
      contactPerson: "",
      category: "travaux",
      status: "active",
    },
  });

  useEffect(() => {
    if (supplier && isEditing) {
      form.reset({
        name: supplier.name,
        registrationNumber: supplier.registrationNumber,
        taxId: supplier.taxId || "",
        address: supplier.address || "",
        city: supplier.city || "",
        phone: supplier.phone || "",
        email: supplier.email || "",
        contactPerson: supplier.contactPerson || "",
        category: supplier.category || "travaux",
        status: supplier.status,
      });
    }
  }, [supplier, isEditing, form]);

  const createMutation = useMutation({
    mutationFn: (data: InsertSupplier) => apiRequest('/api/suppliers', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      toast({
        title: "Succès",
        description: "Le fournisseur a été créé avec succès.",
      });
      navigate('/suppliers');
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: InsertSupplier) => apiRequest(`/api/suppliers/${supplierId}`, 'PATCH', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers', supplierId] });
      toast({
        title: "Succès",
        description: "Le fournisseur a été modifié avec succès.",
      });
      navigate('/suppliers');
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sanitizeSupplierPayload = (data: InsertSupplier): InsertSupplier => ({
    ...data,
    registrationNumber: data.registrationNumber?.trim()
      ? data.registrationNumber.trim()
      : undefined,
    taxId: data.taxId?.trim() ? data.taxId.trim() : undefined,
    address: data.address?.trim() ? data.address.trim() : undefined,
    city: data.city?.trim() ? data.city.trim() : undefined,
    phone: data.phone?.trim() ? data.phone.trim() : undefined,
    email: data.email?.trim() ? data.email.trim() : undefined,
    contactPerson: data.contactPerson?.trim() ? data.contactPerson.trim() : undefined,
  });

  const onSubmit = (data: InsertSupplier) => {
    const payload = sanitizeSupplierPayload(data);
    if (isEditing) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  if (isEditing && isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-10 bg-muted animate-pulse rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate('/suppliers')}
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-3xl font-bold">
          {isEditing ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
        </h1>
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
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du fournisseur *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="registrationNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ICE</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-registrationNumber" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

                <FormField
                  control={form.control}
                  name="taxId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IF</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} data-testid="input-taxId" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Catégorie</FormLabel>
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
                          <SelectItem value="etudes">Études</SelectItem>
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
                      <FormLabel>Statut</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Actif</SelectItem>
                          <SelectItem value="inactive">Inactif</SelectItem>
                          <SelectItem value="blacklisted">Liste noire</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Coordonnées</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} data-testid="input-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ville</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} data-testid="input-city" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Téléphone</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} data-testid="input-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} value={field.value || ''} data-testid="input-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactPerson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Personne de contact</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} data-testid="input-contactPerson" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/suppliers')}
              data-testid="button-cancel"
            >
              Annuler
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
