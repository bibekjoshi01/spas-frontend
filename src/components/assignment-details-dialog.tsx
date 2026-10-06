import { useState } from "react"
import { Download, Paperclip } from "lucide-react"
import axios from "axios"

import { AssignmentDescription } from "@/components/assignment-description"
import { QueryState } from "@/components/query-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ASSIGNMENT_LABELS,
  useGetAssignmentQuery,
  useGetStudentPortalAssignmentQuery,
} from "@/lib/api"
import { axiosInstance } from "@/lib/redux/axios"
import { notifier } from "@/lib/utils/notifier"

export function AssignmentDetailsDialog({
  assignmentId,
  student = false,
  onClose,
}: {
  assignmentId: number
  student?: boolean
  onClose: () => void
}) {
  const teacherQuery = useGetAssignmentQuery(assignmentId, { skip: student })
  const studentQuery = useGetStudentPortalAssignmentQuery(assignmentId, {
    skip: !student,
  })
  const query = student ? studentQuery : teacherQuery
  const data = query.currentData
  const [downloading, setDownloading] = useState<number | null>(null)
  async function download(id: number, name: string) {
    setDownloading(id)
    try {
      const path = student ? "student-portal/assignments" : "assignments"
      const response = await axiosInstance.get<Blob>(
        `performance-mod/${path}/${assignmentId}/attachments/${id}`,
        { responseType: "blob" }
      )
      const url = URL.createObjectURL(response.data)
      const link = document.createElement("a")
      link.href = url
      link.download = name
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) {
      let message = "Could not download this attachment. Please try again."
      if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
        try {
          message =
            JSON.parse(await error.response.data.text()).detail || message
        } catch {
          /* Keep the actionable fallback. */
        }
      }
      notifier.error(message)
    } finally {
      setDownloading(null)
    }
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{data?.title ?? "Assignment details"}</DialogTitle>
          <DialogDescription>
            Task instructions and resources from your teacher.
          </DialogDescription>
        </DialogHeader>
        <QueryState
          isLoading={query.isLoading}
          error={query.error}
          onRetry={query.refetch}
        >
          {data && (
            <div className="space-y-5">
              {studentQuery.currentData && (
                <p className="text-sm text-muted-foreground">
                  {studentQuery.currentData.subjectCode} ·{" "}
                  {studentQuery.currentData.subjectName}
                  <br />
                  Teacher: {studentQuery.currentData.teacherName}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Assigned {data.assignedDate} ·{" "}
                {data.dueDate ? `Due ${data.dueDate}` : "No due date"}
              </p>
              <section aria-label="Task instructions">
                <AssignmentDescription value={data.description} />
              </section>
              <section
                className="space-y-2"
                aria-label="Assignment attachments"
              >
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <Paperclip className="size-4" aria-hidden />
                  Attachments
                </h2>
                {data.attachments.length ? (
                  data.attachments.map((file) => (
                    <Button
                      key={file.id}
                      variant="outline"
                      className="h-auto w-full justify-start py-2 text-left whitespace-normal"
                      onClick={() => download(file.id, file.name)}
                      disabled={downloading !== null}
                    >
                      <Download className="size-4 shrink-0" aria-hidden />
                      <span className="min-w-0 break-all">
                        {file.name}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {Math.max(1, Math.round(file.size / 1024))} KB
                        </span>
                      </span>
                    </Button>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No attachments.
                  </p>
                )}
              </section>
              {studentQuery.currentData && (
                <section className="space-y-2">
                  <h2 className="text-sm font-semibold">Teacher evaluation</h2>
                  <Badge variant="secondary">
                    {studentQuery.currentData.status
                      ? ASSIGNMENT_LABELS[studentQuery.currentData.status]
                      : "Not recorded"}
                  </Badge>
                  {studentQuery.currentData.remarks && (
                    <p className="text-sm whitespace-pre-wrap">
                      {studentQuery.currentData.remarks}
                    </p>
                  )}
                </section>
              )}
            </div>
          )}
        </QueryState>
      </DialogContent>
    </Dialog>
  )
}
