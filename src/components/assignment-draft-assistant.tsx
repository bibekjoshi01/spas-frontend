import { useEffect, useRef, useState } from "react"
import { Sparkles } from "lucide-react"

import { AssignmentDescription } from "@/components/assignment-description"
import { InlineSpinner } from "@/components/query-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  apiErrorMessage,
  fieldErrorsFrom,
  useGenerateAssignmentDraftMutation,
  type AssignmentDraft,
  type AssignmentDraftInput,
} from "@/lib/api"

export function AssignmentDraftAssistant({
  allocation,
  hasContent,
  onUse,
  onBusyChange,
}: {
  allocation: number
  hasContent: boolean
  onUse: (draft: AssignmentDraft) => void
  onBusyChange: (busy: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState<AssignmentDraftInput>({
    topic: "",
    learningObjective: "",
    difficulty: "INTERMEDIATE",
    questionCount: 5,
  })
  const [draft, setDraft] = useState<AssignmentDraft | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [generate, { isLoading }] = useGenerateAssignmentDraftMutation()
  const pending = useRef<ReturnType<typeof generate> | null>(null)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      pending.current?.abort()
    }
  }, [])
  const errors = fieldErrorsFrom(error)
  const valid = Boolean(
    input.topic.trim() &&
    input.learningObjective.trim() &&
    Number.isInteger(input.questionCount) &&
    input.questionCount >= 1 &&
    input.questionCount <= 10
  )
  async function requestDraft() {
    if (!valid || pending.current) return
    setError(null)
    setDraft(null)
    onBusyChange(true)
    const request = generate({
      allocation,
      body: {
        ...input,
        topic: input.topic.trim(),
        learningObjective: input.learningObjective.trim(),
      },
    })
    pending.current = request
    try {
      const result = await request.unwrap()
      if (mounted.current) setDraft(result)
    } catch (requestError) {
      if (mounted.current) setError(requestError)
    } finally {
      pending.current = null
      if (mounted.current) onBusyChange(false)
    }
  }
  return (
    <section
      className="rounded-md border bg-muted/30 p-3"
      aria-label="AI assignment draft"
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-expanded={open}
        aria-controls="assignment-draft-panel"
        disabled={isLoading}
        onClick={() => setOpen(!open)}
      >
        <Sparkles className="size-4" aria-hidden />
        {open ? "Hide AI assistant" : "Draft with AI"}
      </Button>
      {open && (
        <div
          id="assignment-draft-panel"
          className="mt-3 space-y-3"
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              event.target instanceof HTMLInputElement
            )
              event.preventDefault()
          }}
        >
          <p className="text-xs text-muted-foreground">
            Describe the task, preview a draft, then edit it before saving.
            Leave out personal student information.
          </p>
          <fieldset disabled={isLoading} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="assignment-draft-topic">Topic</Label>
              <Input
                id="assignment-draft-topic"
                maxLength={300}
                value={input.topic}
                aria-invalid={Boolean(errors.topic)}
                aria-describedby={
                  errors.topic ? "assignment-draft-topic-error" : undefined
                }
                placeholder="Binary search trees"
                onChange={(event) =>
                  setInput({ ...input, topic: event.target.value })
                }
              />
              {errors.topic && (
                <p
                  id="assignment-draft-topic-error"
                  role="alert"
                  className="text-xs text-destructive"
                >
                  {errors.topic}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="assignment-draft-objective">
                Learning objective
              </Label>
              <textarea
                id="assignment-draft-objective"
                maxLength={1500}
                rows={3}
                className="w-full min-w-0 rounded-sm border border-input bg-card px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
                value={input.learningObjective}
                aria-invalid={Boolean(errors.learningObjective)}
                aria-describedby={
                  errors.learningObjective
                    ? "assignment-draft-objective-error"
                    : undefined
                }
                placeholder="Implement insertion and explain search complexity."
                onChange={(event) =>
                  setInput({ ...input, learningObjective: event.target.value })
                }
              />
              {errors.learningObjective && (
                <p
                  id="assignment-draft-objective-error"
                  role="alert"
                  className="text-xs text-destructive"
                >
                  {errors.learningObjective}
                </p>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="assignment-draft-difficulty">Difficulty</Label>
                <Select
                  value={input.difficulty}
                  disabled={isLoading}
                  onValueChange={(
                    difficulty: AssignmentDraftInput["difficulty"]
                  ) => setInput({ ...input, difficulty })}
                >
                  <SelectTrigger
                    id="assignment-draft-difficulty"
                    className="w-full"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BEGINNER">Beginner</SelectItem>
                    <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                    <SelectItem value="ADVANCED">Advanced</SelectItem>
                  </SelectContent>
                </Select>
                {errors.difficulty && (
                  <p role="alert" className="text-xs text-destructive">
                    {errors.difficulty}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="assignment-draft-count">
                  Practice questions
                </Label>
                <Input
                  id="assignment-draft-count"
                  type="number"
                  min={1}
                  max={10}
                  step={1}
                  value={
                    Number.isNaN(input.questionCount) ? "" : input.questionCount
                  }
                  aria-invalid={Boolean(errors.questionCount)}
                  onChange={(event) =>
                    setInput({
                      ...input,
                      questionCount: event.target.valueAsNumber,
                    })
                  }
                />
                {errors.questionCount && (
                  <p role="alert" className="text-xs text-destructive">
                    {errors.questionCount}
                  </p>
                )}
              </div>
            </div>
          </fieldset>
          <Button
            type="button"
            size="sm"
            disabled={!valid || isLoading}
            onClick={() => void requestDraft()}
          >
            {isLoading && <InlineSpinner />}
            {isLoading ? "Generating draft…" : "Generate draft"}
          </Button>
          {isLoading && (
            <p role="status" className="text-xs text-muted-foreground">
              Preparing your draft. This may take up to 30 seconds.
            </p>
          )}
          {error != null && (
            <p role="alert" className="text-sm text-destructive">
              {apiErrorMessage(
                error,
                "Could not generate a draft. Please try again."
              )}
            </p>
          )}
          {draft && (
            <div
              className="space-y-3 rounded border bg-background p-3"
              aria-label="Draft preview"
            >
              <p className="text-xs font-medium text-muted-foreground">
                AI draft · Review before use
              </p>
              <h3 className="text-base font-semibold break-words">
                {draft.title}
              </h3>
              <div className="max-h-72 overflow-y-auto">
                <AssignmentDescription value={draft.description} />
              </div>
              <p className="text-xs text-muted-foreground">
                {hasContent
                  ? "Using this draft replaces the title and instructions. "
                  : "You can edit the title and instructions after using this draft. "}
                Dates and attachments stay as entered. Check accuracy before
                saving.
              </p>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onUse(draft)
                  setDraft(null)
                  setOpen(false)
                }}
              >
                {hasContent ? "Replace title and instructions" : "Use draft"}
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
