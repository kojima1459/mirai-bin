import { motion } from "framer-motion";
import { ReactNode } from "react";
import { useLocation } from "wouter";

interface PageTransitionProps {
    children: ReactNode;
    className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
    const [location] = useLocation();

    return (
        <motion.div
            key={location}
            initial={{ opacity: 0, y: 15, filter: "blur(5px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -15, filter: "blur(5px)" }}
            transition={{
                duration: 0.4,
                ease: [0.22, 1, 0.36, 1], // Custom easy-out/in curve for premium feel
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
}
