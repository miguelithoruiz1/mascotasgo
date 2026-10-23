// Entrada serverless para Vercel.
//
// Vercel enruta todas las peticiones /api/* a esta función (ver el
// rewrite en ../vercel.json) y sirve los archivos estáticos de `dist`
// directamente, sin pasar por Express. Aquí solo creamos la app con el
// mismo createServerApp() que usa el servidor local:
// - server.ts detecta el entorno Vercel (process.env.VERCEL) y en ese
//   caso no monta ni el middleware de Vite ni los estáticos de `dist`.
// - Su `listen` solo corre en ejecución directa (npm run dev / start),
//   nunca al importarse, así que importar este módulo no abre puertos.
import { createServerApp } from '../server.ts';

const app = await createServerApp();

export default app;
