import * as React from "react"
import { cn } from "@/utils/cn"

function Skeleton({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={className}
            {...props}
        />
    )
}

export { Skeleton }
