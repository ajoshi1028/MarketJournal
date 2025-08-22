import { PrismaClient, TradeStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';


const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'demo-user';
    const trades = await prisma.tradeEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(trades);
  } catch (error) {
    console.error('Error fetching trades:', error);
    return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const userId = req.headers.get('x-user-id') || data.userId || 'demo-user';

    if (!data.ticker || !data.positionType || !data.entryDate || !data.entryPrice) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const trade = await prisma.tradeEntry.create({
      data: {
        userId,
        ticker: data.ticker,
        strategy: data.strategy || null,
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
