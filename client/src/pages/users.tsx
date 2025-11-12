import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { 
  Plus, 
  Search, 
  Users as UsersIcon,
  Mail,
  Edit,
  Trash2,
  Shield
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { queryClient, apiRequest } from "@/lib/queryClient"
import type { User } from "@shared/schema"

const userFormSchema = z.object({
  fullName: z.string().min(2, "Le nom complet doit contenir au moins 2 caractères"),
  username: z.string().min(3, "Le nom d'utilisateur doit contenir au moins 3 caractères"),
  email: z.string().email("Email invalide"),
  role: z.enum(["admin", "marches_manager", "ordonnateur", "technical_service"]),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères").optional(),
})

type UserFormData = z.infer<typeof userFormSchema>

export default function Users() {
  const [searchQuery, setSearchQuery] = useState("")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const { toast } = useToast()

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  })

  const createForm = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      fullName: "",
      username: "",
      email: "",
      role: "ordonnateur",
      password: "",
    },
  })

  const editForm = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema.extend({
      password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères").optional().or(z.literal("")),
    })),
  })

  const createMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      return apiRequest("POST", "/api/users", data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] })
      setCreateDialogOpen(false)
      createForm.reset()
      toast({
        title: "Utilisateur créé",
        description: "L'utilisateur a été créé avec succès",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer l'utilisateur",
        variant: "destructive",
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<UserFormData> }) => {
      const updateData = { ...data }
      if (!updateData.password || updateData.password === "") {
        delete updateData.password
      }
      return apiRequest("PATCH", `/api/users/${id}`, updateData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] })
      setEditDialogOpen(false)
      setSelectedUser(null)
      toast({
        title: "Utilisateur modifié",
        description: "L'utilisateur a été modifié avec succès",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de modifier l'utilisateur",
        variant: "destructive",
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/users/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] })
      setDeleteDialogOpen(false)
      setSelectedUser(null)
      toast({
        title: "Utilisateur supprimé",
        description: "L'utilisateur a été supprimé avec succès",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer l'utilisateur",
        variant: "destructive",
      })
    },
  })

  const handleCreate = (data: UserFormData) => {
    createMutation.mutate(data)
  }

  const handleEdit = (user: User) => {
    setSelectedUser(user)
    editForm.reset({
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      role: user.role as any,
      password: "",
    })
    setEditDialogOpen(true)
  }

  const handleUpdate = (data: UserFormData) => {
    if (!selectedUser) return
    updateMutation.mutate({ id: selectedUser.id, data })
  }

  const handleDeleteClick = (user: User) => {
    setSelectedUser(user)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (!selectedUser) return
    deleteMutation.mutate(selectedUser.id)
  }

  const getRoleBadge = (role: string) => {
    const config: Record<string, { variant: any; label: string }> = {
      admin: { variant: "default", label: "Administrateur" },
      marches_manager: { variant: "default", label: "Gestionnaire Marchés" },
      ordonnateur: { variant: "outline", label: "Ordonnateur" },
      technical_service: { variant: "secondary", label: "Service Technique" },
    }
    const item = config[role] || { variant: "secondary", label: "Utilisateur" }
    return <Badge variant={item.variant}>{item.label}</Badge>
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const filteredUsers = users?.filter(user => {
    const matchesSearch = 
      user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesSearch
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-medium" data-testid="page-title">
            Utilisateurs
          </h1>
          <p className="text-muted-foreground mt-2">
            Gestion des utilisateurs et des rôles
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-user">
          <Plus className="mr-2 h-4 w-4" />
          Nouvel utilisateur
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, email ou nom d'utilisateur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Card key={i}>
                  <CardHeader className="flex flex-row items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-6 w-24" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : filteredUsers && filteredUsers.length > 0 ? (
            <div className="space-y-4" data-testid="users-list">
              {filteredUsers.map((user) => (
                <Card 
                  key={user.id} 
                  className="hover-elevate"
                  data-testid={`user-card-${user.id}`}
                >
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getInitials(user.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                          <CardTitle className="text-lg">{user.fullName}</CardTitle>
                          {getRoleBadge(user.role)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                          <div className="flex items-center gap-1">
                            <Shield className="h-4 w-4" />
                            <span>{user.username}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            <span>{user.email}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleEdit(user)}
                          data-testid={`button-edit-${user.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDeleteClick(user)}
                          data-testid={`button-delete-${user.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <UsersIcon className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucun utilisateur trouvé</h3>
              <p className="text-sm text-muted-foreground mb-6">
                {searchQuery
                  ? "Essayez de modifier votre recherche"
                  : "Commencez par ajouter des utilisateurs"
                }
              </p>
              {!searchQuery && (
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter un utilisateur
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent data-testid="dialog-create-user">
          <DialogHeader>
            <DialogTitle>Nouvel utilisateur</DialogTitle>
            <DialogDescription>
              Créer un nouveau compte utilisateur pour le système
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom complet</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-fullname" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom d'utilisateur</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-username" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} data-testid="input-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rôle</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-role">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Administrateur</SelectItem>
                        <SelectItem value="marches_manager">Gestionnaire Marchés</SelectItem>
                        <SelectItem value="technical_service">Service Technique</SelectItem>
                        <SelectItem value="ordonnateur">Ordonnateur</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mot de passe</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} data-testid="input-password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                  data-testid="button-cancel-create"
                >
                  Annuler
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending}
                  data-testid="button-submit-create"
                >
                  {createMutation.isPending ? "Création..." : "Créer"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent data-testid="dialog-edit-user">
          <DialogHeader>
            <DialogTitle>Modifier l'utilisateur</DialogTitle>
            <DialogDescription>
              Modifier les informations de l'utilisateur. Laissez le mot de passe vide pour ne pas le changer.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleUpdate)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom complet</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-fullname" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom d'utilisateur</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-username" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} data-testid="input-edit-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rôle</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-role">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Administrateur</SelectItem>
                        <SelectItem value="marches_manager">Gestionnaire Marchés</SelectItem>
                        <SelectItem value="technical_service">Service Technique</SelectItem>
                        <SelectItem value="ordonnateur">Ordonnateur</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nouveau mot de passe (optionnel)</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} data-testid="input-edit-password" placeholder="Laissez vide pour ne pas changer" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                  data-testid="button-cancel-edit"
                >
                  Annuler
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateMutation.isPending}
                  data-testid="button-submit-edit"
                >
                  {updateMutation.isPending ? "Modification..." : "Modifier"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-user">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer l'utilisateur <strong>{selectedUser?.fullName}</strong> ? 
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
