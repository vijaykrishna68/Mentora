import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Button, Checkbox, Dialog, Field, Input, Select, Textarea } from "@/components/ui";
import { isApiError } from "@/lib/api/errors";
import { useToastStore } from "@/lib/stores/toastStore";
import {
  AVAILABILITY_CATEGORIES,
  AVAILABILITY_CATEGORY_LABELS,
  CATEGORIES,
  CATEGORY_LABELS,
  CONNECTION_MODES,
  CONNECTION_MODE_LABELS,
  type Category,
  type ConnectionMode,
  type AvailabilityCategory,
  type CreateOfferingInput,
  type Offering,
} from "@/types";
import { offeringFormSchema, type OfferingFormValues } from "../schemas";
import { useCreateOffering, useUpdateOffering } from "../useOfferingMutations";

interface OfferingFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** Present when editing an existing offering; absent when creating one. */
  offering?: Offering;
  /** The mentor's own supported connection modes (from their profile) — an offering can only use a subset. Empty means the mentor hasn't set any yet, so every mode is offered as a fallback. */
  availableConnectionModes: ConnectionMode[];
}

function toFormValues(offering?: Offering): OfferingFormValues {
  return {
    name: offering?.name ?? "",
    description: offering?.description ?? "",
    category: offering?.category ?? "",
    durationMinutes: offering?.durationMinutes ?? 30,
    price: offering?.price ?? 0,
    currency: offering?.currency ?? "INR",
    connectionModes: offering?.connectionModes ?? [],
    availabilityCategories: offering?.availabilityCategories ?? [],
    isActive: offering?.isActive ?? true,
  };
}

function toPayload(values: OfferingFormValues): CreateOfferingInput {
  return {
    name: values.name.trim(),
    description: values.description?.trim() ? values.description.trim() : null,
    category: values.category as Category,
    durationMinutes: values.durationMinutes,
    price: values.price,
    currency: values.currency.trim().toUpperCase(),
    connectionModes: values.connectionModes as ConnectionMode[],
    availabilityCategories: values.availabilityCategories as AvailabilityCategory[],
    isActive: values.isActive,
  };
}

export function OfferingFormDialog({ open, onClose, offering, availableConnectionModes }: OfferingFormDialogProps) {
  const createMutation = useCreateOffering();
  const updateMutation = useUpdateOffering(offering?.id ?? "");
  const mutation = offering ? updateMutation : createMutation;
  const pushToast = useToastStore((state) => state.push);
  const connectionModeOptions = availableConnectionModes.length > 0 ? availableConnectionModes : CONNECTION_MODES;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OfferingFormValues>({
    resolver: zodResolver(offeringFormSchema),
    values: toFormValues(offering),
  });

  function handleClose() {
    mutation.reset();
    reset(toFormValues(offering));
    onClose();
  }

  function onSubmit(values: OfferingFormValues) {
    if (mutation.isPending) return; // belt-and-suspenders against a double-click beating `disabled`

    mutation.mutate(toPayload(values), {
      onSuccess: () => {
        pushToast({ variant: "success", title: offering ? "Offering updated" : "Offering created" });
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
    <Dialog open={open} onClose={handleClose} title={offering ? "Edit offering" : "New offering"}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <Field label="Name" error={errors.name?.message} required>
          {(fieldProps) => <Input placeholder="Career Deep Dive" {...fieldProps} {...register("name")} />}
        </Field>
        <Field label="Description" error={errors.description?.message}>
          {(fieldProps) => <Textarea rows={3} {...fieldProps} {...register("description")} />}
        </Field>
        <Field label="Category" error={errors.category?.message} required>
          {(fieldProps) => (
            <Select {...fieldProps} {...register("category")}>
              <option value="">Choose a category</option>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {CATEGORY_LABELS[category]}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Duration (min)" error={errors.durationMinutes?.message} required>
            {(fieldProps) => <Input type="number" min={15} max={240} step={5} {...fieldProps} {...register("durationMinutes", { valueAsNumber: true })} />}
          </Field>
          <Field label="Price" error={errors.price?.message} required>
            {(fieldProps) => <Input type="number" min={0} step="0.01" {...fieldProps} {...register("price", { valueAsNumber: true })} />}
          </Field>
          <Field label="Currency" error={errors.currency?.message} required>
            {(fieldProps) => <Input maxLength={3} {...fieldProps} {...register("currency")} />}
          </Field>
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-semibold text-charcoal-2">Connection modes</span>
          {availableConnectionModes.length === 0 && (
            <p className="mb-1.5 text-[11.5px] text-warning">You haven't set any connection modes on your profile yet — showing all options.</p>
          )}
          <Controller
            control={control}
            name="connectionModes"
            render={({ field }) => (
              <div className="flex flex-col gap-2">
                {connectionModeOptions.map((mode) => (
                  <Checkbox
                    key={mode}
                    id={`offering-connection-mode-${mode}`}
                    label={CONNECTION_MODE_LABELS[mode]}
                    checked={(field.value ?? []).includes(mode)}
                    onChange={(event) => {
                      const current = field.value ?? [];
                      field.onChange(event.target.checked ? [...current, mode] : current.filter((m) => m !== mode));
                    }}
                  />
                ))}
              </div>
            )}
          />
          {errors.connectionModes?.message && (
            <p role="alert" className="mt-1.5 text-[11.5px] font-semibold text-error">
              {errors.connectionModes.message}
            </p>
          )}
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-semibold text-charcoal-2">Availability categories</span>
          <p className="mb-1.5 text-[11.5px] text-charcoal-muted">Which time-of-day windows this offering can be booked into.</p>
          <Controller
            control={control}
            name="availabilityCategories"
            render={({ field }) => (
              <div className="flex flex-col gap-2">
                {AVAILABILITY_CATEGORIES.map((availabilityCategory) => (
                  <Checkbox
                    key={availabilityCategory}
                    id={`offering-availability-category-${availabilityCategory}`}
                    label={AVAILABILITY_CATEGORY_LABELS[availabilityCategory]}
                    checked={(field.value ?? []).includes(availabilityCategory)}
                    onChange={(event) => {
                      const current = field.value ?? [];
                      field.onChange(
                        event.target.checked ? [...current, availabilityCategory] : current.filter((c) => c !== availabilityCategory),
                      );
                    }}
                  />
                ))}
              </div>
            )}
          />
          {errors.availabilityCategories?.message && (
            <p role="alert" className="mt-1.5 text-[11.5px] font-semibold text-error">
              {errors.availabilityCategories.message}
            </p>
          )}
        </div>

        <Checkbox id="offering-is-active" label="Active (bookable by customers)" {...register("isActive")} />

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
            {mutation.isPending ? "Saving…" : offering ? "Save changes" : "Create offering"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
