"use client";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import type { MarketQuote, MarketCandle } from "@/lib/market-data";

export default function StockDetailPage() {
    const [quote, setQuote] = useState<MarketQuote | null>(null)
    const [candles, setCandles] = useState<MarketCandle[]>([])
    const [range, setRange] = useState("1D");
    const [loading, setLoading] = useState(true);

    const params = useParams();
    const symbol = params.symbol as string;

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            const [quoteRes, historyRes] = await Promise.all([
                fetch(`/api/market/quote/${symbol}`),
                fetch(`/api/market/history/${symbol}?range=${range}`)
            ]);
            const quoteData = await quoteRes.json();
            console.log("quote response:", quoteData);
            const historyData = await historyRes.json();
            setQuote(quoteData.quote);
            setCandles(historyData.candles);
            setLoading(false);
        }
        fetchData();
    }, [symbol, range]);
    

    if (loading) {
        return <div className="p-8 text-zinc-500">Loading...</div>
    }

    if (!quote) {
        return <div className="p-8 text-zinc-500"> Stock Not Found...</div>
    }

    const isPositive = quote.change >= 0;

    return (
        <div className="max-w-6xl mx-auto px-6 py-8 flex gap-8">

            {/* Left column — chart + stats */}
            <div className="flex-1">
                <h1 className="text-2xl font-bold">{quote.name}</h1>
                <p className="text-zinc-500 text-sm">{quote.symbol} · {quote.exchange}</p>

                <div className="mt-4">
                    <span className="text-4xl font-bold">${quote.price.toFixed(2)}</span>
                    <span className={`ml-3 text-lg ${isPositive ? "text-green-600" : "text-red-500"}`}>
                        {isPositive ? "+" : ""}{quote.change.toFixed(2)} ({quote.changePercent.toFixed(2)}%)
                    </span>
                </div>

                {/* Range selector */}
                <div className="flex gap-2 mt-6">
                    {["1D", "1W", "1M", "3M", "1Y"].map(r => (
                        <button key={r} onClick={() => setRange(r)}
                            className={`px-3 py-1 rounded text-sm font-medium ${range === r ? "bg-black text-white" : "text-zinc-500 hover:text-black"}`}>
                            {r}
                        </button>
                    ))}
                </div>

                {/* Chart placeholder */}
                <div className="mt-4 h-64 bg-zinc-100 rounded-lg flex items-center justify-center text-zinc-400">
                    Chart coming soon
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-4 gap-4 mt-6">
                    {[
                        { label: "Open", value: `$${quote.previousClose.toFixed(2)}` },
                        { label: "Change", value: `${quote.change.toFixed(2)}` },
                        { label: "Change %", value: `${quote.changePercent.toFixed(2)}%` },
                        { label: "Prev Close", value: `$${quote.previousClose.toFixed(2)}` },
                    ].map(stat => (
                        <div key={stat.label}>
                            <p className="text-xs text-zinc-500">{stat.label}</p>
                            <p className="font-medium">{stat.value}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right column — order panel placeholder */}
            <div className="w-80 border rounded-xl p-6">
                <p className="text-zinc-400 text-sm">Order panel coming soon</p>
            </div>

        </div>
    )
}