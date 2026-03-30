import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Save, Upload, FileArchive, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  insertTenderSchema,
  type InsertTender,
  type Tender,
} from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

const pad = (value: number) => String(value).padStart(2, "0");

const formatDateInput = (value?: string | Date) => {
  if (!value) return undefined;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return undefined;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const formatDateTimeLocalInput = (value?: string | Date) => {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const toISOStringIfPossible = (value?: string | Date | null) => {
  if (!value) {
    return undefined;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toISOString();
};

export default function TenderForm() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const params = useParams();
  const tenderId = params.id;
  const isEditing = !!tenderId;

  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [docOriginalName, setDocOriginalName] = useState<string | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: tender, isLoading } = useQuery<Tender>({
    queryKey: ["/api/tenders", tenderId],
    enabled: isEditing,
  });

  const TENDER_STATUSES = [
    "en cours d'étude",
    "publié",
    "en cours de jugement",
    "attribué",
    "annulé",
  ] as const;

  type TenderStatus = (typeof TENDER_STATUSES)[number];

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
        if ((TENDER_STATUSES as readonly string[]).includes(status)) {
          return status as TenderStatus;
        }
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
      procedureType: "Appel d'offres ouvert",
      category: "travaux",
      estimatedBudget: "",
      currency: "MAD",
      status: "en cours d'étude",
      publicationDate: undefined,
      submissionDeadline: formatDateTimeLocalInput(new Date()),
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
        procedureType: normalizeProcedureType(tender.procedureType),
        category: tender.category,
        estimatedBudget: tender.estimatedBudget
          ? String(tender.estimatedBudget)
          : "",
        currency: tender.currency,
        status: normalizeStatus(tender.status),
        publicationDate: formatDateInput(tender.publicationDate ?? undefined),
        submissionDeadline: formatDateTimeLocalInput(tender.submissionDeadline),
        lotsNumber: tender.lotsNumber ?? undefined,
        provisionalGuaranteeAmount: tender.provisionalGuaranteeAmount
          ? String(tender.provisionalGuaranteeAmount)
          : "",
        openingLocation: tender.openingLocation || "",
        executionLocation: tender.executionLocation || "",
      });
      if (tender.documentUrl) {
        setDocumentUrl(tender.documentUrl);
        const parts = tender.documentUrl.split("/");
        setDocOriginalName(parts[parts.length - 1]);
      }
    }
  }, [tender, isEditing, form]);

  const createMutation = useMutation({
    mutationFn: (data: InsertTender) =>
      apiRequest("/api/tenders", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenders"] });
      toast({ title: "Succès", description: "L'appel d'offres a été créé." });
      navigate("/tenders");
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
    mutationFn: (data: InsertTender) =>
      apiRequest(`/api/tenders/${tenderId}`, "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenders", tenderId] });
      toast({
        title: "Succès",
        description: "L'appel d'offres a été modifié.",
      });
      navigate("/tenders");
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
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
      data.lotsNumber !== undefined &&
      data.lotsNumber !== null &&
      !Number.isNaN(data.lotsNumber)
        ? data.lotsNumber
        : undefined;

    return {
      ...data,
      reference: data.reference.trim(),
      title: data.title.trim(),
      status: normalizeStatus(data.status),
      procedureType: normalizeProcedureType(data.procedureType),
      submissionDeadline: toISOStringIfPossible(data.submissionDeadline) ?? new Date().toISOString(),
      estimatedBudget: optionalString(data.estimatedBudget),
      provisionalGuaranteeAmount: optionalString(
        data.provisionalGuaranteeAmount,
      ),
      openingLocation: optionalString(data.openingLocation),
      executionLocation: optionalString(data.executionLocation),
      lotsNumber: cleanedLotsNumber,
      publicationDate:
        typeof data.publicationDate === "string"
          ? optionalString(data.publicationDate)
          : data.publicationDate,
    };
  };

  const handleFileUpload = async (file: File) => {
    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload/dossier", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur lors de l'upload");
      }
      const data = await res.json();
      setDocumentUrl(data.url);
      setDocOriginalName(file.name);
      toast({ title: "Fichier joint", description: file.name });
    } catch (e: any) {
      toast({ title: "Erreur upload", description: e.message, variant: "destructive" });
    } finally {
      setUploadLoading(false);
    }
  };

  const onSubmit = (data: InsertTender) => {
    const payload = { ...sanitizeTenderPayload(data), documentUrl: documentUrl ?? undefined };
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
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate("/tenders")}
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-3xl font-bold">
          {isEditing ? "Modifier l'appel d'offres" : "Nouvel appel d'offres"}
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
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Référence *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        placeholder="Ex : 01/2025"
                        data-testid="input-reference"
                      />
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                            value={value ?? ""}
                            onChange={(event) => {
                              const inputValue = event.target.value;
                              onChange(
                                inputValue === ""
                                  ? undefined
                                  : Number(inputValue),
                              );
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

                <FormField
                  control={form.control}
                  name="estimatedBudget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimation (MAD)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          data-testid="input-estimatedBudget"
                        />
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
                      <FormLabel>Montant caution provisoire (MAD)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          data-testid="input-provisionalGuaranteeAmount"
                        />
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
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-procedureType">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Appel d'offres ouvert">
                            Appel d'offres ouvert
                          </SelectItem>
                          <SelectItem value="Appel d'offres ouvert simplifié">
                            Appel d'offres ouvert simplifié
                          </SelectItem>
                          <SelectItem value="Appel d'offres restreint">
                            Appel d'offres restreint
                          </SelectItem>
                          <SelectItem value="Concours architectural">
                            Concours architectural
                          </SelectItem>
                          <SelectItem value="Consultation architecturale">
                            Consultation architecturale
                          </SelectItem>
                          <SelectItem value="Appel à manifestation d'intérêt">
                            Appel à manifestation d'intérêt
                          </SelectItem>
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
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="travaux">Travaux</SelectItem>
                          <SelectItem value="fournitures">
                            Fournitures
                          </SelectItem>
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
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="en cours d'étude">
                            En cours d'étude
                          </SelectItem>
                          <SelectItem value="publié">Publié</SelectItem>
                          <SelectItem value="en cours de jugement">
                            En cours de jugement
                          </SelectItem>
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
                      <FormLabel>
                        Date et heure limite de soumission *
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                          value={
                            typeof field.value === "string"
                              ? field.value
                              : formatDateTimeLocalInput(field.value)
                          }
                          onChange={(event) =>
                            field.onChange(event.target.value)
                          }
                          data-testid="input-submissionDeadline"
                        />
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
                        <Input
                          {...field}
                          value={field.value || ""}
                          data-testid="input-openingLocation"
                        />
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
                        <Input
                          {...field}
                          value={field.value || ""}
                          data-testid="input-executionLocation"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dossier d'appel d'offres</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip,.rar"
                className="hidden"
                data-testid="input-dossier-file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                  e.target.value = "";
                }}
              />
              {documentUrl ? (
                <div className="flex items-center gap-3 p-3 rounded-md border bg-muted/50">
                  <FileArchive className="h-5 w-5 text-muted-foreground shrink-0" />
                  <a
                    href={documentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium flex-1 truncate hover:underline text-primary"
                    data-testid="link-dossier"
                  >
                    {docOriginalName || documentUrl.split("/").pop()}
                  </a>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    data-testid="button-remove-dossier"
                    onClick={() => { setDocumentUrl(null); setDocOriginalName(null); }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploadLoading}
                  data-testid="button-upload-dossier"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadLoading ? "Téléversement en cours..." : "Joindre le dossier (.zip ou .rar)"}
                </Button>
              )}
              <p className="text-xs text-muted-foreground mt-2">Formats acceptés : .zip, .rar — Taille maximale : 100 Mo</p>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-submit"
            >
              <Save className="w-4 h-4 mr-2" />
              {isEditing ? "Enregistrer" : "Créer"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/tenders")}
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
