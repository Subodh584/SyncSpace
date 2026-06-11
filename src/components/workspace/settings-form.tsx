"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  updateWorkspace,
  deleteWorkspace,
  regenerateJoinCode,
} from "@/actions/workspaces";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ASSIGNMENT_STRATEGIES, STRATEGY_LABELS } from "@/lib/constants";

export function WorkspaceSettingsForm({
  workspaceId,
  name,
  description,
  assignmentStrategy,
  joinCode,
}: {
  workspaceId: string;
  name: string;
  description: string | null;
  assignmentStrategy: string;
  joinCode: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [strategy, setStrategy] = useState(assignmentStrategy);
  const [code, setCode] = useState(joinCode);

  async function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    const res = await updateWorkspace(workspaceId, {
      name: form.get("name"),
      description: form.get("description") || undefined,
      assignmentStrategy: strategy,
    });
    setLoading(false);
    if (!res.ok) return toast.error(res.error);
    toast.success("Workspace updated");
    router.refresh();
  }

  async function regen() {
    const res = await regenerateJoinCode(workspaceId);
    if (!res.ok) return toast.error(res.error);
    setCode(res.data.joinCode);
    toast.success("New join code generated");
  }

  async function onDelete() {
    if (!confirm("Delete this workspace and all its data? This cannot be undone."))
      return;
    const res = await deleteWorkspace(workspaceId);
    if (!res.ok) return toast.error(res.error);
    toast.success("Workspace deleted");
    router.push("/workspaces");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={description ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label>Default task assignment</Label>
              <Select value={strategy} onValueChange={setStrategy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNMENT_STRATEGIES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STRATEGY_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Join code</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md border bg-muted px-3 py-2 font-mono text-sm">
              {code}
            </code>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                navigator.clipboard.writeText(code);
                toast.success("Copied");
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={regen}>
              <RefreshCw className="h-4 w-4" /> Regenerate
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Danger zone</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4" /> Delete workspace
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
