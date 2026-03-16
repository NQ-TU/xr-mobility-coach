import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { upsertProfile } from "@/lib/profile";
import type { UpsertProfileRequest, UserProfile } from "@/lib/profile";
import { useAuth } from "@/context/auth-context";

const TARGET_AREAS = ["Spine", "Hips", "Shoulders", "Wrists", "Ankles"];
const EXPERIENCE_OPTIONS: Array<NonNullable<UserProfile["trainingExperience"]>> = [
  "beginner",
  "intermediate",
  "advanced",
];

function formatExperience(value: NonNullable<UserProfile["trainingExperience"]>) {
  return value[0].toUpperCase() + value.slice(1);
}

export default function ProfilePage() {
  const { user, profile, refreshProfile, loading: authLoading } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [firstName, setFirstName] = useState(profile?.firstName ?? "");
  const [lastName, setLastName] = useState(profile?.lastName ?? "");
  const [trainingExperience, setTrainingExperience] = useState<UserProfile["trainingExperience"]>(
    profile?.trainingExperience ?? null,
  );
  const [preferredSessionLength, setPreferredSessionLength] = useState<string>(
    profile?.preferredSessionLength ? String(profile.preferredSessionLength) : "",
  );
  const [targetAreas, setTargetAreas] = useState<string[]>(profile?.targetAreas ?? []);
  const [notes, setNotes] = useState(profile?.notes ?? "");
  const [createdAt, setCreatedAt] = useState<Date | null>(profile?.createdAt ?? null);

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.firstName ?? "");
    setLastName(profile.lastName ?? "");
    setTrainingExperience(profile.trainingExperience ?? null);
    setPreferredSessionLength(
      profile.preferredSessionLength ? String(profile.preferredSessionLength) : "",
    );
    setTargetAreas(profile.targetAreas ?? []);
    setNotes(profile.notes ?? "");
    setCreatedAt(profile.createdAt ?? null);
  }, [profile]);

  const savedDisplayName = useMemo(() => {
    const fullName = `${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim();
    return fullName || user?.email || "User";
  }, [profile?.firstName, profile?.lastName, user?.email]);

  const savedInitials = useMemo(() => {
    const savedFirst = profile?.firstName ?? "";
    const savedLast = profile?.lastName ?? "";
    if (savedFirst || savedLast) {
      return `${savedFirst?.[0] ?? ""}${savedLast?.[0] ?? ""}`.trim().toUpperCase() || "U";
    }
    const emailInitials = user?.email ? user.email.slice(0, 2) : "U";
    return emailInitials.toUpperCase();
  }, [profile?.firstName, profile?.lastName, user?.email]);

  const memberSince = useMemo(() => {
    if (!createdAt) return "Unknown";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(createdAt);
  }, [createdAt]);

  const accountAgeDays = useMemo(() => {
    if (!createdAt) return null;
    const diffMs = Date.now() - createdAt.getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  }, [createdAt]);

  const onToggleTargetArea = (area: string) => {
    setTargetAreas((prev) =>
      prev.includes(area) ? prev.filter((item) => item !== area) : [...prev, area],
    );
  };

  const onSave = async () => {
    setError(null);
    setSuccess(null);
    setSaving(true);
    const payload: UpsertProfileRequest = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      trainingExperience: trainingExperience ?? null,
      preferredSessionLength: preferredSessionLength ? Number(preferredSessionLength) : null,
      targetAreas,
      notes: notes.trim() || null,
    };

    try {
      await upsertProfile(payload);
      await refreshProfile();
      setSuccess("Profile updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <Card className="glass-panel border-none shadow-2xl">
        <CardContent className="p-6 md:p-8 space-y-6">
          <div>
            <h1 className="text-3xl font-display font-bold">Account Settings</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Update your profile and coaching preferences.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[260px_1fr] items-stretch">
            <Card className="glass-card border-none h-full">
              <CardContent className="p-6 space-y-6">
                <div className="rounded-2xl bg-gradient-to-br from-primary/15 via-white/70 to-secondary/20 p-4 text-center space-y-3">
                  <div className="mx-auto size-16 rounded-2xl bg-gradient-to-br from-primary/50 to-secondary/50 text-primary-foreground grid place-items-center text-xl font-semibold shadow-sm">
                    {savedInitials}
                  </div>
                  <div>
                    <p className="text-xl font-semibold">{savedDisplayName}</p>
                    <p className="text-xs text-muted-foreground">{user?.email ?? "-"}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-s uppercase tracking-wide text-muted-foreground">Account Details</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">First name</span>
                      <span className="font-medium">{profile?.firstName || "-"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Last name</span>
                      <span className="font-medium">{profile?.lastName || "-"}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-s uppercase tracking-wide text-muted-foreground">Training Preferences</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Experience </span>
                      <span className="font-medium">
                        {profile?.trainingExperience ? formatExperience(profile.trainingExperience) : "Not set"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Daily goal</span>
                      <span className="font-medium">
                        {profile?.preferredSessionLength ? `${profile.preferredSessionLength} min` : "Not set"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-s uppercase text-muted-foreground">Target areas</p>
                    <div className="flex flex-wrap gap-2">
                      {profile?.targetAreas?.length ? (
                        profile.targetAreas.map((area) => (
                          <span
                            key={area}
                            className="rounded-full bg-white/60 px-3 py-1 text-xs font-medium text-foreground"
                          >
                            {area}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">None selected</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-s uppercase text-muted-foreground">Notes</p>
                    <p className="text-sm text-foreground/80 line-clamp-3 whitespace-pre-wrap break-words">
                      {profile?.notes ? profile.notes : "No notes yet."}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-s uppercase text-muted-foreground">Member since</p>
                    <p className="text-sm text-foreground/80">
                      {memberSince}
                      {accountAgeDays !== null ? `: ${accountAgeDays} days` : ""}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-none">
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
                <CardDescription>Customize your coaching experience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {authLoading && !profile ? (
                  <p className="text-sm text-muted-foreground">Loading profile...</p>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="profile-first-name">First name</Label>
                        <Input
                          id="profile-first-name"
                          className="bg-white/50"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="First name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="profile-last-name">Last name</Label>
                        <Input
                          id="profile-last-name"
                          className="bg-white/50"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Last name"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="profile-email">Email</Label>
                      <Input
                        id="profile-email"
                        className="bg-white/50"
                        value={user?.email ?? ""}
                        disabled
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="profile-training">Training experience</Label>
                        <select
                          id="profile-training"
                          className="w-full rounded-md border border-border/60 bg-white/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                          value={trainingExperience ?? ""}
                          onChange={(e) =>
                            setTrainingExperience(
                              e.target.value ? (e.target.value as UserProfile["trainingExperience"]) : null,
                            )
                          }
                        >
                          <option value="">Select level</option>
                          {EXPERIENCE_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {formatExperience(option)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="profile-session-length">Daily session goal (min)</Label>
                        <Input
                          id="profile-session-length"
                          type="number"
                          min={1}
                          max={45}
                          className="bg-white/50"
                          value={preferredSessionLength}
                          onChange={(e) => setPreferredSessionLength(e.target.value)}
                          placeholder="30"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Target areas</Label>
                      <div className="flex flex-wrap gap-3">
                        {TARGET_AREAS.map((area) => (
                          <label
                            key={area}
                            className="flex items-center gap-2 rounded-lg border border-border/60 bg-white/50 px-3 py-2 text-sm font-medium text-foreground/90 shadow-sm"
                          >
                            <input
                              type="checkbox"
                              checked={targetAreas.includes(area)}
                              onChange={() => onToggleTargetArea(area)}
                              className="rounded border-slate-300 text-primary focus:ring-primary"
                            />
                            {area}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="profile-notes">Notes (used for personalized recommendations)</Label>
                      <textarea
                        id="profile-notes"
                        className="w-full min-h-[120px] rounded-md border border-border/60 bg-white/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                        placeholder="Describe past injuries or areas to avoid..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>

                    {error && <p className="text-sm text-red-600">{error}</p>}
                    {success && <p className="text-sm text-emerald-600">{success}</p>}

                    <div className="flex items-center justify-between pt-2">
                      <p className="text-xs text-muted-foreground">Signed in as {savedDisplayName}</p>
                      <Button
                        className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
                        type="button"
                        onClick={onSave}
                        disabled={saving}
                      >
                        {saving ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

