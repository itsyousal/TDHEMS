import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all duration-200",
    {
        variants: {
            variant: {
                default:
                    "border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200",
                primary:
                    "border-amber-200 bg-amber-100 text-amber-800 hover:bg-amber-200",
                secondary:
                    "border-gray-300 bg-white text-gray-600 hover:bg-gray-50",
                success:
                    "border-emerald-200 bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
                warning:
                    "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
                destructive:
                    "border-red-200 bg-red-100 text-red-800 hover:bg-red-200",
                info:
                    "border-blue-200 bg-blue-100 text-blue-800 hover:bg-blue-200",
                outline:
                    "border-gray-300 bg-transparent text-gray-700 hover:bg-gray-100",
                ghost:
                    "border-transparent bg-transparent text-gray-600 hover:bg-gray-100",
            },
            size: {
                default: "px-2.5 py-0.5 text-xs",
                sm: "px-2 py-0.5 text-[10px]",
                lg: "px-3 py-1 text-sm",
            },
            animate: {
                none: "",
                pulse: "animate-pulse",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
            animate: "none",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
    dot?: boolean
}

function Badge({ className, variant, size, animate, dot, children, ...props }: BadgeProps) {
    return (
        <span className={cn(badgeVariants({ variant, size, animate }), className)} {...props}>
            {dot && (
                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
            )}
            {children}
        </span>
    )
}

export { Badge, badgeVariants }
