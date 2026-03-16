import { Redirect } from "wouter";
import { useAuth } from "@/context/auth-context";

// A wrapper component for protected routes. It checks if the user is authenticated and either renders the child components,
//  shows a loading state, or redirects to the auth page.
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Redirect to="/auth" />;

  return <>{children}</>;
}
