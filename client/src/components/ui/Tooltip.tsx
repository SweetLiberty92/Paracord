import * as React from "react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";

interface TooltipProps {
    content: string;
    children: React.ReactNode;
    side?: "top" | "right" | "bottom" | "left";
    delay?: number;
    className?: string;
}

export function Tooltip({
    content,
    children,
    side = "top",
    delay = 0,
    className,
}: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const showTooltip = () => {
        timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
    };

    const hideTooltip = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsVisible(false);
    };

    const positions = {
        top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
        right: "left-full top-1/2 -translate-y-1/2 ml-2",
        bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
        left: "right-full top-1/2 -translate-y-1/2 mr-2",
    };

    return (
        <div
            className="relative flex items-center justify-center"
            onMouseEnter={showTooltip}
            onMouseLeave={hideTooltip}
            onFocus={showTooltip}
            onBlur={hideTooltip}
        >
            {children}
            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.1 }}
                        className={cn(
                            "absolute z-50 px-2.5 py-1.5 text-xs font-semibold text-text-primary bg-bg-floating rounded shadow-md whitespace-nowrap pointer-events-none",
                            positions[side],
                            className
                        )}
                        style={{
                            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                        }}
                    >
                        {content}
                        {/* Arrow */}
                        <div
                            className={cn(
                                "absolute w-2 h-2 bg-bg-floating rotate-45",
                                side === "top" && "bottom-[-4px] left-1/2 -translate-x-1/2",
                                side === "right" && "left-[-4px] top-1/2 -translate-y-1/2",
                                side === "bottom" && "top-[-4px] left-1/2 -translate-x-1/2",
                                side === "left" && "right-[-4px] top-1/2 -translate-y-1/2"
                            )}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
