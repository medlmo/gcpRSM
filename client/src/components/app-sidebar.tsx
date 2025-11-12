import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Briefcase, 
  ClipboardCheck,
  FileBarChart,
  Settings,
  Building2,
  FolderKanban
} from "lucide-react"
import { Link, useLocation } from "wouter"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar"

const menuItems = [
  {
    title: "Tableau de bord",
    url: "/",
    icon: LayoutDashboard,
    testId: "nav-dashboard"
  },
  {
    title: "Appels d'offres",
    url: "/tenders",
    icon: FileText,
    testId: "nav-tenders"
  },
  {
    title: "Fournisseurs",
    url: "/suppliers",
    icon: Building2,
    testId: "nav-suppliers"
  },
  {
    title: "Offres",
    url: "/bids",
    icon: FolderKanban,
    testId: "nav-bids"
  },
  {
    title: "Marchés",
    url: "/contracts",
    icon: Briefcase,
    testId: "nav-contracts"
  },
  {
    title: "Exécution",
    url: "/execution",
    icon: ClipboardCheck,
    testId: "nav-execution"
  },
  {
    title: "Rapports",
    url: "/reports",
    icon: FileBarChart,
    testId: "nav-reports"
  },
]

const adminItems = [
  {
    title: "Utilisateurs",
    url: "/users",
    icon: Users,
    testId: "nav-users"
  },
  {
    title: "Paramètres",
    url: "/settings",
    icon: Settings,
    testId: "nav-settings"
  },
]

export function AppSidebar() {
  const [location] = useLocation()

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-primary flex items-center justify-center">
            <FileText className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-medium">Marchés Publics</span>
            <span className="text-xs text-muted-foreground">Administration</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={item.testId}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup>
          <SidebarGroupLabel>Administration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={item.testId}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
