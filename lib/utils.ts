import { type ClassValue, clsx } from "clsx"

// Lightweight merge that avoids requiring tailwind-merge during builds
function mergeTailwindClasses(...classes: string[]): string {
    // Basic dedupe: last occurrence wins by class name prefix before '-'
    // This is a simplified approach sufficient for our usage.
    const seen: Record<string, string> = {}
    for (const c of classes.join(" ").split(/\s+/).filter(Boolean)) {
        const key = c.split('-')[0]
        seen[key] = c
    }
    return Object.values(seen).join(' ')
}

export function cn(...inputs: ClassValue[]) {
        const base = clsx(inputs)
        return mergeTailwindClasses(base)
}
