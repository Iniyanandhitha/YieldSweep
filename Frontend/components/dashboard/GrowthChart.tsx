'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface GrowthChartProps {
    currentBalance: number;
    yieldRate: number; // Annual Percentage Yield (e.g., 0.05 for 5%)
}

export function GrowthChart({ currentBalance, yieldRate }: GrowthChartProps) {
    // Generate forecast data for 90 days
    const data = React.useMemo(() => {
        const days = 90;
        const dailyRate = yieldRate / 365;
        return Array.from({ length: days }).map((_, i) => {
            const balance = currentBalance * Math.pow(1 + dailyRate, i);
            return {
                day: `Day ${i + 1}`,
                balance: Number(balance.toFixed(2)),
                profit: Number((balance - currentBalance).toFixed(2)),
            };
        });
    }, [currentBalance, yieldRate]);

    return (
        <Card className="bg-slate-900/40 border-white/5 shadow-2xl backdrop-blur-xl">
            <CardHeader>
                <CardTitle className="text-white">Growth Forecast</CardTitle>
                <CardDescription className="text-slate-400">
                    Projected earnings over the next 90 days at {((yieldRate) * 100).toFixed(1)}% APY
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[250px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
                            <XAxis
                                dataKey="day"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={10}
                                tick={{ fill: '#94a3b8', fontSize: 12 }}
                                interval={14}
                            />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                tickMargin={10}
                                tick={{ fill: '#94a3b8', fontSize: 12 }}
                                domain={['dataMin', 'auto']}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                                itemStyle={{ color: '#fff' }}
                                labelStyle={{ color: '#94a3b8' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="balance"
                                stroke="#22d3ee"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorBalance)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

import * as React from 'react';
