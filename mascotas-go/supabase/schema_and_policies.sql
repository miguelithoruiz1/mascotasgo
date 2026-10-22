-- ==============================================================================
-- MASCOTAS GO — ESQUEMA COMPLETO, RLS, TRIGGERS Y STORAGE PARA SUPABASE (FASE 2D.3)
-- 
-- GARANTÍAS DE ESTE SCRIPT:
-- 1. Idempotente: Ejecutable en proyectos Supabase nuevos o existentes sin fallar.
-- 2. Seguro: Habilita RLS estricto; los usuarios solo modifican sus propios datos.
-- 3. Privacidad SOS: La vista pública enmascara teléfonos y aproxima coordenadas.
-- 4. Integridad de Compañero: Triggers bidireccionales limpian el compañero si la mascota se borra o transfiere.
-- 5. Storage Aislado: Crea el bucket 'mascotas-media' (privado, máx 5MB) y previene sobrescrituras ajenas.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CREACIÓN / ACTUALIZACIÓN DE TABLAS (Esquema Drizzle Compatible)
-- ------------------------------------------------------------------------------

-- Tabla: public.users
CREATE TABLE IF NOT EXISTS public.users (
    id SERIAL PRIMARY KEY,
    uid TEXT NOT NULL UNIQUE,                  -- UUID generado por Supabase Auth (auth.users.id)
    email TEXT NOT NULL,
    name TEXT DEFAULT 'Entrenador',
    avatar TEXT DEFAULT '🧑‍🌾',
    active_buddy_pet_id TEXT DEFAULT NULL,     -- Mascota compañera activa
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migración aditiva segura por si la tabla ya existía sin la columna active_buddy_pet_id:
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'active_buddy_pet_id'
    ) THEN
        ALTER TABLE public.users ADD COLUMN active_buddy_pet_id TEXT DEFAULT NULL;
    END IF;
END $$;

-- Tabla: public.pets
CREATE TABLE IF NOT EXISTS public.pets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
    species TEXT NOT NULL,
    name TEXT NOT NULL,
    breed TEXT NOT NULL,
    color TEXT NOT NULL,
    mood TEXT NOT NULL,
    rarity TEXT NOT NULL,
    cute_score INTEGER NOT NULL,
    xp_reward INTEGER NOT NULL,
    description TEXT NOT NULL,
    fun_fact TEXT NOT NULL,
    photo_url TEXT NOT NULL,
    lat TEXT NOT NULL,
    lng TEXT NOT NULL,
    location_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Asegurar restricción de especie en pets
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_pets_species'
    ) THEN
        ALTER TABLE public.pets ADD CONSTRAINT chk_pets_species CHECK (species IN ('perro', 'gato'));
    END IF;
END $$;

-- Tabla: public.lost_pets
CREATE TABLE IF NOT EXISTS public.lost_pets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
    pet_name TEXT NOT NULL,
    species TEXT NOT NULL,
    breed TEXT NOT NULL,
    color TEXT NOT NULL,
    photo_url TEXT,
    description TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    reward TEXT,
    last_seen_lat TEXT NOT NULL,
    last_seen_lng TEXT NOT NULL,
    last_seen_address TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'lost',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Asegurar restricciones en lost_pets
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_lost_pets_species') THEN
        ALTER TABLE public.lost_pets ADD CONSTRAINT chk_lost_pets_species CHECK (species IN ('perro', 'gato'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_lost_pets_status') THEN
        ALTER TABLE public.lost_pets ADD CONSTRAINT chk_lost_pets_status CHECK (status IN ('lost', 'found'));
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. ÍNDICES DE RENDIMIENTO Y BÚSQUEDA
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_uid ON public.users(uid);
CREATE INDEX IF NOT EXISTS idx_pets_user_id ON public.pets(user_id);
CREATE INDEX IF NOT EXISTS idx_lost_pets_status ON public.lost_pets(status);
CREATE INDEX IF NOT EXISTS idx_lost_pets_user_id ON public.lost_pets(user_id);

-- ------------------------------------------------------------------------------
-- 3. TRIGGERS DE INTEGRIDAD DEL COMPAÑERO ACTIVO
-- ------------------------------------------------------------------------------

-- Regla A: Al asignar o actualizar el compañero activo, validar que pertenezca al usuario
CREATE OR REPLACE FUNCTION public.check_active_buddy_ownership()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.active_buddy_pet_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.pets
            WHERE id = NEW.active_buddy_pet_id
              AND user_id = NEW.uid
        ) THEN
            RAISE EXCEPTION 'active_buddy_pet_id (%) no existe o no pertenece al usuario (%)',
                NEW.active_buddy_pet_id, NEW.uid;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_active_buddy ON public.users;
CREATE TRIGGER trg_check_active_buddy
    BEFORE INSERT OR UPDATE OF active_buddy_pet_id ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.check_active_buddy_ownership();

-- Regla B: Al eliminar o cambiar de dueño una mascota, desvincularla automáticamente de active_buddy_pet_id
CREATE OR REPLACE FUNCTION public.handle_pet_buddy_maintenance()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        UPDATE public.users
        SET active_buddy_pet_id = NULL
        WHERE uid = OLD.user_id AND active_buddy_pet_id = OLD.id;
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.user_id IS DISTINCT FROM NEW.user_id) THEN
            UPDATE public.users
            SET active_buddy_pet_id = NULL
            WHERE uid = OLD.user_id AND active_buddy_pet_id = OLD.id;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pet_buddy_maintenance ON public.pets;
