
import React from "react";

export function RecordingTimer({ elapsed, remaining, maxDuration }: { elapsed: number; remaining: number; maxDuration: number }) {
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    return (
        <div className="text-center font-mono text-4xl font-bold tracking-widest text-white">
            {formatTime(elapsed)}
            <span className="text-sm text-white/30 ml-2 font-sans font-normal tracking-normal">
                / {formatTime(maxDuration)}
            </span>
        </div>
    );
}
