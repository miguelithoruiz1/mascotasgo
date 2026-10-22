/**
 * MASCOTAS GO — Proveedor FreeLLMAPI (gateway de IA propio) como AIModelProvider
 *
 * Implementa el mismo contrato 'AIModelProvider' que el proveedor de Gemini y se
 * registra en el orquestador agnóstico. FreeLLMAPI expone una API compatible con
 * OpenAI (POST /v1/chat/completions), así que la imagen viaja como parte
 * 'image_url' con data URI, en el formato estándar de visión de OpenAI.
 *
 * Se reutiliza EXACTAMENTE el mismo prompt de identificación y el mismo parseo
 * de resultado (JSON del modelo -> IdentificationResult) que usa Gemini.
 *
 * Activación por entorno: el proveedor solo está disponible si la variable
 * FREELLMAPI_API_KEY existe y no está vacía. Sin ella, el comportamiento actual
 * queda intacto (Gemini primero). Queda registrado con prioridad sobre Gemini
 * porque 'registerProvider' lo inserta al frente y 'isAvailable()' hace de
 * compuerta. Ante cualquier fallo (red, HTTP no-OK o parseo) lanza el error,
 * igual que el proveedor de Gemini, para que el orquestador active su respaldo.
 *
 * SEGURIDAD: estas variables son SOLO del servidor (Express). La clave del
 * gateway jamás debe exponerse al cliente ni usarse con prefijo VITE_.
 */

import { IdentificationResult } from '../types/index.ts';
import {
  AIModelProvider,
  petVisionOrchestrator,
} from './aiProvider.ts';

export class FreeLlmApiProvider implements AIModelProvider {
  readonly id = 'freellmapi_vision';
  readonly name = 'FreeLLMAPI Vision (gateway propio)';
  readonly isAIModel = true as const;

  isAvailable(): boolean {
    const apiKey = process.env.FREELLMAPI_API_KEY;
    return Boolean(apiKey && apiKey.trim() !== '');
  }

  async analyze(imageBase64: string, isLiveScan: boolean): Promise<IdentificationResult> {
    const apiKey = process.env.FREELLMAPI_API_KEY;
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('FreeLLMAPI no disponible: falta FREELLMAPI_API_KEY');
    }

    const baseUrl = (process.env.FREELLMAPI_BASE_URL || 'http://127.0.0.1:31415/v1').replace(/\/+$/, '');
    const model = process.env.FREELLMAPI_MODEL || 'google/gemma-4-31b-it';

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

    const imageUrl = `data:${mimeType};base64,${pureBase64}`;

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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutDurationMs);

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: promptText },
                { type: 'image_url', image_url: { url: imageUrl } },
              ],
            },
          ],
          temperature: isLiveScan ? 0.1 : 0.4,
          max_tokens: isLiveScan ? 100 : 800,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`FreeLLMAPI HTTP ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      let rawText = '';
      if (typeof content === 'string') {
        rawText = content;
      } else if (Array.isArray(content)) {
        rawText = content
          .map((part: { text?: string }) => (typeof part?.text === 'string' ? part.text : ''))
          .join('');
      }

      if (!rawText.trim()) {
        throw new Error('Respuesta vacía de FreeLLMAPI');
      }

      // Mismo enfoque de parseo que Gemini (JSON.parse del texto del modelo),
      // tolerando que un modelo abierto envuelva el JSON en marcas ```json.
      let text = rawText.trim();
      if (text.startsWith('```')) {
        text = text
          .replace(/^```[a-zA-Z]*\s*/, '')
          .replace(/```\s*$/, '')
          .trim();
      }

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
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

// Registrar FreeLLMAPI en el orquestador desacoplado (queda al frente de la
// lista; 'isAvailable()' garantiza que solo se use si hay clave configurada).
export const freeLlmApiProvider = new FreeLlmApiProvider();
petVisionOrchestrator.registerProvider(freeLlmApiProvider);
