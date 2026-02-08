import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";

// Mostly a stub for now. 
export default function OverviewPage() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <div>
      <h1>Overview</h1>
      <p>Signed in as {user?.email}</p>
      <button
        type="button"
        onClick={() => {
          logout();
          setLocation("/auth");
        }}
      >
        Logout
      </button>
    </div>
  );
}
