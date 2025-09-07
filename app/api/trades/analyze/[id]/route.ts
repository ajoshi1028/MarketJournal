import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log('🔍 Starting AI analysis for trade ID:', params.id);

    const trade = await prisma.tradeEntry.findUnique({
      where: { id: params.id }
    });

    if (!trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }

    // MOCK AI ANALYSIS (works without OpenAI credits)
    const mockAnalysis = `AI Analysis for ${trade.ticker}: This ${trade.positionType.toLowerCase()} position at $${trade.entryPrice} ${trade.strategy ? `using ${trade.strategy}` : ''} shows potential. Entry timing appears ${Math.random() > 0.5 ? 'favorable' : 'moderate'} based on current market conditions. ${trade.maxRisk ? `Risk management with $${trade.maxRisk} max risk is well-defined.` : 'Consider setting clear risk parameters.'} Monitor for ${trade.positionType === 'LONG' ? 'bullish momentum' : 'bearish signals'}.`;

    await prisma.tradeEntry.update({
      where: { id: params.id },
      data: {
        aiCommentary: mockAnalysis
      }
    });

    return NextResponse.json({ analysis: mockAnalysis });

  } catch (error) {
    console.error('❌ AI Analysis error:', error);
    return NextResponse.json({ 
      error: `Analysis failed: ${String(error)}` 
    }, { status: 500 });
  }
}