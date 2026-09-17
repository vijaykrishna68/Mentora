import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Avatar, Badge, Button, Card, Checkbox, Field, Input, Select, Textarea } from "@/components/ui";
import { isApiError } from "@/lib/api/errors";
import { useToastStore } from "@/lib/stores/toastStore";
import { getBrowserTimezone, getSupportedTimezones } from "@/lib/utils/datetime";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  CONNECTION_MODES,
  CONNECTION_MODE_LABELS,
  type Category,
  type ConnectionMode,
  type PrivateMentorProfile,
  type UpdateMentorProfileInput,
} from "@/types";
import { mentorProfileFormSchema, type MentorProfileFormValues } from "../schemas";
import { useUpdateMentorProfile } from "../useUpdateMentorProfile";

const SUPPORTED_TIMEZONES = getSupportedTimezones();

/**
 * IANA has legacy aliases for the same physical zone (e.g. this runtime's
 * ICU data may list "Asia/Calcutta" while a profile stored "Asia/Kolkata"
 * from a different browser/server) — Intl.supportedValuesOf() only reflects
 * THIS runtime's preferred spelling. Without this, a mentor's already-saved
 * timezone could silently fail to match any <option>, render as blank, and
 * be wiped out on the next save. The stored value is always included even
 * if this runtime wouldn't have offered it.
 */
function timezoneOptionsFor(currentTimezone: string): string[] {
  if (!currentTimezone || SUPPORTED_TIMEZONES.includes(currentTimezone)) {
    return SUPPORTED_TIMEZONES;
  }
  return [currentTimezone, ...SUPPORTED_TIMEZONES];
}

function toFormValues(profile: PrivateMentorProfile): MentorProfileFormValues {
  return {
    headline: profile.headline ?? "",
    bio: profile.bio ?? "",
    country: profile.country ?? "",
    timezone: profile.timezone ?? "",
    phone: profile.phone ?? "",
    yearsExperience: profile.yearsExperience ?? undefined,
    primaryCategory: profile.primaryCategory ?? "",
    tags: profile.tags,
    connectionModes: profile.connectionModes,
    avatarUrl: profile.avatarUrl ?? "",
  };
}

function toPayload(values: MentorProfileFormValues): UpdateMentorProfileInput {
  return {
    headline: values.headline?.trim() ? values.headline.trim() : null,
    bio: values.bio?.trim() ? values.bio.trim() : null,
    country: values.country?.trim() ? values.country.trim().toUpperCase() : null,
    timezone: values.timezone?.trim() ? values.timezone.trim() : null,
    phone: values.phone?.trim() ? values.phone.trim() : null,
    yearsExperience: values.yearsExperience === undefined || Number.isNaN(values.yearsExperience) ? null : values.yearsExperience,
    primaryCategory: values.primaryCategory ? (values.primaryCategory as Category) : null,
    tags: values.tags ?? [],
    connectionModes: (values.connectionModes ?? []) as ConnectionMode[],
    avatarUrl: values.avatarUrl?.trim() ? values.avatarUrl.trim() : null,
  };
}

/**
 * Every section here maps directly to a field PATCH /api/mentor/profile
 * accepts (mentor-profile.schema.ts) — display name has no backend field
 * (it lives on User, with no update endpoint), so it isn't editable here.
 * Avatar is a URL field only: the backend has no upload infrastructure, so
 * this deliberately doesn't build one.
 */
