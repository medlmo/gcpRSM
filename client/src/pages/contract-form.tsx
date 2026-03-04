import { useEffect } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useLocation, useParams } from "wouter"
import { z } from "zod"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Save } from "lucide-react"
import { Link } from "wouter"
import { insertContractSchema, type InsertContract, type Contract, type Tender, type Supplier } from "@shared/schema"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"

const contractFormSchema = insertContractSchema.extend({
  tenderId: z.string().optional().nullable(),
  supplierId: z.string().min(1, "Le fournisseur titulaire est requis"),
  contractAmount: z.string().min(1, "Montant HT requis"),
  contractNumber: z.string().min(1, "Le numéro du marché est requis"),
  status: z.string().min(1, "Le statut est requis"),
})

type ContractFormData = z.infer<typeof contractFormSchema>

function formatDateInput(value: string | Date | null | undefined): string {
  if (!value) return ""
  const d = new Date(value as string)
  if (isNaN(d.getTime())) return ""
  return d.toISOString().split("T")[0]
}

export default function ContractForm() {
  const [, navigate] = useLocation()
  const params = useParams<{ id: string }>()
  const contractId = params?.id
  const isEditing = Boolean(contractId)
  const { toast } = useToast()

  const { data: tenders, isLoading: tendersLoading } = useQuery<Tender[]>({
    queryKey: ["/api/tenders"],
  })

  const { data: suppliers, isLoading: suppliersLoading } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  })

  const { data: contract, isLoading: contractLoading } = useQuery<Contract>({
    queryKey: ["/api/contracts", contractId],
    enabled: isEditing,
  })

  const form = useForm<ContractFormData>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      contractNumber: "",
      title: "",
      tenderId: "",
      supplierId: "",
      contractAmount: "",
      vatAmount: "",
      totalAmount: "",
      currency: "MAD",
      executionDelay: undefined,
      guaranteeDelay: undefined,
      visaDate: "",
      startDate: "",
      guaranteeAmount: "",
      contractType: null,
      status: "signed",
    },
  })

  useEffect(() => {
    if (contract && isEditing) {
      form.reset({
        contractNumber: contract.contractNumber,
        title: contract.title,
        tenderId: contract.tenderId,
        supplierId: contract.supplierId,
        contractAmount: contract.contractAmount ? String(contract.contractAmount) : "",
        vatAmount: contract.vatAmount ? String(contract.vatAmount) : "",
        totalAmount: contract.totalAmount ? String(contract.totalAmount) : "",
        currency: contract.currency,
        executionDelay: contract.executionDelay ?? undefined,
        guaranteeDelay: contract.guaranteeDelay ?? undefined,
        visaDate: formatDateInput(contract.visaDate),
        startDate: formatDateInput(contract.startDate),
        guaranteeAmount: contract.guaranteeAmount ? String(contract.guaranteeAmount) : "",
        contractType: (contract.contractType as any) ?? null,
        status: contract.status ?? "signed",
      })
    }
  }, [contract, isEditing, form])

  const watchedHT = useWatch({ control: form.control, name: "contractAmount" })
  const watchedTVA = useWatch({ control: form.control, name: "vatAmount" })

  useEffect(() => {
    const ht = parseFloat(watchedHT as string) || 0
    const tva = parseFloat(watchedTVA as string) || 0
    if (ht > 0 || tva > 0) {
      const ttc = (ht + tva).toFixed(2)
      form.setValue("totalAmount", ttc, { shouldValidate: false })
    }
  }, [watchedHT, watchedTVA, form])

  const createMutation = useMutation({
    mutationFn: (data: ContractFormData) => apiRequest("/api/contracts", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] })
      toast({ title: "Succès", description: "Le marché a été créé." })
      navigate("/contracts")
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: ContractFormData) =>
      apiRequest(`/api/contracts/${contractId}`, "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] })
      queryClient.invalidateQueries({ queryKey: ["/api/contracts", contractId] })
      toast({ title: "Succès", description: "Le marché a été modifié." })
      navigate("/contracts")
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" })
    },
  })

  const onSubmit = (data: ContractFormData) => {
    const payload = {
      ...data,
      vatAmount: data.vatAmount && data.vatAmount !== "" ? data.vatAmount : null,
      totalAmount: data.totalAmount && data.totalAmount !== "" ? data.totalAmount : null,
      guaranteeAmount: data.guaranteeAmount && data.guaranteeAmount !== "" ? data.guaranteeAmount : null,
      visaDate: data.visaDate && data.visaDate !== "" ? data.visaDate : null,
      startDate: data.startDate && data.startDate !== "" ? data.startDate : null,
      executionDelay: data.executionDelay ?? null,
      guaranteeDelay: data.guaranteeDelay ?? null,
    }
    if (isEditing) {
      updateMutation.mutate(payload as ContractFormData)
    } else {
      createMutation.mutate(payload as ContractFormData)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  if (isEditing && contractLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card><CardContent className="pt-6 space-y-4">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</CardContent></Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/contracts">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-medium" data-testid="page-title">
            {isEditing ? "Modifier le marché" : "Nouveau marché"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEditing ? "Mettre à jour les informations du marché" : "Enregistrer un nouveau marché"}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="contractNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numéro du marché *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: M-2026-001" {...field} data-testid="input-contract-number" />
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
                    <FormLabel>Objet du marché *</FormLabel>
                    <FormControl>
                      <Input placeholder="Objet du marché" {...field} data-testid="input-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tenderId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Référence AO <span className="text-muted-foreground text-xs">(optionnel)</span></FormLabel>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={(v) => field.onChange(v === "__none__" ? null : v)}
                      disabled={tendersLoading}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-tender">
                          <SelectValue placeholder={tendersLoading ? "Chargement..." : "Aucun AO lié"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">— Aucun AO lié —</SelectItem>
                        {tenders?.map((tender) => (
                          <SelectItem key={tender.id} value={tender.id}>
                            {tender.reference} — {tender.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prestataire *</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={suppliersLoading}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-supplier">
                          <SelectValue placeholder={suppliersLoading ? "Chargement..." : "Sélectionner un prestataire"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {suppliers?.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contractType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de marché</FormLabel>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={(v) => field.onChange(v === "" ? null : v)}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-contract-type">
                          <SelectValue placeholder="Sélectionner un type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="marché unique">Marché unique</SelectItem>
                        <SelectItem value="marché reconductible">Marché reconductible</SelectItem>
                        <SelectItem value="marché cadre">Marché cadre</SelectItem>
                        <SelectItem value="marché négocié">Marché négocié</SelectItem>
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
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-contract-status">
                          <SelectValue placeholder="Sélectionner un statut" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="signed">Signé</SelectItem>
                        <SelectItem value="in_progress">En cours d'exécution</SelectItem>
                        <SelectItem value="suspended">Suspendu</SelectItem>
                        <SelectItem value="completed">Achevé</SelectItem>
                        <SelectItem value="terminated">Résilié</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Devise</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-currency">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="MAD">MAD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Montants</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="contractAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant HT *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        data-testid="input-contract-amount"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vatAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant TVA</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        value={field.value ?? ""}
                        data-testid="input-vat-amount"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="totalAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant TTC <span className="text-xs text-muted-foreground">(calculé)</span></FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        readOnly
                        tabIndex={-1}
                        placeholder="0.00"
                        value={field.value ?? ""}
                        className="bg-muted cursor-not-allowed font-medium"
                        data-testid="input-total-amount"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="guaranteeAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant caution définitive</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        value={field.value ?? ""}
                        data-testid="input-guarantee-amount"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Délais et dates</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="executionDelay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Délai d'exécution (jours)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="Ex: 180"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value === "" ? undefined : Number(e.target.value))
                        }
                        data-testid="input-execution-delay"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="guaranteeDelay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Délai de garantie (mois)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="Ex: 12"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value === "" ? undefined : Number(e.target.value))
                        }
                        data-testid="input-guarantee-delay"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="visaDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date Visa</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={formatDateInput(field.value as string | Date | null | undefined)}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        data-testid="input-visa-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de commencement</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={formatDateInput(field.value as string | Date | null | undefined)}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        data-testid="input-start-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-end">
            <Link href="/contracts">
              <Button variant="outline" type="button" data-testid="button-cancel">
                Annuler
              </Button>
            </Link>
            <Button type="submit" disabled={isPending} data-testid="button-submit">
              <Save className="h-4 w-4 mr-2" />
              {isPending ? "Enregistrement..." : isEditing ? "Modifier" : "Créer le marché"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
