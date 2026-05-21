import { NextRequest, NextResponse } from "next/server";
import { getMarketDataProvider } from "@/lib/market-data";
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized." }, { status: 401});
        }

        const user = await prisma.user.findUnique({
            where: { clerkId: userId },
            include: { account: { include : { positions: true } } }
        });

        if (!user || !user.account) {
            return NextResponse.json({ error: "User Not Found."}, { status: 404 });
        }

        const account = user.account;
        const cashBalance = account.cashBalance.toNumber();
        const buyingPower = account.buyingPower.toNumber();
        if (account.positions.length === 0) {
            return NextResponse.json({
                cashBalance: cashBalance,
                buyingPower: buyingPower,
                totalValue: cashBalance,
                positions: []
            });
        }

        const provider = getMarketDataProvider();

        // This is to get all the stocks' current prices that are in user's positions
        const quotes = await Promise.all(
            account.positions.map(p => provider.getQuote(p.symbol))
        );

        const enrichedPositions = account.positions.map((p, i) => {
            const quote = quotes[i];
            const shares = p.shares.toNumber();
            const avgCostBasis = p.avgCostBasis.toNumber();
            const currentPrice = quote.price;
            const currentValue = shares * currentPrice;
            const totalReturn = currentValue - (shares * avgCostBasis);
            const totalReturnPercent = Math.round((totalReturn / (shares * avgCostBasis)) * 10000) / 100;
        
            return { symbol: p.symbol, companyName: p.companyName, exchange: p.exchange, shares, avgCostBasis, currentPrice, currentValue, totalReturn, totalReturnPercent };
        });
        
        const totalPositionsValue = enrichedPositions.reduce((sum, p) => sum + p.currentValue, 0);
        const totalValue = totalPositionsValue + cashBalance;

        return NextResponse.json({
            cashBalance: cashBalance,
            buyingPower: buyingPower,
            totalValue: totalValue,
            positions: enrichedPositions
        });

    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Get Portfolio Failed. Please Try Again." }, { status: 500 });
    }
}