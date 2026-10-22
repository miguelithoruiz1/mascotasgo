/**
 * MASCOTAS GO — Privacy & Data Protection Utilities for SOS Community Radar
 * 
 * Reglas de privacidad y seguridad:
 * 1. Coordenadas aproximadas a ~110m (3 decimales) para vecindario, evitando Null Island (0,0).
 * 2. Teléfono enmascarado para visitantes no autenticados, normalizando prefijos y puntuación.
 * 3. Nombre de contacto privado reservado para miembros autenticados.
 * 4. Dirección particular: Ocultar números de departamento/interior y aclarar que la dirección exacta es privada.
 */

/**
 * Aproxima coordenadas GPS a 3 decimales (~110 metros de resolución de barrio).
 * Si la coordenada es nula, inválida o 0.000 (Null Island), retorna null de forma segura
 * para que el mapa y el cliente no dibujen marcadores erróneos en el Océano Atlántico.
 */
export function approximateCoordinate(coord: number | string | null | undefined): number | null {
  if (coord === null || coord === undefined) return null;
  const num = typeof coord === 'string' ? parseFloat(coord) : coord;
  if (isNaN(num) || !isFinite(num)) return null;
  // Prevenir proyección en Null Island (0, 0)
  if (Math.abs(num) < 0.0001) return null;
  return Math.round(num * 1000) / 1000;
}

/**
 * Enmascara un número telefónico para visualización pública no autenticada.
 * Normaliza prefijos (+57), espacios, guiones y paréntesis.
 * Si el formato no se puede normalizar con certeza (ej. < 7 dígitos o irregular),
 * devuelve un valor genérico seguro en vez de mostrar partes potencialmente identificables.
 */
export function maskPhoneNumber(phone?: string | null): string {
  if (!phone || !phone.trim()) return 'No registrado';
  
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');

  // Si no cuenta con una cantidad de dígitos estándar para una línea telefónica válida (7 a 15 dígitos)
  if (digits.length < 7 || digits.length > 15) {
    return 'Contacto protegido (inicia sesión)';
  }

  // Preservar código de país de hasta 2 dígitos o 2 dígitos iniciales, y 2 dígitos finales
  const prefix = hasPlus ? `+${digits.substring(0, 4)}` : digits.substring(0, 2);
  const suffix = digits.substring(digits.length - 2);

  return `${prefix} *** ${suffix}`;
}

/**
 * Sanitiza la dirección para visitantes anónimos.
 * NOTA TÉCNICA: El texto libre no puede garantizarse como 100% anónimo por regex;
 * esta función oculta números de puerta (# ***), departamento e interior, mientras que
 * la aplicación restringe la entrega de la dirección exacta completa a usuarios autenticados.
 */
export function maskAddressForPublic(address?: string | null): string {
  if (!address || !address.trim()) return 'Ubicación señalada en el mapa 3D';
  // Ocultar números de apartamento, interior, casa, torre, bloque, piso, local u oficina
  const masked = address.replace(
    /(\b(apto|apartamento|casa|int|interior|piso|bloque|torre|local|oficina)\s*[\w\d-]+).*$/i,
    '[Sector protegido]'
  ).replace(/#\s*\d+[-\w]*/g, '# ***');

  return masked.trim() || 'Ubicación señalada en el mapa 3D';
}
