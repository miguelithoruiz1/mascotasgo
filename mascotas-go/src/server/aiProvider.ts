/**
 * MASCOTAS GO — Arquitectura de Visión Desacoplada e Inteligencia Artificial
 * 
 * Regla de Oro Arquitectónica:
 * - NO presentar un motor heurístico como equivalente a un modelo de IA.
 * - Los modelos de IA (Gemini, OpenAI Vision, Ollama, Groq) implementan 'AIModelProvider' (isAIModel: true).
 * - El clasificador local basado en reglas implementa 'RuleBasedFallbackClassifier' (isAIModel: false)
 *   y solo se activa como mecanismo de contingencia offline o por saturación de cuota.
 */

import { IdentificationResult } from '../types/index.ts';

export type AnalysisSource = 'ai_model' | 'rule_based_fallback';

export interface EnhancedIdentificationResult extends IdentificationResult {
  _analysisSource: AnalysisSource;
  _providerName: string;
}

/**
 * Contrato estricto para modelos de Inteligencia Artificial reales (LLMs / Vision Models).
 */
export interface AIModelProvider {
  readonly id: string;
  readonly name: string;
  readonly isAIModel: true;
  isAvailable(): boolean;
  analyze(imageBase64: string, isLiveScan: boolean): Promise<IdentificationResult>;
}

/**
 * Contrato para motores de contingencia basados en reglas y taxonomía predefinida (NO IA).
 */
export interface RuleBasedFallbackClassifier {
  readonly id: string;
  readonly name: string;
  readonly isAIModel: false;
  classify(imageBase64: string, isLiveScan: boolean): IdentificationResult;
}

// ----------------------------------------------------------------------------
// 1. Clasificador Local Basado en Reglas (Mecanismo de Contingencia Offline)
// ----------------------------------------------------------------------------
export class LocalRuleBasedFallback implements RuleBasedFallbackClassifier {
  readonly id = 'local_rule_based_fallback';
  readonly name = 'Fallback Heurístico Local Basado en Catálogo (Sin IA)';
  readonly isAIModel = false as const;

  classify(imageBase64: string, isLiveScan: boolean): IdentificationResult {
    let pureBase64 = imageBase64;
    if (imageBase64.includes(';base64,')) {
      pureBase64 = imageBase64.split(';base64,')[1] || imageBase64;
    }

    const hash = pureBase64
      .slice(0, 100)
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);

    const isDog = hash % 2 === 0;

    if (isLiveScan) {
      return {
        has_pet: true,
        species: isDog ? 'perro' : 'gato',
        breed: isDog ? 'Lomito de Compañía' : 'Michi Doméstico',
        rejection_reason: null,
      };
    }

    const dogProfiles = [
      {
        breed: 'Golden Retriever',
        name: 'Lomito Sol',
        color: 'Dorado brillante',
        mood: 'Súper amigable, moviendo la cola sin parar',
        rarity: 'Común' as const,
        cuteScore: 97,
        xp: 135,
        desc: 'Un alegre Golden Retriever lleno de vitalidad.',
        funFact: 'Los Golden Retriever tienen una de las mordidas más suaves del mundo canino.',
      },
      {
        breed: 'Pastor Alemán',
        name: 'Compañero Rex',
        color: 'Negro y fuego manto clásico',
        mood: 'Atento, leal y guardián del vecindario',
        rarity: 'Raro' as const,
        cuteScore: 95,
        xp: 165,
        desc: 'Un ejemplar noble y protector que observa cada rincón con gran inteligencia.',
        funFact: 'Los Pastores Alemanes aprenden comandos con una rapidez asombrosa.',
      },
      {
        breed: 'Bulldog Francés',
        name: 'Orejas de Murciélago',
        color: 'Abigarrado con pechera blanca',
        mood: 'Divertido, algo perezoso pero encantador',
        rarity: 'Raro' as const,
        cuteScore: 99,
        xp: 180,
        desc: 'Un pequeño boliche de cariño con orejitas icónicas y ronquidos simpáticos.',
        funFact: 'A pesar de su apariencia robusta, los bulldogs franceses requieren cuidado con el calor.',
      },
    ];

    const catProfiles = [
      {
        breed: 'Siamés Elegante',
        name: 'Michi Zafiro',
        color: 'Crema con puntas color chocolate y ojos zafiro',
        mood: 'Vocal, afectuoso y muy observador',
        rarity: 'Raro' as const,
        cuteScore: 98,
        xp: 175,
        desc: 'Un felino aristocrático que se comunica con suaves maullidos melódicos.',
        funFact: 'Los gatitos siameses nacen blancos y sus extremidades se oscurecen gradualmente.',
      },
      {
        breed: 'Maine Coon Majestuoso',
        name: 'Rey León',
        color: 'Pardo atigrado con abundante melena',
        mood: 'Gigante bonachón, tranquilo y muy cariñoso',
        rarity: 'Épico' as const,
        cuteScore: 99,
        xp: 230,
        desc: 'Un gato de gran porte con orejas de lince y cola esponjosa como un plumero.',
        funFact: 'El Maine Coon es una de las razas de gato doméstico más grandes y nobles.',
      },
    ];

