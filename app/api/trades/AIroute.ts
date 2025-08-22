import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const prisma = new PrismaClient();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const trade = await prisma.tradeEntry.findUnique({
      where: { id: params.id }
    });

    if (!trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert options trader providing brief analysis of trades."
        },
        {
          role: "user",
          content: `Analyze this trade: ${trade.ticker} ${trade.positionType} at $${trade.entryPrice} on ${trade.entryDate}. Strategy: ${trade.strategy || 'Not specified'}. Notes: ${trade.notes || 'None'}.`
        }
      ],
      max_tokens: 200
    });

    return NextResponse.json({ 
      analysis: completion.choices[0].message.content 
    });
  } catch (error) {
    console.error('AI Analysis error:', error);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}