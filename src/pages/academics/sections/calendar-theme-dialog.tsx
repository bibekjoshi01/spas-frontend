import { useState } from "react"
import { RotateCcw } from "lucide-react"

import { Field, FormDialog } from "@/components/form-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  type CalendarTheme,
  DEFAULT_CALENDAR_THEME,
  fieldErrorsFrom,
  formErrorFrom,
  useGetCalendarSettingsQuery,
  useUpdateCalendarSettingsMutation,
} from "@/lib/api"
import { notifier } from "@/lib/utils/notifier"

const HEX = /^#[0-9a-fA-F]{6}$/

const ROLES: {
  key: keyof Omit<CalendarTheme, "showGregorianDates">
  label: string
  hint: string
  /** The field the API reports an invalid colour against. */
  errorKey: string
}[] = [
  {
    key: "accentColor",
    label: "Accent",
    hint: "Month headings on screen, and the ring around today.",
    errorKey: "themeAccentColor",
  },
  {
    key: "holidayColor",
    label: "Holiday",
    hint: "Closed days and Saturdays.",
    errorKey: "themeHolidayColor",
  },
  {
    key: "eventColor",
    label: "Event",
    hint: "Exams and everything else marked.",
    errorKey: "themeEventColor",
  },
  {
    key: "downloadBandColor",
    label: "Download band",
    hint: "The header across each month of the downloaded calendar.",
    errorKey: "themeDownloadBandColor",
  },
]

/**
 * The calendar's palette, in the college's own colours.
 *
 * Three colours rather than a full theme editor: a college has a crest and two
 * or three brand colours, and everything on the calendar is either a heading,
 * a closed day or something happening. Each colour is stored once and shown
 * here over the same wash the grid paints it with, so what the preview shows
 * is what the wall chart prints.
 */
export function CalendarThemeDialog({ onClose }: { onClose: () => void }) {
  const settings = useGetCalendarSettingsQuery()
  const [update, state] = useUpdateCalendarSettingsMutation()
  const [draft, setDraft] = useState<CalendarTheme | null>(null)

  const saved: CalendarTheme = settings.data
    ? {
        accentColor: settings.data.accentColor,
        holidayColor: settings.data.holidayColor,
        eventColor: settings.data.eventColor,
        downloadBandColor: settings.data.downloadBandColor,
        showGregorianDates: settings.data.showGregorianDates,
      }
    : DEFAULT_CALENDAR_THEME
  const theme = draft ?? saved
  const errors = fieldErrorsFrom(state.error)

  const invalid = ROLES.some((role) => !HEX.test(theme[role.key]))
  const set = (patch: Partial<CalendarTheme>) =>
    setDraft({ ...theme, ...patch })

  return (
    <FormDialog
      open
      onOpenChange={(next) => !next && onClose()}
      title="Calendar Theme"
      description="How this college paints its calendar, on screen and in the downloaded copy. Everyone sees these colours."
      formError={formErrorFrom(state.error)}
      isSubmitting={state.isLoading}
      canSubmit={!invalid && !settings.isLoading}
      submitLabel="Save theme"
      onSubmit={async () => {
        try {
          await update(theme).unwrap()
          setDraft(null)
          notifier.success("Calendar theme saved.")
          onClose()
        } catch {
          /* the form shows the error */
        }
      }}
    >
      {settings.isLoading ? (
        <div className="space-y-3">
          {ROLES.map((role) => (
            <Skeleton key={role.key} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <>
          {ROLES.map((role) => (
            <Field
              key={role.key}
              label={role.label}
              htmlFor={`theme-${role.key}`}
              hint={role.hint}
              error={errors[role.errorKey]}
            >
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label={`${role.label} colour`}
                  value={
                    HEX.test(theme[role.key])
                      ? theme[role.key]
                      : DEFAULT_CALENDAR_THEME[role.key]
                  }
                  onChange={(event) =>
                    set({
                      [role.key]: event.target.value,
                    } as Partial<CalendarTheme>)
                  }
                  className="size-8 shrink-0 cursor-pointer rounded-sm border border-input bg-card p-0.5"
                />
                <Input
                  id={`theme-${role.key}`}
                  value={theme[role.key]}
                  spellCheck={false}
                  onChange={(event) =>
                    set({
                      [role.key]: event.target.value,
                    } as Partial<CalendarTheme>)
                  }
                  placeholder={DEFAULT_CALENDAR_THEME[role.key]}
                  className="w-32 font-mono"
                  aria-invalid={!HEX.test(theme[role.key]) || undefined}
                />
              </div>
            </Field>
          ))}

          <Field label="Dates">
            <Label className="flex cursor-pointer items-center gap-2 text-sm font-normal">
              <Checkbox
                checked={theme.showGregorianDates}
                onCheckedChange={(checked) =>
                  set({ showGregorianDates: checked === true })
                }
              />
              Show the English date in each cell
            </Label>
          </Field>

          <Field label="Preview">
            <ThemePreview theme={theme} />
          </Field>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="justify-self-start text-muted-foreground"
            onClick={() => setDraft(DEFAULT_CALENDAR_THEME)}
          >
            <RotateCcw className="size-4" aria-hidden />
            Reset to the shipped colours
          </Button>
        </>
      )}
    </FormDialog>
  )
}

/** One week, painted the way the grid will paint it. */
function ThemePreview({ theme }: { theme: CalendarTheme }) {
  const style = {
    "--cal-accent": theme.accentColor,
    "--cal-holiday": theme.holidayColor,
    "--cal-event": theme.eventColor,
  } as React.CSSProperties

  const days = [
    { np: "११", en: 25, kind: "" },
    { np: "१२", en: 26, kind: "" },
    { np: "१३", en: 27, kind: "event" },
    { np: "१४", en: 28, kind: "" },
    { np: "१५", en: 29, kind: "" },
    { np: "१६", en: 30, kind: "" },
    { np: "१७", en: 31, kind: "holiday" },
  ]

  return (
    <div style={style} className="overflow-hidden border bg-card">
      <div className="cal-band px-3 py-2 text-sm font-semibold">
        Ashwin (September/October)
      </div>
      <div className="grid grid-cols-7 gap-px bg-border">
        {days.map((day) => (
          <span
            key={day.np}
            className={`flex aspect-square flex-col justify-between bg-card px-1.5 py-1 ${
              day.kind === "holiday"
                ? "cal-holiday"
                : day.kind === "event"
                  ? "cal-event"
                  : ""
            }`}
          >
            <span className="text-sm leading-none font-semibold tabular-nums">
              {day.np}
            </span>
            {theme.showGregorianDates && (
              <span className="self-end text-[10px] leading-none text-muted-foreground tabular-nums">
                {day.en}
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  )
}
