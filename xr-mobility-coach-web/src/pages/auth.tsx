import { useState } from "react";
import type { SyntheticEvent } from "react";
import { Redirect, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Dumbbell, ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { upsertProfile } from "@/lib/profile";

type Mode = "login" | "register";

/**
 * Handles user authentication with login/register forms, error handling, and redirects to overview on success.
 * Uses AuthContext for auth logic and wouter for navigation.
 * Includes tabs to switch between login and registration forms, and displays error messages on failure.
 */
export default function AuthPage() {
  const { login, register, refreshProfile, user } = useAuth();
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<Mode>("register");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) return <Redirect to="/overview" />;

  const onSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password);
        if (firstName.trim() || lastName.trim()) {
          await upsertProfile({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
          });
          await refreshProfile();
        }
      }
      setLocation("/overview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auth failed");
    } finally {
      setLoading(false);
    }
  };

  // UI layout with tabs for login/register, forms for email/password, and error display
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-transparent">
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-secondary/30 rounded-full blur-[100px]" />

      <div className="glass-panel w-full max-w-5xl rounded-3xl px-8 py-10 md:px-12">
        <div className="w-full grid md:grid-cols-2 gap-8">
          <div className="flex flex-col justify-center p-2 space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                <Dumbbell className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-display font-bold text-foreground">MobilityXR</h1>
            </div>

            <div className="space-y-4">
              <h2 className="text-4xl md:text-5xl font-display font-bold leading-tight">
                Move Better.<br />
                <span className="text-primary">Live Longer.</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-md">
                Your AI-powered mobility coach. Restore range of motion, reduce pain, and optimize your movement health.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 pt-2">
              <div className="glass-card p-4 flex items-center gap-3 w-fit">
                <Sparkles className="text-primary h-5 w-5" />
                <span className="font-medium">AI Routine Builder</span>
              </div>
              <div className="glass-card p-4 flex items-center gap-3 w-fit">
                <span className="font-medium">Progress Tracking</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <Card className="glass-card w-full max-w-md border-none shadow-2xl">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">
                  {mode === "login" ? "Welcome Back" : "Create Account"}
                </CardTitle>
                <CardDescription>
                  {mode === "login"
                    ? "Enter your details to access your dashboard."
                    : "Start your mobility journey today."}
                </CardDescription>
              </CardHeader>

              <form onSubmit={onSubmit}>
                <CardContent className="space-y-4">
                  {mode === "register" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First name</Label>
                        <Input
                          id="firstName"
                          placeholder="John"
                          className="bg-white/50"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last name</Label>
                        <Input
                          id="lastName"
                          placeholder="Smith"
                          className="bg-white/50"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="auth-email">Email</Label>
                    <Input
                      id="auth-email"
                      type="email"
                      placeholder="xyz@example.com"
                      required
                      className="bg-white/50"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="auth-password">Password</Label>
                    <Input
                      id="auth-password"
                      type="password"
                      minLength={8}
                      maxLength={72}
                      required
                      className="bg-white/50"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  {error && <p className="text-sm text-red-600">{error}</p>}
                </CardContent>

                <CardFooter className="flex flex-col gap-4">
                  <Button
                    type="submit"
                    className="w-full h-11 text-base shadow-lg shadow-primary/25"
                    disabled={loading}
                  >
                    {loading
                      ? "Processing..."
                      : mode === "login"
                      ? "Sign In"
                      : "Create Account"}
                    {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>

                  <div className="text-sm text-center">
                    <span className="text-muted-foreground">
                      {mode === "login" ? "Don't have an account? " : "Already have an account? "}
                    </span>
                    <button
                      type="button"
                      onClick={() => setMode(mode === "login" ? "register" : "login")}
                      className="text-primary font-medium hover:underline"
                    >
                      {mode === "login" ? "Register" : "Login"}
                    </button>
                  </div>
                </CardFooter>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