CREATE TRIGGER trg_pet_buddy_maintenance
    AFTER DELETE OR UPDATE OF user_id ON public.pets
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_pet_buddy_maintenance();

-- ------------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) EN TABLAS
-- ------------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lost_pets ENABLE ROW LEVEL SECURITY;

-- Políticas public.users: Solo el propietario lee y edita su propio registro
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
CREATE POLICY "Users can read own profile"
ON public.users FOR SELECT
TO authenticated
USING (auth.uid()::text = uid);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile"
ON public.users FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = uid);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
ON public.users FOR UPDATE
TO authenticated
USING (auth.uid()::text = uid)
WITH CHECK (auth.uid()::text = uid);

-- Políticas public.pets: Colección 100% privada
DROP POLICY IF EXISTS "Users can read own pets" ON public.pets;
CREATE POLICY "Users can read own pets"
ON public.pets FOR SELECT
TO authenticated
USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can insert own pets" ON public.pets;
CREATE POLICY "Users can insert own pets"
ON public.pets FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update own pets" ON public.pets;
CREATE POLICY "Users can update own pets"
ON public.pets FOR UPDATE
TO authenticated
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete own pets" ON public.pets;
CREATE POLICY "Users can delete own pets"
ON public.pets FOR DELETE
TO authenticated
USING (auth.uid()::text = user_id);

-- Políticas public.lost_pets
DROP POLICY IF EXISTS "Authenticated users can read lost pets" ON public.lost_pets;
CREATE POLICY "Authenticated users can read lost pets"
ON public.lost_pets FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Users can insert own lost pets" ON public.lost_pets;
CREATE POLICY "Users can insert own lost pets"
ON public.lost_pets FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update own lost pets" ON public.lost_pets;
CREATE POLICY "Users can update own lost pets"
ON public.lost_pets FOR UPDATE
TO authenticated
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete own lost pets" ON public.lost_pets;
CREATE POLICY "Users can delete own lost pets"
ON public.lost_pets FOR DELETE
TO authenticated
USING (auth.uid()::text = user_id);

-- ------------------------------------------------------------------------------
-- 5. VISTA SEGURA PARA CONSULTAS PÚBLICAS Y PROTECCIÓN DE PRIVACIDAD
-- ------------------------------------------------------------------------------
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

ALTER VIEW public.public_lost_pets SET (security_invoker = true);

REVOKE ALL ON public.public_lost_pets FROM PUBLIC;
REVOKE ALL ON public.public_lost_pets FROM anon;
GRANT SELECT ON public.public_lost_pets TO authenticated;

-- ------------------------------------------------------------------------------
-- 6. CONFIGURACIÓN IDEMPOTENTE DEL BUCKET Y POLÍTICAS DE SUPABASE STORAGE
-- ------------------------------------------------------------------------------