    if (isDog) {
      const p = dogProfiles[hash % dogProfiles.length];
      return {
        has_pet: true,
        species: 'perro',
        name_suggestion: p.name,
        breed: p.breed,
        color: p.color,
        mood: p.mood,
        rarity: p.rarity,
        cute_score: p.cuteScore,
        xp_reward: p.xp,
        description: p.desc,
        fun_fact: p.funFact,
        rejection_reason: null,
      };
    } else {
      const p = catProfiles[hash % catProfiles.length];
      return {
        has_pet: true,
        species: 'gato',
        name_suggestion: p.name,
        breed: p.breed,
        color: p.color,
        mood: p.mood,
        rarity: p.rarity,
        cute_score: p.cuteScore,
        xp_reward: p.xp,
        description: p.desc,
        fun_fact: p.funFact,
        rejection_reason: null,
      };
    }
  }
}

// ----------------------------------------------------------------------------
// 2. Proveedor de IA Remota Compatible con OpenAI / Vision API Estándar
// ----------------------------------------------------------------------------
export class OpenAIVisionProvider implements AIModelProvider {
  readonly id = 'openai_compatible_vision';
  readonly name = 'OpenAI Compatible Vision Model';
  readonly isAIModel = true as const;

  isAvailable(): boolean {
    const key = process.env.AI_VISION_API_KEY;
    const endpoint = process.env.AI_VISION_ENDPOINT;
    return Boolean(key && endpoint && key !== 'tu-clave-de-ia-opcional');
  }

  async analyze(imageBase64: string, isLiveScan: boolean): Promise<IdentificationResult> {
    const apiKey = process.env.AI_VISION_API_KEY;
    const endpoint = process.env.AI_VISION_ENDPOINT || 'https://api.openai.com/v1/chat/completions';
    const model = process.env.AI_VISION_MODEL || 'gpt-4o-mini';

    const promptText = isLiveScan
      ? `Eres el escáner de visión en tiempo real para el juego de realidad aumentada "Mascotas Go".
Analiza este fotograma y responde ÚNICAMENTE este JSON:
{"has_pet": boolean, "species": "perro" | "gato" | "otro", "breed": string}`
      : `Eres el verificador de la Petdex en el videojuego de realidad aumentada "Mascotas Go".
Analiza la foto tomada con la cámara y clasifícala estrictamente:
1. Solo se aceptan PERROS y GATOS.
2. Si no es perro o gato, responde has_pet: false, species: "otro", rejection_reason: "motivo".
3. Si es perro o gato, responde:
{"has_pet": true, "species": "perro"|"gato", "name_suggestion": string, "breed": string, "color": string, "mood": string, "rarity": "Común"|"Raro"|"Épico"|"Legendario", "cute_score": number, "xp_reward": number, "description": string, "fun_fact": string, "rejection_reason": null}`;

    const imageUrl = imageBase64.startsWith('data:') 
      ? imageBase64 
      : `data:image/jpeg;base64,${imageBase64}`;

    const response = await fetch(endpoint, {
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
        response_format: { type: 'json_object' },
        max_tokens: isLiveScan ? 120 : 600,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI Vision Provider HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Respuesta vacía del proveedor de IA');
    }

    return JSON.parse(content) as IdentificationResult;
  }
}

// ----------------------------------------------------------------------------
// 3. Orquestador Agnóstico de Visión (PetVisionOrchestrator)
// ----------------------------------------------------------------------------
export class PetVisionOrchestrator {
  private fallback: RuleBasedFallbackClassifier = new LocalRuleBasedFallback();
  private providers: AIModelProvider[] = [];

  constructor() {
    this.providers.push(new OpenAIVisionProvider());
  }

  public registerProvider(provider: AIModelProvider): void {
    this.providers.unshift(provider);
  }

  public async identifyPet(
    imageBase64: string,
    isLiveScan: boolean = false
  ): Promise<EnhancedIdentificationResult> {
    // 1. Probar cada proveedor de IA real configurado, en orden.
    // Antes solo se intentaba el primero y cualquier fallo caía directo
    // al catálogo, que inventaba una mascota. Eso ya no pasa en capturas.
    let lastError: unknown = null;
    for (const provider of this.providers) {
      if (!provider.isAvailable()) continue;
      try {
        const aiResult = await provider.analyze(imageBase64, isLiveScan);
        return {
          ...aiResult,
          _analysisSource: 'ai_model',
          _providerName: provider.name,
        };
      } catch (err) {
        lastError = err;
        console.warn(`[AI Vision] Error en proveedor "${provider.name}". Probando el siguiente:`, err);
      }
    }

    // 2. Sin IA disponible o con todos los proveedores fallando:
    // en una CAPTURA no se inventa ninguna mascota: se lanza el error
    // para que la ruta responda 500 y la app muestre el aviso + reintento.
    // El catálogo solo queda para el escaneo en vivo (vista previa, nunca
    // registra una mascota).
    if (!isLiveScan) {
      console.error('[AI Vision] Sin proveedor de IA disponible para la captura:', lastError);
      throw new Error(
        'La IA de identificación no está disponible en este momento. Inténtalo de nuevo.'
      );
    }

    const fallbackResult = this.fallback.classify(imageBase64, isLiveScan);
    return {
      ...fallbackResult,
      _analysisSource: 'rule_based_fallback',
      _providerName: this.fallback.name,
    };
  }
}

export const petVisionOrchestrator = new PetVisionOrchestrator();
