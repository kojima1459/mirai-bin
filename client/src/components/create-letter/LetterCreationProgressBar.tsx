import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type LetterCreationStep = "template" | "recording" | "transcribing" | "transcript-edit" | "generating" | "editing" | "encrypting" | "complete";

interface LetterCreationProgressBarProps {
    currentStep: LetterCreationStep;
}

export function LetterCreationProgressBar({ currentStep }: LetterCreationProgressBarProps) {
    const steps = [
        { id: "template", label: "Theme" },
        { id: "recording", label: "Message" },
        { id: "editing", label: "Settings" },
        { id: "complete", label: "Seal" },
    ];

    // Steps map for progress calculation
    const stepProgressMap: Record<LetterCreationStep, number> = {
        "template": 0,
        "recording": 33,
        "transcribing": 50,
        "transcript-edit": 50,
        "generating": 60,
        "editing": 66,
        "encrypting": 85,
        "complete": 100
    };

    const progress = stepProgressMap[currentStep];

    const getStepStatus = (stepId: string) => {
        // Current active step group
        const isCurrent = currentStep === stepId ||
            (currentStep === "transcribing" && stepId === "recording") ||
            (currentStep === "transcript-edit" && stepId === "recording") ||
            (currentStep === "generating" && stepId === "recording") ||
            (currentStep === "encrypting" && stepId === "editing");

        // Completed step
        const stepOrder = ["template", "recording", "editing", "complete"];
        const currentOrder = stepOrder.indexOf(
            currentStep === "transcribing" || currentStep === "transcript-edit" || currentStep === "generating" ? "recording" :
                currentStep === "encrypting" ? "editing" :
                    currentStep
        );
        const thisOrder = stepOrder.indexOf(stepId);
        const isCompleted = currentOrder > thisOrder;

        return { isCurrent, isCompleted };
    };

    return (
        <div className="w-full max-w-md mx-auto mb-10">
            <div className="relative">
                {/* Background Bar */}
                <div className="absolute top-1/2 left-0 w-full h-1 bg-white/10 -translate-y-1/2 rounded-full" />

                {/* Active Progress Bar */}
                <motion.div
                    className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full -translate-y-1/2"
                    initial={{ width: "0%" }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                />

                {/* Steps */}
                <div className="relative flex justify-between">
                    {steps.map((step) => {
                        const { isCurrent, isCompleted } = getStepStatus(step.id);
                        return (
                            <div key={step.id} className="flex flex-col items-center gap-2">
                                <motion.div
                                    className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 z-10",
                                        isCompleted
                                            ? "bg-purple-500 border-purple-500 text-white"
                                            : isCurrent
                                                ? "bg-[#050505] border-white text-white shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                                                : "bg-[#050505] border-white/10 text-white/30"
                                    )}
                                    animate={{
                                        scale: isCurrent ? 1.1 : 1,
                                    }}
                                >
                                    {isCompleted ? <Check className="w-4 h-4" /> : steps.indexOf(step) + 1}
                                </motion.div>
                                <span className={cn(
                                    "text-[10px] font-medium tracking-wide uppercase transition-colors duration-300 absolute -bottom-6",
                                    isCurrent ? "text-white" : "text-white/30"
                                )}>
                                    {step.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
