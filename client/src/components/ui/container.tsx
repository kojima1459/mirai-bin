import * as React from "react"
import { cn } from "@/lib/utils"

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
    size?: "default" | "sm" | "lg" | "full"
}

const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
    ({ className, size = "default", ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "mx-auto px-6 w-full",
                    {
                        "max-w-[1120px]": size === "default",
                        "max-w-screen-md": size === "sm",
                        "max-w-screen-xl": size === "lg",
                        "max-w-full": size === "full",
                    },
                    className
                )}
                {...props}
            />
        )
    }
)
Container.displayName = "Container"

export { Container }
