import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AdminAuthProvider } from "@/hooks/useAdminAuth";
import Index from "./pages/Index";
import AvatarsManagement from "./pages/AvatarsManagement";
import AvatarDetails from "./pages/AvatarDetails";
import AvatarSettings from "./pages/AvatarSettings";
import AvatarSessions from "./pages/AvatarSessions";
import CreateAvatar from "./pages/CreateAvatar";
import ConfigureCredentials from "./pages/ConfigureCredentials";
import EuvatarPublic from "./pages/EuvatarPublic";
import ClientPortal from "./pages/ClientPortal";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminClientDetails from "./pages/AdminClientDetails";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/avatars" element={<AvatarsManagement />} />
            <Route path="/configure-credentials" element={<ConfigureCredentials />} />
            <Route path="/create-avatar" element={<CreateAvatar />} />
            <Route path="/avatar/:id" element={<AvatarDetails />} />
            <Route path="/avatar/:id/settings" element={<AvatarSettings />} />
            <Route path="/avatar/:id/sessions" element={<AvatarSessions />} />
            <Route path="/euvatar/:id" element={<EuvatarPublic />} />
            <Route
              path="/admin"
              element={
                <AdminAuthProvider>
                  <AdminLogin />
                </AdminAuthProvider>
              }
            />
            <Route
              path="/login"
              element={
                <AdminAuthProvider>
                  <AdminLogin />
                </AdminAuthProvider>
              }
            />
            <Route
              path="/admin/dashboard"
              element={
                <AdminAuthProvider>
                  <AdminDashboard />
                </AdminAuthProvider>
              }
            />
            <Route
              path="/admin/client/:clientId"
              element={
                <AdminAuthProvider>
                  <AdminClientDetails />
                </AdminAuthProvider>
              }
            />
            {/* Public client routes - must be last to avoid conflicts */}
            <Route path="/:orgSlug" element={<ClientPortal />} />
            <Route path="/:orgSlug/:avatarSlug" element={<ClientPortal />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
