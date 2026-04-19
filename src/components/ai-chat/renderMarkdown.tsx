import { createElement, type ReactNode } from "react"

/** Parse **bold**, *italic*, and `code` in plain text, return React elements */
export function renderInlineMarkdown(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return createElement("strong", { key: i }, part.slice(2, -2))
    }
    if (part.startsWith("*") && part.endsWith("*") && !part.startsWith("**")) {
      return createElement("em", { key: i }, part.slice(1, -1))
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return createElement("code", { key: i, className: "bg-black/5 px-1 rounded text-[0.85em]" }, part.slice(1, -1))
    }
    return part
  })
}
