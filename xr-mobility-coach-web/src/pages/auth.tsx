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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dumbbell } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { upsertProfile } from "@/lib/profile";

type Mode = "login" | "register";

/**
 * Handles user authentication with login/register forms, error handling, and redirects to overview on success.
 * Uses AuthContext for auth logic and wouter for navigation.
 * Includes tabs to switch between login and registration forms, and displays error messages on failure.
 */
export default function AuthPage() {
  const { login, register, user } = useAuth();
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
          await upsertProfile(firstName.trim(), lastName.trim());
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-primary/10 via-background to-background">
      <div className="glass-panel w-full max-w-2xl rounded-3xl px-8 py-10 md:px-12">
        <div className="w-full max-w-md mx-auto space-y-8">
        <div className="text-center space-y-2">
          <div className="mx-auto size-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
            <Dumbbell className="text-white size-7" />
          </div>
          <h1 className="text-3xl font-display font-bold tracking-tight">MobilityXR</h1>
          <p className="text-muted-foreground">AI-Powered Mobility Coaching</p>
        </div>

        <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm p-1">
            <TabsTrigger value="register">Register</TabsTrigger>
            <TabsTrigger value="login">Login</TabsTrigger>
          </TabsList>

          <TabsContent value="register">
            <Card className="glass-card border-none shadow-xl">
              <CardHeader>
                <CardTitle>Create an account</CardTitle>
                <CardDescription>Start your mobility journey today.</CardDescription>
              </CardHeader>
              <form onSubmit={onSubmit}>
                <CardContent className="space-y-4">
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
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="xyz@example.com"
                      required
                      className="bg-white/50"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input
                      id="register-password"
                      type="password"
                      required
                      className="bg-white/50"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-red-600">
                      {error}
                    </p>
                  )}
                </CardContent>
                <CardFooter>
                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
                    disabled={loading}
                  >
                    {loading ? "Creating account..." : "Create Account"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="login">
            <Card className="glass-card border-none shadow-xl">
              <CardHeader>
                <CardTitle>Welcome back!</CardTitle>
                <CardDescription>Enter your login details to access your dashboard.</CardDescription>
              </CardHeader>
              <form onSubmit={onSubmit}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="xyz@example.com"
                      required
                      className="bg-white/50"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      required
                      className="bg-white/50"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-red-600">
                      {error}
                    </p>
                  )}
                </CardContent>
                <CardFooter>
                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
                    disabled={loading}
                  >
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </div>
  );
}
