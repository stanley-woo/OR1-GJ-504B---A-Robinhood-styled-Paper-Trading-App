import { NextRequest, NextResponse } from "next/server";
import { getMarketDataProvider } from "@/lib/market-data";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest){
    const body = await req.json();
    const { symbol, type, shares } = body;

    try {
        const {userId } = await auth();
        
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { clerkId: userId },
            include: { account: true }
        });

        if (!user || !user.account) {
            return NextResponse.json({ error: "User Not Found." }, { status: 404 });
        }

        const account = user.account;

        const provider = getMarketDataProvider();
        const quote = await provider.getQuote(symbol);
        const amountNeeded = shares * quote.price;

        if (type === "BUY" && amountNeeded > account.buyingPower.toNumber()) {
            return NextResponse.json({ error: "Insufficient Buying Power." }, { status: 400 })
        }

        const existingPosition = await prisma.position.findUnique({
            where: { accountId_symbol: { accountId: account.id, symbol }}
        })

        if (type === "SELL") {
            if (!existingPosition) {
                return NextResponse.json({ error: "No position found for this symbol." }, { status: 400 })
            }
            if (existingPosition.shares.toNumber() < shares) {
                return NextResponse.json({ error: "Insufficient shares." }, { status: 400 })
            }
        }


        await prisma.$transaction(async (tx) => {
            if (type === "BUY") {
                const existingShares = existingPosition?.shares.toNumber() ?? 0;
                const exisitngAvg = existingPosition?.avgCostBasis.toNumber() ?? 0;
                const newShares = existingShares + shares;
                const newAveCostBasis = (existingShares * exisitngAvg + amountNeeded) / newShares;

                await tx.position.upsert({
                    where: { accountId_symbol: {accountId: account.id, symbol} },
                    create: { accountId: account.id, symbol, companyName: quote.name, exchange: quote.exchange, shares, avgCostBasis: newAveCostBasis},
                    update: { shares: newShares, avgCostBasis: newAveCostBasis}
                });

                await tx.brokerageAccount.update({
                    where: { id: account.id},
                    data: { buyingPower: { decrement: amountNeeded }, cashBalance: { decrement: amountNeeded}}
                });
            }
            else {
                const proceeds = shares * quote.price;
                const remainingShares = existingPosition!.shares.toNumber() - shares;

                if (remainingShares === 0) {
                    await tx.position.delete({ where: { accountId_symbol: { accountId: account.id, symbol } } })
                } else {
                    await tx.position.update({
                        where: { accountId_symbol: { accountId: account.id, symbol } },
                        data: { shares: remainingShares }
                    });
                }

                await tx.brokerageAccount.update({
                    where: { id: account.id },
                    data: { buyingPower: { increment: proceeds }, cashBalance: { increment: proceeds } }
                });
            }

            const totalAmount = type === "BUY" ? amountNeeded : shares * quote.price
            await tx.transaction.create({
                data: { type, symbol, companyName: quote.name, shares, pricePerShare: quote.price, totalAmount, accountId: account.id }
            })
        });

        return NextResponse.json({ success: true, type, symbol, shares, pricePerShare: quote.price, totalAmount: type === "BUY" ? amountNeeded : shares * quote.price });

    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Trade failed. Please try again." }, { status: 500 })
    }
}
