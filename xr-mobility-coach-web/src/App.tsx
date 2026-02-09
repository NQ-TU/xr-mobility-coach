// Root UI router: Decides which page component to render based on the URL path. Also handles protected routes.
import { Redirect, Route, Switch } from "wouter";
import AuthPage from "@/pages/auth";
import OverviewPage from "@/pages/overview";
import RoutinesPage from "@/pages/routines";
import HistoryPage from "@/pages/history";
import CoachPage from "@/pages/coach";
import ProfilePage from "@/pages/profile";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";

export default function App() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/overview">
        <ProtectedRoute>
          <AppLayout>
            <OverviewPage />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/routines">
        <ProtectedRoute>
          <AppLayout>
            <RoutinesPage />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/history">
        <ProtectedRoute>
          <AppLayout>
            <HistoryPage />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/coach">
        <ProtectedRoute>
          <AppLayout>
            <CoachPage />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/profile">
        <ProtectedRoute>
          <AppLayout>
            <ProfilePage />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/">
        <Redirect to="/auth" />
      </Route>
      <Route>
        <Redirect to="/auth" />
      </Route>
    </Switch>
  );
}
