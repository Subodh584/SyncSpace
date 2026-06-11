import { getCurrentUser } from "@/lib/current-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileForm } from "@/components/settings/profile-form";
import { initials } from "@/lib/utils";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  return (
    <div className="container max-w-2xl space-y-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Profile & settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {user.image && <AvatarImage src={user.image} />}
              <AvatarFallback className="text-lg">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                ID: {user.workspaceUserId}
              </p>
            </div>
          </div>
          <ProfileForm name={user.name} image={user.image} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Username</span>
            <span className="font-medium">{user.username}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Member since</span>
            <span className="font-medium">
              {user.createdAt.toLocaleDateString()}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
