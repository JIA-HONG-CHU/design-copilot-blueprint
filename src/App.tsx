import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layouts/AppLayout";
import ProjectList from "./pages/ProjectList";
import ProjectDashboard from "./pages/ProjectDashboard";
import TaskDefinition from "./pages/TaskDefinition";
import AssumptionLedger from "./pages/AssumptionLedger";
import ContradictionIdentification from "./pages/ContradictionIdentification";
import SolutionExplorer from "./pages/SolutionExplorer";
import PreCadReview from "./pages/PreCadReview";
import DesignReview from "./pages/DesignReview";
import DecisionRecord from "./pages/DecisionRecord";
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
            <Route path="/projects/:id/task-definition" element={<TaskDefinition />} />
            <Route path="/projects/:id/assumption-ledger" element={<AssumptionLedger />} />
            <Route path="/projects/:id/contradiction-identification" element={<ContradictionIdentification />} />
            <Route path="/projects/:id/solution-explorer" element={<SolutionExplorer />} />
            <Route path="/projects/:id/pre-cad-review" element={<PreCadReview />} />
            <Route path="/projects/:id/design-review" element={<DesignReview />} />
            <Route path="/projects/:id/decision-record" element={<DecisionRecord />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
