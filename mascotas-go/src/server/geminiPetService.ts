/**
 * MASCOTAS GO — Adaptador de Gemini desacoplado como AIModelProvider
 * 
 * Implementa el contrato 'AIModelProvider' y se registra en el orquestador agnóstico.
 * Si falla o no está disponible, el orquestador activa de forma transparente el
 * clasificador de contingencia basado en catálogo (sin falsear que sea un modelo de IA).
 */

import { GoogleGenAI } from '@google/genai';
import { IdentificationResult } from '../types/index.ts';
import {
  AIModelProvider,
  petVisionOrchestrator,
  EnhancedIdentificationResult,
} from './aiProvider.ts';

export class GeminiAIProvider implements AIModelProvider {
  readonly id = 'gemini_vision';
  readonly name = 'Google Gemini 3.8 Flash Vision';
  readonly isAIModel = true as const;

  private cachedAi: GoogleGenAI | null = null;
  private lastApiKey: string | undefined = undefined;
  private quotaCooldownUntil = 0;

  isAvailable(): boolean {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return false;
    }
    return Date.now() >= this.quotaCooldownUntil;
  }

  private getClient(): GoogleGenAI | null {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return null;

    if (!this.cachedAi || this.lastApiKey !== apiKey) {
      this.lastApiKey = apiKey;
      this.cachedAi = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
    return this.cachedAi;
  }

  async analyze(imageBase64: string, isLiveScan: boolean): Promise<IdentificationResult> {
    let mimeType = 'image/jpeg';
    let pureBase64 = imageBase64;

    if (imageBase64.includes(';base64,')) {
      const parts = imageBase64.split(';base64,');
      pureBase64 = parts[1];
      const match = parts[0].match(/data:(.*?)$/);
      if (match && match[1]) {
        mimeType = match[1];
      }
    }

    const ai = this.getClient();
    if (!ai) {
      throw new Error('Gemini API client no disponible o sin credenciales válidas');
    }

    const promptText = isLiveScan
      ? `Eres el escáner de visión en tiempo real para el juego de realidad aumentada "Mascotas Go".
Analiza este fotograma de cámara y detecta si en el encuadre se distingue un perro (canino) o un gato (felino).
Devuelve ÚNICAMENTE este JSON conciso:
{
  "has_pet": boolean,
  "species": "perro" | "gato" | "otro",
  "breed": string
}`
      : `Eres el verificador de la Petdex en el videojuego de realidad aumentada "Mascotas Go".
Analiza la foto tomada con la cámara y clasifícala estrictamente:

1. REGLA DE ESPECIE:
   - Solo se aceptan PERROS (caninos) y GATOS (felinos).
   - Si la imagen muestra un objeto inanimado, vehículo, comida, una persona sola, un edificio o un paisaje sin perro ni gato, responde con has_pet: false.

2. SI SE CONFIRMA UN PERRO O GATO:
   - has_pet: true
   - species: "perro" o "gato"
   - breed: Raza aproximada o "Mestizo adorable"
   - color: Color y patrón del pelaje
   - mood: Personalidad observada
   - name_suggestion: Un nombre simpático sugerido
   - rarity: "Común", "Raro", "Épico", o "Legendario"
   - cute_score: Entero entre 80 y 100
   - xp_reward: Entero entre 100 y 250
   - description: Frase simpática (1-2 oraciones) describiendo a la mascota
   - fun_fact: Un dato curioso verídico de esa especie
   - rejection_reason: null

3. SI NO ES UN PERRO NI UN GATO:
   - has_pet: false
   - species: "otro"
   - rejection_reason: Explica de forma amigable y simpática por qué no cuenta.

Devuelve EXCLUSIVAMENTE este JSON:
{
  "has_pet": boolean,
  "species": "perro" | "gato" | "otro",
  "name_suggestion": string,
  "breed": string,
  "color": string,
  "mood": string,
  "rarity": "Común" | "Raro" | "Épico" | "Legendario",
  "cute_score": number,
  "xp_reward": number,
  "description": string,
  "fun_fact": string,
  "rejection_reason": string | null
}`;

    const timeoutDurationMs = isLiveScan ? 8000 : 20000;
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('timeout')), timeoutDurationMs);
    });

    try {
      const callPromise = ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: pureBase64,
                },
              },
              {
                text: promptText,
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          maxOutputTokens: isLiveScan ? 100 : 800,
          temperature: isLiveScan ? 0.1 : 0.4,
        },
      });

      const response = await Promise.race([callPromise, timeoutPromise]);
      const text = response.text?.trim() || '';
      const parsed = JSON.parse(text) as IdentificationResult;

      if (isLiveScan && parsed && parsed.has_pet) {
        parsed.cute_score = parsed.cute_score ?? 94;
        parsed.rarity = parsed.rarity ?? 'Común';
        parsed.xp_reward = parsed.xp_reward ?? 125;
        parsed.mood = parsed.mood ?? 'Curioso y juguetón';
        parsed.name_suggestion =
          parsed.name_suggestion ??
          (parsed.species === 'gato' ? 'Michi Explorador' : 'Lomito Aventurero');
        parsed.color = parsed.color ?? 'Pelaje brillante';
        parsed.description =
          parsed.description ?? 'Una mascota descubierta en tiempo real con el radar.';
        parsed.fun_fact =
          parsed.fun_fact ?? 'Los animales de compañía perciben emociones y rutinas cotidianas.';
      }

      return parsed;
    } catch (err: unknown) {
      const errorStr = String(err);
      if (
        errorStr.includes('429') ||
        errorStr.includes('quota') ||
        errorStr.includes('RESOURCE_EXHAUSTED') ||
        errorStr.includes('rate-limit')
      ) {
        this.quotaCooldownUntil = Date.now() + 15 * 60 * 1000;
        console.log('[GeminiAIProvider] Límite de cuota alcanzado. Activando período de enfriamiento.');
      }
      throw err;
    }
  }
}

// Registrar Gemini en el orquestador desacoplado
export const geminiProvider = new GeminiAIProvider();
petVisionOrchestrator.registerProvider(geminiProvider);

/**
 * Función pública retrocompatible para server.ts
 */
export async function analyzePetImage(
  imageBase64: string,
  isLiveScan: boolean = false
): Promise<EnhancedIdentificationResult> {
  return petVisionOrchestrator.identifyPet(imageBase64, isLiveScan);
}
