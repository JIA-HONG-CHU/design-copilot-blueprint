import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ArtifactProvider } from "@/contexts/ArtifactContext";
import PreCadReview from "./pages/PreCadReview";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layouts/AppLayout";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Settings from "./pages/Settings";
import ProjectList from "./pages/ProjectList";
import ProjectDashboard from "./pages/ProjectDashboard";
import TaskDefinition from "./pages/TaskDefinition";
import Track from "./pages/Track";
import Explore from "./pages/Explore";
import Create from "./pages/Create";
import CadInProgress from "./pages/CadInProgress";
import DesignReview from "./pages/DesignReview";
import DecisionRecord from "./pages/DecisionRecord";
import Feynman from "./pages/Feynman";
import KnowledgeBase from "./pages/KnowledgeBase";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <ArtifactProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/" element={<Navigate to="/projects" replace />} />
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/projects" element={<ProjectList />} />
                <Route path="/projects/:id" element={<ProjectDashboard />} />
                <Route path="/projects/:id/brief" element={<TaskDefinition />} />
                <Route path="/projects/:id/explore" element={<Explore />} />
                <Route path="/projects/:id/track" element={<Track />} />
                <Route path="/projects/:id/create" element={<Create />} />
                <Route path="/projects/:id/pre-cad" element={<PreCadReview />} />
                <Route path="/projects/:id/cad" element={<CadInProgress />} />
                <Route path="/projects/:id/review" element={<DesignReview />} />
                <Route path="/projects/:id/decide" element={<DecisionRecord />} />
                <Route path="/projects/:id/feynman" element={<Feynman />} />
                <Route path="/knowledge-base" element={<KnowledgeBase />} />
                <Route path="/knowledge-base/:slug" element={<KnowledgeBase />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          </ArtifactProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
