import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import ErrorBoundary from "@/components/ErrorBoundary";
import { AccessProvider } from "@/contexts/AccessContext";

// Eager load critical routes
import Home from "./pages/Home";
import Access from "./pages/Access";
import AccessBeginner from "./pages/AccessBeginner";
import AccessPro from "./pages/AccessPro";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

// Lazy load optional pages
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));

// Lazy load admin routes
import AdminLayout from "./components/AdminLayout";
import { ProtectedAdminRoute } from "./components/ProtectedAdminRoute";
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const FreeContentList = lazy(() => import("./pages/admin/FreeContentList"));
const FreeContentForm = lazy(() => import("./pages/admin/FreeContentForm"));
const CoursesList = lazy(() => import("./pages/admin/CoursesList"));
const CoursesForm = lazy(() => import("./pages/admin/CoursesForm"));
const UsersManagement = lazy(() => import("./pages/admin/UsersManagement"));
const Settings = lazy(() => import("./pages/admin/Settings"));
const AccessCodesManagement = lazy(() => import("./pages/admin/AccessCodesManagement"));

// Loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="space-y-4 w-full max-w-md px-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Ensures all external anchors open in a new tab safely
const ExternalLinkEnhancer = () => {
  const location = useLocation();

  const applyEnhancements = () => {
    const anchors = document.querySelectorAll<HTMLAnchorElement>('a[href]');
    anchors.forEach((anchor) => {
      const rawHref = anchor.getAttribute('href') || '';
      if (!rawHref || rawHref.startsWith('#')) return;
      if (rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) return;
      if (rawHref.startsWith('javascript:')) return;

      try {
        const url = new URL(anchor.href);
        const isSameOrigin = url.origin === window.location.origin;
        const hostname = url.hostname;
        const isAcademy = hostname === 'academy.iiai.co.il' || hostname.endsWith('.academy.iiai.co.il');
        if (isSameOrigin || isAcademy) return;
      } catch {
        return;
      }

      anchor.setAttribute('target', '_blank');
      const existingRel = anchor.getAttribute('rel') || '';
      const relParts = new Set(existingRel.split(' ').filter(Boolean));
      relParts.add('noopener');
      relParts.add('noreferrer');
      anchor.setAttribute('rel', Array.from(relParts).join(' '));
    });
  };

  useEffect(() => {
    applyEnhancements();
  }, [location.pathname]);

  useEffect(() => {
    const observer = new MutationObserver(() => applyEnhancements());
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AccessProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ExternalLinkEnhancer />
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Home />} />
              <Route path="/access" element={<Access />} />
              <Route path="/access/beginner" element={<AccessBeginner />} />
              <Route path="/access/pro" element={<AccessPro />} />
              
              {/* Protected user route */}
              <Route path="/dashboard" element={<Dashboard />} />
              
              {/* Optional pages */}
              <Route path="/about" element={
                <Suspense fallback={<PageLoader />}>
                  <About />
                </Suspense>
              } />
              <Route path="/contact" element={
                <Suspense fallback={<PageLoader />}>
                  <Contact />
                </Suspense>
              } />
              <Route path="/privacy-policy" element={
                <Suspense fallback={<PageLoader />}>
                  <PrivacyPolicy />
                </Suspense>
              } />
              <Route path="/terms-of-service" element={
                <Suspense fallback={<PageLoader />}>
                  <TermsOfService />
                </Suspense>
              } />
              
              {/* Admin routes */}
              <Route path="/admin/login" element={
                <Suspense fallback={<PageLoader />}>
                  <AdminLogin />
                </Suspense>
              } />
              <Route path="/admin/*" element={
                <Suspense fallback={<PageLoader />}>
                  <ProtectedAdminRoute>
                <AdminLayout>
                  <Routes>
                    <Route index element={<AdminDashboard />} />
                    <Route path="codes" element={<AccessCodesManagement />} />
                    <Route path="content" element={<FreeContentList />} />
                    <Route path="content/new" element={<FreeContentForm />} />
                    <Route path="content/edit/:id" element={<FreeContentForm />} />
                    <Route path="courses" element={<CoursesList />} />
                    <Route path="courses/new" element={<CoursesForm />} />
                    <Route path="courses/edit/:id" element={<CoursesForm />} />
                    <Route path="users" element={<UsersManagement />} />
                    <Route path="settings" element={<Settings />} />
                      </Routes>
                    </AdminLayout>
                  </ProtectedAdminRoute>
                </Suspense>
              } />
              
              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AccessProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
