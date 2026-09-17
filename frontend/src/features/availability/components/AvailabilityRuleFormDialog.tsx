import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button, Checkbox, Dialog, Field, Input, Select } from "@/components/ui";
import { isApiError } from "@/lib/api/errors";
import { useToastStore } from "@/lib/stores/toastStore";
import { DAYS_OF_WEEK, DAY_OF_WEEK_LABELS, type AvailabilityRule, type CreateAvailabilityRuleInput, type DayOfWeek } from "@/types";
import { availabilityRuleFormSchema, type AvailabilityRuleFormValues } from "../schemas";
import { useCreateAvailabilityRule, useUpdateAvailabilityRule } from "../useAvailabilityRuleMutations";

interface AvailabilityRuleFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** Present when editing an existing rule; absent when creating one. */
  rule?: AvailabilityRule;
  /** Pre-selects the day when adding a rule from that day's row. */
  defaultDayOfWeek?: DayOfWeek;
}

function toFormValues(rule: AvailabilityRule | undefined, defaultDayOfWeek?: DayOfWeek): AvailabilityRuleFormValues {
  return {
    dayOfWeek: rule?.dayOfWeek ?? defaultDayOfWeek ?? "",
    startTime: rule?.startTime ?? "09:00",
    endTime: rule?.endTime ?? "17:00",
    bufferMinutes: rule?.bufferMinutes ?? 0,
    isActive: rule?.isActive ?? true,
  };
}

function toPayload(values: AvailabilityRuleFormValues): CreateAvailabilityRuleInput {
  return {
    dayOfWeek: values.dayOfWeek as DayOfWeek,
    startTime: values.startTime,
    endTime: values.endTime,
    bufferMinutes: values.bufferMinutes,
    isActive: values.isActive,
  };
}

/**
 * Client-side validation here only catches structurally invalid input (end
 * before start, malformed time). An overlapping rule is a 409 the backend
 * decides — this dialog just shows that message inline and keeps the form
 * open so the mentor can adjust and resubmit, rather than re-implementing
 * overlap detection.
 */
export function AvailabilityRuleFormDialog({ open, onClose, rule, defaultDayOfWeek }: AvailabilityRuleFormDialogProps) {
  const createMutation = useCreateAvailabilityRule();
  const updateMutation = useUpdateAvailabilityRule(rule?.id ?? "");
  const mutation = rule ? updateMutation : createMutation;
  const pushToast = useToastStore((state) => state.push);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AvailabilityRuleFormValues>({
    resolver: zodResolver(availabilityRuleFormSchema),
    values: toFormValues(rule, defaultDayOfWeek),
  });

  function handleClose() {
    mutation.reset();
    reset(toFormValues(rule, defaultDayOfWeek));
    onClose();
  }

  function onSubmit(values: AvailabilityRuleFormValues) {
    if (mutation.isPending) return; // belt-and-suspenders against a double-click beating `disabled`

    mutation.mutate(toPayload(values), {
      onSuccess: () => {
        pushToast({ variant: "success", title: rule ? "Availability rule updated" : "Availability rule added" });
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
    <Dialog open={open} onClose={handleClose} title={rule ? "Edit availability rule" : "Add availability rule"}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <Field label="Day" error={errors.dayOfWeek?.message} required>
          {(fieldProps) => (
            <Select {...fieldProps} {...register("dayOfWeek")}>
              <option value="">Choose a day</option>
              {DAYS_OF_WEEK.map((day) => (
                <option key={day} value={day}>
                  {DAY_OF_WEEK_LABELS[day]}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Start time" error={errors.startTime?.message} required>
            {(fieldProps) => <Input type="time" {...fieldProps} {...register("startTime")} />}
          </Field>
          <Field label="End time" error={errors.endTime?.message} required>
            {(fieldProps) => <Input type="time" {...fieldProps} {...register("endTime")} />}
          </Field>
        </div>

        <Field label="Buffer (minutes)" hint="Gap kept free before/after bookings in this window." error={errors.bufferMinutes?.message}>
          {(fieldProps) => <Input type="number" min={0} max={180} step={5} {...fieldProps} {...register("bufferMinutes", { valueAsNumber: true })} />}
        </Field>

        <Checkbox id="availability-rule-is-active" label="Active" {...register("isActive")} />

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
            {mutation.isPending ? "Saving…" : rule ? "Save changes" : "Add rule"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
