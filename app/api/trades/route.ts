import { PrismaClient, TradeStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

// Use singleton pattern to prevent connection issues
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    // Add input validation including userId
    if (!data.ticker || !data.strategy || !data.positionType || !data.entryDate || !data.entryPrice || !data.userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const trade = await prisma.tradeEntry.create({
      data: {
        userId: data.userId,        // Add this required field
        ticker: data.ticker,
        strategy: data.strategy,
        positionType: data.positionType,
        status: TradeStatus.OPEN,
        entryDate: new Date(data.entryDate),
        entryPrice: parseFloat(data.entryPrice),
        maxRisk: data.maxRisk ? parseFloat(data.maxRisk) : null,
        notes: data.notes || null,
      },
    });

    return NextResponse.json(trade, { status: 201 });
  } catch (error) {
    console.error('Error creating trade:', error);
    return NextResponse.json({ error: 'Failed to create trade' }, { status: 500 });
  }
}
