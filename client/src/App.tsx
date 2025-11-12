import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Tenders from "@/pages/tenders";
import TenderForm from "@/pages/tender-form";
import Suppliers from "@/pages/suppliers";
import SupplierForm from "@/pages/supplier-form";
import Bids from "@/pages/bids";
import Contracts from "@/pages/contracts";
import Execution from "@/pages/execution";
import Reports from "@/pages/reports";
import Users from "@/pages/users";
import Settings from "@/pages/settings";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/tenders" component={Tenders} />
      <Route path="/tenders/new" component={TenderForm} />
      <Route path="/tenders/:id/edit" component={TenderForm} />
      <Route path="/suppliers" component={Suppliers} />
      <Route path="/suppliers/new" component={SupplierForm} />
      <Route path="/suppliers/:id/edit" component={SupplierForm} />
      <Route path="/bids" component={Bids} />
      <Route path="/contracts" component={Contracts} />
      <Route path="/execution" component={Execution} />
      <Route path="/reports" component={Reports} />
      <Route path="/users" component={Users} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1 overflow-hidden">
                <header className="flex items-center justify-between h-16 px-6 border-b bg-background shrink-0">
                  <div className="flex items-center gap-4">
                    <SidebarTrigger data-testid="button-sidebar-toggle" />
                    <h2 className="text-lg font-medium">Système de Gestion des Marchés Publics</h2>
                  </div>
                  <ThemeToggle />
                </header>
                <main className="flex-1 overflow-auto p-6 md:p-8">
                  <Router />
                </main>
              </div>
            </div>
          </SidebarProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
