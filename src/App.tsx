import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layouts/AppLayout";
import ProjectList from "./pages/ProjectList";
import ProjectDashboard from "./pages/ProjectDashboard";
import TaskDefinition from "./pages/TaskDefinition";
import Track from "./pages/Track";
import Explore from "./pages/Explore";
import Create from "./pages/Create";
import DesignReview from "./pages/DesignReview";
import DecisionRecord from "./pages/DecisionRecord";
import KnowledgeBase from "./pages/KnowledgeBase";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/projects" replace />} />
          <Route element={<AppLayout />}>
            <Route path="/projects" element={<ProjectList />} />
            <Route path="/projects/:id" element={<ProjectDashboard />} />
            <Route path="/projects/:id/brief" element={<TaskDefinition />} />
            <Route path="/projects/:id/explore" element={<Explore />} />
            <Route path="/projects/:id/track" element={<Track />} />
            <Route path="/projects/:id/create" element={<Create />} />
            <Route path="/projects/:id/review" element={<DesignReview />} />
            <Route path="/projects/:id/decide" element={<DecisionRecord />} />
            <Route path="/knowledge-base" element={<KnowledgeBase />} />
            <Route path="/knowledge-base/:slug" element={<KnowledgeBase />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
