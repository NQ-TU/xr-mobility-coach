// Root UI router: Decides which page component to render based on the URL path. Also handles protected routes.
import { Redirect, Route, Switch } from "wouter";
import AuthPage from "@/pages/auth";
import OverviewPage from "@/pages/overview";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function App() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/overview">
        <ProtectedRoute>
          <OverviewPage />
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
