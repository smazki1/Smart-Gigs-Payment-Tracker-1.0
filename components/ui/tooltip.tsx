import * as React from "react"

const TooltipProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>
const Tooltip = ({ children }: { children: React.ReactNode }) => <>{children}</>
const TooltipTrigger = ({ children }: { children: React.ReactNode }) => <>{children}</>
const TooltipContent = ({ children }: { children: React.ReactNode }) => <div className="hidden">{children}</div>

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
