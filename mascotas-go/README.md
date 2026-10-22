# Mascotas Go

Juego de exploración y colección al estilo Pokémon GO para descubrir, fotografiar y registrar perros y gatos en tu ciudad, con mapa 3D e IA de Gemini.

**App:** https://mascotas-go.ai.studio/

## Stack

- **Frontend:** React 19 + Vite + TypeScript, Tailwind CSS 4, iconos Lucide
- **Servidor:** Express (`server.ts`) — la clave de Gemini vive del lado del servidor, nunca en el cliente
- **Mapa:** MapLibre GL + react-map-gl
- **Datos y autenticación:** Firebase Authentication + Supabase (datos; migración en curso), Drizzle ORM
- **IA:** `@google/genai` (Gemini) para el reconocimiento de mascotas

## Cómo correr en local

Requisitos: Node.js 20 o superior.

1. Instala dependencias: `npm install`
2. Crea el archivo `.env.local` con tu clave: `GEMINI_API_KEY=...` (las claves van en variables de entorno, **nunca** en el código ni en el repo)
3. Arranca: `npm run dev`

## Tests

- `npm test` — suites de seguridad y aislamiento por cuenta, autorización HTTP, integridad de respaldos y preparación de Supabase
- `npm run lint` — chequeo de tipos con TypeScript (`tsc --noEmit`)

## Estructura

- `src/` — aplicación React (components, context, services, server, db, lib, types)
- `server.ts` — servidor Express y endpoints
- `supabase/` — esquema SQL y políticas de seguridad (RLS)
- `tests/` — suites de seguridad, autorización y respaldo
- `scripts/` — utilidades: verificación de conexión a Supabase y respaldo lógico

## Estado del proyecto

Migración de datos a Supabase en curso, manteniendo Firebase Authentication. Los datos de cada cuenta están aislados por usuario y se sincronizan con el servidor.
