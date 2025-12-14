import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
    {
        variants: {
            variant: {
                default:
                    "bg-white text-gray-900 border border-gray-200 shadow-sm hover:bg-gray-50 hover:border-gray-300 hover:shadow-md focus-visible:ring-amber-500",
                primary:
                    "bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-md hover:from-amber-700 hover:to-amber-800 hover:shadow-lg focus-visible:ring-amber-500",
                destructive:
                    "bg-red-600 text-white shadow-sm hover:bg-red-700 hover:shadow-md focus-visible:ring-red-500",
                outline:
                    "border-2 border-gray-300 bg-transparent text-gray-900 hover:bg-gray-100 hover:border-gray-400 focus-visible:ring-gray-400",
                secondary:
                    "bg-amber-50 text-amber-900 border border-amber-200 shadow-sm hover:bg-amber-100 hover:border-amber-300 focus-visible:ring-amber-400",
                ghost:
                    "bg-transparent text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-gray-400",
                link: "text-amber-700 underline-offset-4 hover:underline hover:text-amber-800 focus-visible:ring-amber-400 p-0 h-auto",
                success:
                    "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 hover:shadow-md focus-visible:ring-emerald-500",
            },
            size: {
                default: "h-10 px-4 py-2",
                sm: "h-8 px-3 text-xs rounded-md",
                lg: "h-12 px-6 text-base rounded-xl",
                xl: "h-14 px-8 text-lg rounded-xl",
                icon: "h-10 w-10 p-0",
                "icon-sm": "h-8 w-8 p-0 rounded-md",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
    loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                disabled={disabled || loading}
                {...props}
            >
                {loading ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="ml-1">Loading...</span>
                    </>
                ) : (
                    children
                )}
            </Comp>
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
