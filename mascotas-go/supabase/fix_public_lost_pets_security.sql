-- ==============================================================================
-- MASCOTAS GO — CORRECCIÓN DEFINITIVA DE SEGURIDAD PARA VISTA PÚBLICA (FASE 2D.6)
-- 
-- OBJETIVOS AUDITADOS:
-- 1. Resolver la alerta CRITICAL de Supabase: "Security Definer View".
-- 2. Habilitar 'security_invoker = true' (PostgreSQL 15+) para que la vista ejecute
--    bajo el contexto y políticas RLS del usuario que la consulta, no del propietario.
-- 3. Proteger la privacidad:
--    - 'contact_name': Ofuscado para evitar recolección de nombres reales.
--    - 'contact_phone': Enmascarado con asteriscos centrales.
--    - 'last_seen_lat' / 'last_seen_lng': Redondeados a ~110m (3 decimales) y retornando NULL
--      en vez de '0.000' para evitar la ubicación fantasma en el océano (Null Island).
--    - 'last_seen_address': Oculta números de puerta (# ***) e interiores ([Sector protegido]).
-- 4. Mantener estricta compatibilidad de columnas (orden, nombres y tipos exactos).
-- 5. Revocar SELECT a 'anon' en PostgREST y permitir solo a 'authenticated'.
-- 6. Operación 100% NO DESTRUCTIVA: NO usa DROP ... CASCADE, NO borra tablas ni datos.
-- ==============================================================================

-- PASO 1: Recrear la vista con 'security_invoker = true' y proyección segura
CREATE OR REPLACE VIEW public.public_lost_pets
WITH (security_invoker = true)
AS
SELECT
    id,
    species,
    pet_name,
    breed,
    color,
    photo_url,
    description,
    -- Protección de identidad: no exponer el nombre real completo a consultas públicas directas
    CASE 
        WHEN status = 'found' THEN 'Comunidad Mascotas GO'::text
        ELSE 'Propietario verificado'::text
    END AS contact_name,
    -- Teléfono con ofuscación reforzada
    CASE 
        WHEN length(contact_phone) >= 7 THEN
            substring(contact_phone from 1 for 4) || ' *** ' || substring(contact_phone from length(contact_phone) - 1 for 2)
        ELSE '***'::text
    END AS contact_phone,
    reward,
    -- Coordenadas robustas redondeadas a ~110m. Retorna NULL (no 0.000) si es inválida o cero
    CASE 
        WHEN last_seen_lat ~ '^[-+]?[0-9]*\.?[0-9]+$' AND abs(last_seen_lat::numeric) > 0.001 THEN
            round(last_seen_lat::numeric, 3)::text
        ELSE NULL::text
    END AS last_seen_lat,
    CASE 
        WHEN last_seen_lng ~ '^[-+]?[0-9]*\.?[0-9]+$' AND abs(last_seen_lng::numeric) > 0.001 THEN
            round(last_seen_lng::numeric, 3)::text
        ELSE NULL::text
    END AS last_seen_lng,
    -- Sanitización de dirección: enmascara número de puerta (# ***) y detalles de departamento/interior
    CASE 
        WHEN status = 'found' THEN 'Caso resuelto - Mascota rescatada'::text
        ELSE regexp_replace(
               regexp_replace(last_seen_address, '(\b(apto|apartamento|casa|int|interior|piso|bloque|torre|local)\s*[\w\d-]+).*$', '[Sector protegido]', 'i'),
               '#\s*\d+[-\w]*',
               '# ***'
             )::text
    END AS last_seen_address,
    status,
    created_at,
    true AS is_protected
FROM public.lost_pets;

-- PASO 2: Confirmar la opción de invoker en el catálogo relacional
ALTER VIEW public.public_lost_pets SET (security_invoker = true);

-- PASO 3: Gestión estricta de privilegios de acceso
-- Se revoca SELECT a 'anon' para que la vista no se exponga a scrapers por la API REST de PostgREST.
-- Los visitantes anónimos de la web consumen el radar a través de la API protegida del backend Express (/api/lost-pets).
REVOKE ALL ON public.public_lost_pets FROM PUBLIC;
REVOKE ALL ON public.public_lost_pets FROM anon;
GRANT SELECT ON public.public_lost_pets TO authenticated;

-- ==============================================================================
-- CONSULTAS DE VERIFICACIÓN POST-EJECUCIÓN (Ejecutar en SQL Editor de Supabase)
-- ==============================================================================

-- 1. Comprobar que 'security_invoker=true' está activo en el catálogo pg_class:
-- SELECT relname, reloptions 
-- FROM pg_class 
-- WHERE relname = 'public_lost_pets';
-- (Resultado esperado: reloptions = {security_invoker=true})

-- 2. Comprobar privilegios efectivos por rol:
-- SELECT grantee, privilege_type 
-- FROM information_schema.table_privileges 
-- WHERE table_name = 'public_lost_pets';
-- (Resultado esperado: 'authenticated' y 'postgres' con SELECT; 'anon' ausente)
