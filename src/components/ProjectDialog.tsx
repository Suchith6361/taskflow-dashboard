import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateProject, useUpdateProject } from "@/hooks/use-data";
import type { Project } from "@/types";

const schema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  description: z.string().trim().max(300, "Max 300 characters"),
});
type Values = z.infer<typeof schema>;

export function ProjectDialog({ open, onOpenChange, project }: { open: boolean; onOpenChange: (o: boolean) => void; project?: Project | null }) {
  const create = useCreateProject();
  const update = useUpdateProject();
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: "", description: "" } });

  useEffect(() => {
    if (open) form.reset({ name: project?.name ?? "", description: project?.description ?? "" });
  }, [open, project, form]);

  const submit = form.handleSubmit(async (v) => {
    if (project) await update.mutateAsync({ id: project.id, data: v });
    else await create.mutateAsync(v);
    onOpenChange(false);
  });
  const pending = create.isPending || update.isPending;
  const err = form.formState.errors;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{project ? "Edit project" : "New project"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="p-name">Name</Label>
            <Input id="p-name" {...form.register("name")} placeholder="e.g. Website Redesign" />
            {err.name && <p className="text-xs text-destructive">{err.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-desc">Description</Label>
            <Textarea id="p-desc" rows={3} {...form.register("description")} placeholder="What is this project about?" />
            {err.description && <p className="text-xs text-destructive">{err.description.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : project ? "Save changes" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
