import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Tenders from "@/pages/tenders";
import TenderForm from "@/pages/tender-form";
import TenderDetail from "@/pages/tender-detail";
import Suppliers from "@/pages/suppliers";
import SupplierForm from "@/pages/supplier-form";
import SupplierDetail from "@/pages/supplier-detail";
import Bids from "@/pages/bids";
import Contracts from "@/pages/contracts";
import Execution from "@/pages/execution";
import ServiceOrderForm from "@/pages/service-order-form";
import AmendmentForm from "@/pages/amendment-form";
import InvoiceForm from "@/pages/invoice-form";
import Reports from "@/pages/reports";
import Users from "@/pages/users";
import Settings from "@/pages/settings";
import LoginPage from "@/pages/login";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/tenders">
        {() => <ProtectedRoute component={Tenders} />}
      </Route>
      <Route path="/tenders/new">
        {() => <ProtectedRoute component={TenderForm} />}
      </Route>
      <Route path="/tenders/:id/edit">
        {() => <ProtectedRoute component={TenderForm} />}
      </Route>
      <Route path="/tenders/:id">
        {() => <ProtectedRoute component={TenderDetail} />}
      </Route>
      <Route path="/suppliers">
        {() => <ProtectedRoute component={Suppliers} />}
      </Route>
      <Route path="/suppliers/new">
        {() => <ProtectedRoute component={SupplierForm} />}
      </Route>
      <Route path="/suppliers/:id/edit">
        {() => <ProtectedRoute component={SupplierForm} />}
      </Route>
      <Route path="/suppliers/:id">
        {() => <ProtectedRoute component={SupplierDetail} />}
      </Route>
      <Route path="/bids">
        {() => <ProtectedRoute component={Bids} />}
      </Route>
      <Route path="/contracts">
        {() => <ProtectedRoute component={Contracts} />}
      </Route>
      <Route path="/execution">
        {() => <ProtectedRoute component={Execution} />}
      </Route>
      <Route path="/execution/service-orders/new">
        {() => <ProtectedRoute component={ServiceOrderForm} />}
      </Route>
      <Route path="/execution/amendments/new">
        {() => <ProtectedRoute component={AmendmentForm} />}
      </Route>
      <Route path="/execution/invoices/new">
        {() => <ProtectedRoute component={InvoiceForm} />}
      </Route>
      <Route path="/reports">
        {() => <ProtectedRoute component={Reports} />}
      </Route>
      <Route path="/users">
        {() => <ProtectedRoute component={Users} />}
      </Route>
      <Route path="/settings">
        {() => <ProtectedRoute component={Settings} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
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
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AuthenticatedApp() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <AppLayout>
        <Router />
      </AppLayout>
    );
  }

  return <Router />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <AuthenticatedApp />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