export function MentorProfileForm({ profile }: { profile: PrivateMentorProfile }) {
  const mutation = useUpdateMentorProfile();
  const pushToast = useToastStore((state) => state.push);
  const [tagDraft, setTagDraft] = useState("");
  const timezoneOptions = timezoneOptionsFor(profile.timezone ?? "");

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<MentorProfileFormValues>({
    resolver: zodResolver(mentorProfileFormSchema),
    defaultValues: toFormValues(profile),
  });

  const tags = useWatch({ control, name: "tags" }) ?? [];
  const avatarUrl = useWatch({ control, name: "avatarUrl" });

  function addTag() {
    const value = tagDraft.trim();
    if (!value || tags.includes(value) || tags.length >= 20) {
      setTagDraft("");
      return;
    }
    setValue("tags", [...tags, value], { shouldDirty: true });
    setTagDraft("");
  }

  function removeTag(tag: string) {
    setValue(
      "tags",
      tags.filter((t) => t !== tag),
      { shouldDirty: true },
    );
  }

  function onSubmit(values: MentorProfileFormValues) {
    if (mutation.isPending) return; // belt-and-suspenders against a double-click beating `disabled`

    mutation.mutate(toPayload(values), {
      onSuccess: () => {
        pushToast({ variant: "success", title: "Profile updated" });
      },
    });
  }

  const errorMessage = mutation.isError
    ? isApiError(mutation.error)
      ? mutation.error.message
      : "Something went wrong. Please try again."
    : null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <Card className="p-4 sm:p-5">
        <p className="font-serif text-base font-semibold text-charcoal">Identity</p>
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Avatar src={avatarUrl || null} name={profile.headline ?? "Mentor"} size="lg" />
            <div className="flex-1">
              <Field label="Portrait URL" hint="A direct image URL. Uploading isn't supported yet." error={errors.avatarUrl?.message}>
                {(fieldProps) => <Input type="url" placeholder="https://…" {...fieldProps} {...register("avatarUrl")} />}
              </Field>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Location" hint="2-letter country code, e.g. IN" error={errors.country?.message}>
              {(fieldProps) => <Input placeholder="IN" maxLength={2} {...fieldProps} {...register("country")} />}
            </Field>
            <Field label="Primary category" error={errors.primaryCategory?.message}>
              {(fieldProps) => (
                <Select {...fieldProps} {...register("primaryCategory")}>
                  <option value="">Not set</option>
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {CATEGORY_LABELS[category]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
        </div>
      </Card>

      <Card className="p-4 sm:p-5">
        <p className="font-serif text-base font-semibold text-charcoal">Profile</p>
        <div className="mt-4 flex flex-col gap-4">
          <Field label="Headline" hint="Required to become bookable." error={errors.headline?.message}>
            {(fieldProps) => <Input placeholder="Senior Product Manager" {...fieldProps} {...register("headline")} />}
          </Field>
          <Field label="About / bio" hint="Required to become bookable." error={errors.bio?.message}>
            {(fieldProps) => <Textarea rows={5} placeholder="Tell customers about your background…" {...fieldProps} {...register("bio")} />}
          </Field>
          <Field label="Years of experience" error={errors.yearsExperience?.message}>
            {(fieldProps) => (
              <Input type="number" min={0} max={80} {...fieldProps} {...register("yearsExperience", { valueAsNumber: true })} />
            )}
          </Field>

          <div>
            <span className="mb-1.5 block text-xs font-semibold text-charcoal-2">Tags</span>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <Badge key={tag} variant="sage" className="gap-1.5">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    aria-label={`Remove tag ${tag}`}
                    className="text-charcoal-muted hover:text-charcoal"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <Input
                value={tagDraft}
                onChange={(event) => setTagDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Add a tag and press Enter"
                aria-label="Add a tag"
              />
              <Button type="button" variant="secondary" size="sm" onClick={addTag}>
                Add
              </Button>
            </div>
            {errors.tags?.message && (
              <p role="alert" className="mt-1.5 text-[11.5px] font-semibold text-error">
                {errors.tags.message}
              </p>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-4 sm:p-5">
        <p className="font-serif text-base font-semibold text-charcoal">Contact</p>
        <div className="mt-4">
          <Field label="Phone" hint="Used for PHONE-mode sessions." error={errors.phone?.message}>
            {(fieldProps) => <Input type="tel" placeholder="+1 555 0100" {...fieldProps} {...register("phone")} />}
          </Field>
        </div>
      </Card>

      <Card className="p-4 sm:p-5">
        <p className="font-serif text-base font-semibold text-charcoal">Timezone</p>
        <p className="mt-1 text-[12.5px] text-charcoal-muted">
          This is your scheduling timezone — availability and appointment times are always interpreted using it. Required to become
          bookable.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Field label="IANA timezone" error={errors.timezone?.message}>
              {(fieldProps) => (
                <Select {...fieldProps} {...register("timezone")}>
                  <option value="">Not set</option>
                  {timezoneOptions.map((timezone) => (
                    <option key={timezone} value={timezone}>
                      {timezone}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setValue("timezone", getBrowserTimezone(), { shouldDirty: true })}
          >
            Use this device's timezone
          </Button>
        </div>
      </Card>

      <Card className="p-4 sm:p-5">
        <p className="font-serif text-base font-semibold text-charcoal">Connection modes</p>
        <p className="mt-1 text-[12.5px] text-charcoal-muted">The ways customers can meet with you. Individual offerings choose from these.</p>
        <Controller
          control={control}
          name="connectionModes"
          render={({ field }) => (
            <div className="mt-3 flex flex-col gap-2.5">
              {CONNECTION_MODES.map((mode) => (
                <Checkbox
                  key={mode}
                  id={`connection-mode-${mode}`}
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
      </Card>

      {errorMessage && (
        <p role="alert" className="text-[12.5px] font-semibold text-error">
          {errorMessage}
        </p>
      )}

      <div>
        <Button type="submit" loading={isSubmitting || mutation.isPending} aria-busy={isSubmitting || mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </form>
  );
}
