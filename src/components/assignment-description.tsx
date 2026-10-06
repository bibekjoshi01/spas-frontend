import { Fragment, type ReactNode } from "react"
import type { AssignmentDocument } from "@/lib/api/domain"
import { ASSIGNMENT_CONTENT_STYLES } from "@/lib/utils/assignment"

export function AssignmentDescription({
  value,
}: {
  value: AssignmentDocument
}) {
  function render(node: AssignmentDocument, key: number): ReactNode {
    const children = node.content?.map(render)
    switch (node.type) {
      case "doc":
        return <Fragment key={key}>{children}</Fragment>
      case "text":
        return node.marks?.some((mark) => mark.type === "bold") ? (
          <strong key={key}>{node.text}</strong>
        ) : (
          <Fragment key={key}>{node.text}</Fragment>
        )
      case "paragraph":
        return <p key={key}>{children ?? <br />}</p>
      case "heading":
        return node.attrs?.level === 3 ? (
          <h3 key={key}>{children}</h3>
        ) : (
          <h2 key={key}>{children}</h2>
        )
      case "bulletList":
        return <ul key={key}>{children}</ul>
      case "orderedList":
        return (
          <ol key={key} start={node.attrs?.start ?? 1}>
            {children}
          </ol>
        )
      case "listItem":
        return <li key={key}>{children}</li>
      case "hardBreak":
        return <br key={key} />
      default:
        return null
    }
  }
  return (
    <div className={ASSIGNMENT_CONTENT_STYLES}>
      {value.type === "doc" ? (
        render(value, 0)
      ) : (
        <p className="text-muted-foreground">No task description provided.</p>
      )}
    </div>
  )
}
