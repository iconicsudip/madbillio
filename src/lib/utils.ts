import * as React from "react"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Base UI's `nativeButton` defaults to true (it assumes its `render` target is
 * a real <button>). When `render` swaps in a non-button element (next/link, a
 * styled div, etc.) it must be told, or it warns and drops keyboard/ARIA shims.
 * Only trust `render` as a native button when it's a literal <button> tag —
 * anything else (including our own `Button` component) defaults to false,
 * which is the safe fallback Base UI recommends.
 */
export function resolveNativeButton(render: unknown, nativeButton?: boolean) {
  return (
    nativeButton ??
    (!render || (React.isValidElement(render) && render.type === "button"))
  )
}
