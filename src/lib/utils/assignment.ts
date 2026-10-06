import type { AssignmentDocument } from "@/lib/api/domain"

export const EMPTY_ASSIGNMENT_DESCRIPTION: AssignmentDocument = {
  type: "doc",
  content: [{ type: "paragraph" }],
}

export const ASSIGNMENT_CONTENT_STYLES =
  "break-words text-sm [&_p]:my-2 [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:normal-case [&_h3]:mt-3 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:normal-case [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1"