-- Crear o actualizar bucket 'mascotas-media' (privado, tamaño máx 5MB, tipos JPEG/PNG/WebP)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'mascotas-media',
    'mascotas-media',
    false,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- A. Carpeta 'avatars/': avatars/{userId}.ext (Lectura pública, mutación solo del propio usuario)
DROP POLICY IF EXISTS "Avatars Public Read" ON storage.objects;
CREATE POLICY "Avatars Public Read"
ON storage.objects FOR SELECT
USING (bucket_id = 'mascotas-media' AND (storage.foldername(name))[1] = 'avatars');

DROP POLICY IF EXISTS "Avatars Owner Upload" ON storage.objects;
CREATE POLICY "Avatars Owner Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'mascotas-media' AND 
    (storage.foldername(name))[1] = 'avatars' AND
    (storage.filename(name) LIKE auth.uid()::text || '.%')
);

DROP POLICY IF EXISTS "Avatars Owner Update" ON storage.objects;
CREATE POLICY "Avatars Owner Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'mascotas-media' AND 
    (storage.foldername(name))[1] = 'avatars' AND
    (storage.filename(name) LIKE auth.uid()::text || '.%')
);

DROP POLICY IF EXISTS "Avatars Owner Delete" ON storage.objects;
CREATE POLICY "Avatars Owner Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'mascotas-media' AND 
    (storage.foldername(name))[1] = 'avatars' AND
    (storage.filename(name) LIKE auth.uid()::text || '.%')
);

-- B. Carpeta 'lost-pets/': lost-pets/{userId}/{lostPetId}.ext (Lectura pública, mutación solo del creador)
DROP POLICY IF EXISTS "Lost Pets Public Read" ON storage.objects;
CREATE POLICY "Lost Pets Public Read"
ON storage.objects FOR SELECT
USING (bucket_id = 'mascotas-media' AND (storage.foldername(name))[1] = 'lost-pets');

DROP POLICY IF EXISTS "Lost Pets Owner Upload" ON storage.objects;
CREATE POLICY "Lost Pets Owner Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'mascotas-media' AND 
    (storage.foldername(name))[1] = 'lost-pets' AND
    (storage.foldername(name))[2] = auth.uid()::text
);

DROP POLICY IF EXISTS "Lost Pets Owner Update" ON storage.objects;
CREATE POLICY "Lost Pets Owner Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'mascotas-media' AND 
    (storage.foldername(name))[1] = 'lost-pets' AND
    (storage.foldername(name))[2] = auth.uid()::text
);

DROP POLICY IF EXISTS "Lost Pets Owner Delete" ON storage.objects;
CREATE POLICY "Lost Pets Owner Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'mascotas-media' AND 
    (storage.foldername(name))[1] = 'lost-pets' AND
    (storage.foldername(name))[2] = auth.uid()::text
);

-- C. Carpeta 'user-pets/': user-pets/{userId}/{petId}.ext (100% Privada para el propietario)
DROP POLICY IF EXISTS "User Pets Owner Read" ON storage.objects;
CREATE POLICY "User Pets Owner Read"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'mascotas-media' AND 
    (storage.foldername(name))[1] = 'user-pets' AND
    (storage.foldername(name))[2] = auth.uid()::text
);

DROP POLICY IF EXISTS "User Pets Owner Upload" ON storage.objects;
CREATE POLICY "User Pets Owner Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'mascotas-media' AND 
    (storage.foldername(name))[1] = 'user-pets' AND
    (storage.foldername(name))[2] = auth.uid()::text
);

DROP POLICY IF EXISTS "User Pets Owner Update" ON storage.objects;
CREATE POLICY "User Pets Owner Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'mascotas-media' AND 
    (storage.foldername(name))[1] = 'user-pets' AND
    (storage.foldername(name))[2] = auth.uid()::text
);

DROP POLICY IF EXISTS "User Pets Owner Delete" ON storage.objects;
CREATE POLICY "User Pets Owner Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'mascotas-media' AND 
    (storage.foldername(name))[1] = 'user-pets' AND
    (storage.foldername(name))[2] = auth.uid()::text
);
