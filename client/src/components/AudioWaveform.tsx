import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface AudioWaveformProps {
  isRecording: boolean;
  className?: string;
}

export function AudioWaveform({ isRecording, className = "" }: AudioWaveformProps) {
  const [bars, setBars] = useState<number[]>(() => Array(20).fill(0.2));
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (isRecording) {
      const animate = () => {
        setBars(prev => 
          prev.map(() => 0.2 + Math.random() * 0.8)
        );
        animationRef.current = requestAnimationFrame(animate);
      };
      
      // 少し遅延を入れてアニメーションを滑らかに
      const interval = setInterval(() => {
        setBars(prev => 
          prev.map(() => 0.2 + Math.random() * 0.8)
        );
      }, 100);

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        clearInterval(interval);
      };
    } else {
      setBars(Array(20).fill(0.2));
    }
  }, [isRecording]);

  return (
    <div className={`flex items-center justify-center gap-1 h-16 ${className}`}>
      {bars.map((height, index) => (
        <motion.div
          key={index}
          className="w-1.5 bg-gradient-to-t from-amber-500 to-orange-400 rounded-full"
          animate={{ 
            height: isRecording ? `${height * 100}%` : "20%",
            opacity: isRecording ? 1 : 0.5
          }}
          transition={{ 
            duration: 0.1,
            ease: "easeOut"
          }}
        />
      ))}
    </div>
  );
}

// 録音中のパルスアニメーション
export function RecordingPulse({ isRecording }: { isRecording: boolean }) {
  if (!isRecording) return null;

  return (
    <div className="relative">
      <motion.div
        className="absolute inset-0 rounded-full bg-red-500"
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.5, 0, 0.5],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <div className="w-4 h-4 rounded-full bg-red-500" />
    </div>
  );
}

// 録音タイマー表示
export function RecordingTimer({ 
  elapsed, 
  remaining, 
  maxDuration 
}: { 
  elapsed: number; 
  remaining: number; 
  maxDuration: number;
}) {
  const progress = (elapsed / maxDuration) * 100;
  const isNearEnd = remaining <= 10;

  return (
    <div className="w-full max-w-xs mx-auto">
      <div className="flex justify-between text-sm mb-2">
        <span className="text-muted-foreground">経過時間</span>
        <motion.span 
          className={isNearEnd ? "text-red-500 font-bold" : "font-medium"}
          animate={isNearEnd ? { scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 0.5, repeat: isNearEnd ? Infinity : 0 }}
        >
          {formatTime(elapsed)} / {formatTime(maxDuration)}
        </motion.span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${isNearEnd ? "bg-red-500" : "bg-gradient-to-r from-amber-500 to-orange-500"}`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      {isNearEnd && (
        <motion.p
          className="text-red-500 text-sm text-center mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          残り{remaining}秒
        </motion.p>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
