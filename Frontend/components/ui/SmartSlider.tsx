'use client';

import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface SmartSliderProps {
    value: number;
    max: number;
    min: number;
    onChange: (value: number) => void;
    isLoading?: boolean;
}

export function SmartSlider({ value, max, min, onChange, isLoading }: SmartSliderProps) {
    return (
        <div className="relative w-full touch-none select-none flex items-center py-4">
            <SliderPrimitive.Root
                className="relative flex w-full touch-none select-none items-center"
                value={[value]}
                max={max}
                min={min}
                step={1}
                onValueChange={(vals) => onChange(vals[0])}
                disabled={isLoading}
            >
                <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-slate-800">
                    <SliderPrimitive.Range className="absolute h-full bg-cyan-500/30" />
                </SliderPrimitive.Track>
                <SliderPrimitive.Thumb
                    className={cn(
                        "block h-6 w-6 rounded-full border-2 border-cyan-400 bg-slate-950 ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:scale-110 cursor-grab active:cursor-grabbing shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                    )}
                >
                    <motion.div
                        className="absolute -top-10 left-1/2 -translate-x-1/2 bg-cyan-500 text-slate-950 text-xs font-bold px-2 py-1 rounded w-max"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        ${value.toFixed(0)}
                    </motion.div>
                </SliderPrimitive.Thumb>
            </SliderPrimitive.Root>
        </div>
    );
}
