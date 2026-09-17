import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Button, Checkbox, Dialog, Field, Input, Textarea } from "@/components/ui";
import { isApiError } from "@/lib/api/errors";
import { useToastStore } from "@/lib/stores/toastStore";
import type { CreateExperienceInput, ExperienceEntry } from "@/types";
import { experienceFormSchema, type ExperienceFormValues } from "../schemas";
import { useCreateExperience, useUpdateExperience } from "../useExperienceMutations";

interface ExperienceFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** Present when editing an existing entry; absent when creating one. */
  entry?: ExperienceEntry;
}

function toFormValues(entry?: ExperienceEntry): ExperienceFormValues {
  return {
    organization: entry?.organization ?? "",
    role: entry?.role ?? "",
    startDate: entry?.startDate.slice(0, 10) ?? "",
    endDate: entry?.endDate?.slice(0, 10) ?? "",
    isCurrent: entry ? entry.endDate === null : true,
    description: entry?.description ?? "",
  };
}

function toPayload(values: ExperienceFormValues): CreateExperienceInput {
  return {
    organization: values.organization.trim(),
    role: values.role.trim(),
    startDate: values.startDate,
    endDate: values.isCurrent ? null : values.endDate?.trim() ? values.endDate.trim() : null,
    description: values.description?.trim() ? values.description.trim() : null,
  };
}

export function ExperienceFormDialog({ open, onClose, entry }: ExperienceFormDialogProps) {
  const createMutation = useCreateExperience();
  const updateMutation = useUpdateExperience(entry?.id ?? "");
  const mutation = entry ? updateMutation : createMutation;
  const pushToast = useToastStore((state) => state.push);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ExperienceFormValues>({
    resolver: zodResolver(experienceFormSchema),
    values: toFormValues(entry),
  });

  const isCurrent = useWatch({ control, name: "isCurrent" });

  function handleClose() {
    mutation.reset();
    reset(toFormValues(entry));
    onClose();
  }

  function onSubmit(values: ExperienceFormValues) {
    if (mutation.isPending) return; // belt-and-suspenders against a double-click beating `disabled`

    mutation.mutate(toPayload(values), {
      onSuccess: () => {
        pushToast({ variant: "success", title: entry ? "Experience updated" : "Experience added" });
        handleClose();
      },
    });
  }

  const errorMessage = mutation.isError
    ? isApiError(mutation.error)
      ? mutation.error.message
      : "Something went wrong. Please try again."
    : null;

  return (
    <Dialog open={open} onClose={handleClose} title={entry ? "Edit experience" : "Add experience"}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <Field label="Organization" error={errors.organization?.message} required>
          {(fieldProps) => <Input {...fieldProps} {...register("organization")} />}
        </Field>
        <Field label="Role" error={errors.role?.message} required>
          {(fieldProps) => <Input {...fieldProps} {...register("role")} />}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date" error={errors.startDate?.message} required>
            {(fieldProps) => <Input type="date" {...fieldProps} {...register("startDate")} />}
          </Field>
          <Field label="End date" error={errors.endDate?.message} hint={isCurrent ? "Currently working here" : undefined}>
            {(fieldProps) => <Input type="date" disabled={isCurrent} {...fieldProps} {...register("endDate")} />}
          </Field>
        </div>

        <Checkbox id="experience-is-current" label="I currently work here" {...register("isCurrent")} />

        <Field label="Description" error={errors.description?.message}>
          {(fieldProps) => <Textarea rows={3} {...fieldProps} {...register("description")} />}
        </Field>

        {errorMessage && (
          <p role="alert" className="text-[12.5px] font-semibold text-error">
            {errorMessage}
          </p>
        )}

        <div className="flex gap-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={handleClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1" loading={isSubmitting || mutation.isPending} aria-busy={isSubmitting || mutation.isPending}>
            {mutation.isPending ? "Saving…" : entry ? "Save changes" : "Add experience"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
