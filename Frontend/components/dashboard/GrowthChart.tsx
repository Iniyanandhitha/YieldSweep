'use client';

import * as React from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface GrowthChartProps {
    currentBalance: number;
    monthlyRate?: number; // Monthly rate (e.g., 0.01208 for 1.208% monthly)
}

export function GrowthChart({ currentBalance, monthlyRate = 0 }: GrowthChartProps) {
    // Use sample balance if current balance is 0 to show chart preview
    const displayBalance = currentBalance > 0 ? currentBalance : 1000;
    const isPreview = currentBalance === 0;
    
    // Generate forecast data for 90 days
    const data = React.useMemo(() => {
        const days = 90;
        const dailyRate = monthlyRate / 30; // Convert monthly to daily
        return Array.from({ length: days }).map((_, i) => {
            const balance = displayBalance * Math.pow(1 + dailyRate, i);
            return {
                day: i + 1,
                dayLabel: `Day ${i + 1}`,
                balance: Number(balance.toFixed(2)) || 0,
                profit: Number((balance - displayBalance).toFixed(2)) || 0,
            };
        });
    }, [displayBalance, monthlyRate]);

    const annualAPY = monthlyRate * 12 * 100;

    return (
        <Card className="glass border-purple-500/20 shadow-2xl backdrop-blur-xl overflow-hidden">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold gradient-text">Growth Forecast</CardTitle>
                <CardDescription className="text-xs text-slate-400">
                    Projected 90-day earnings at {annualAPY.toFixed(1)}% APY
                    {isPreview && <span className="ml-2 px-2 py-0.5 bg-slate-700/50 text-slate-300 rounded text-[10px]">Sample Preview</span>}
                </CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
                <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#A78BFA" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#A78BFA" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} stroke="rgba(147,51,234,0.1)" strokeDasharray="3 3" />
                            <XAxis
                                dataKey="day"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                tick={{ fill: '#64748b', fontSize: 10 }}
                                interval={14}
                            />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                tick={{ fill: '#64748b', fontSize: 10 }}
                                domain={['dataMin', 'auto']}
                                tickFormatter={(value) => value.toFixed(0)}
                            />
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                            <div className="glass p-3 rounded-lg border border-purple-500/30 shadow-xl">
                                                <p className="text-xs text-slate-400 mb-1">{data.dayLabel}</p>
                                                <p className="text-sm font-bold text-purple-400">
                                                    {data.balance.toFixed(2)} XLM
                                                </p>
                                                <p className="text-xs text-emerald-400">
                                                    +{data.profit.toFixed(2)} profit
                                                </p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="balance"
                                stroke="#A78BFA"
                                strokeWidth={2}
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
