import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';

export interface TranscriptLine {
  sender: string;
  body: string;
}

export async function summarizeDiscussion(
  matkul: string,
  namaKelompok: string,
  lines: TranscriptLine[]
): Promise<string> {
  if (!config.anthropicApiKey) {
    throw new Error('ANTHROPIC_API_KEY belum di-set');
  }

  const client = new Anthropic({ apiKey: config.anthropicApiKey });

  const transcript = lines.map((l) => `${l.sender}: ${l.body}`).join('\n');

  const prompt = `Berikut potongan percakapan grup WhatsApp kelompok kuliah "${namaKelompok}" untuk matkul "${matkul}". Buat rangkuman singkat dalam Bahasa Indonesia dengan 3 bagian:
1. Keputusan yang sudah diambil
2. Action item (siapa mengerjakan apa, kalau disebut)
3. Hal yang masih perlu didiskusikan / belum jelas

Kalau salah satu bagian tidak ada isinya, tulis "- (tidak ada)". Jangan menambah informasi yang tidak ada di transkrip. Balas langsung dengan rangkumannya saja, tanpa basa-basi pembuka.

Transkrip:
${transcript}`;

  const response = await client.messages.create({
    model: config.anthropicModel,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  return textBlock && textBlock.type === 'text' ? textBlock.text.trim() : '(rangkuman kosong)';
}
