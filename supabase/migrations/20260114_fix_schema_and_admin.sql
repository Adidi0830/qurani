-- PERBAIKAN SCHEMA DATABASE DAN ADDS ADMIN PROFILE
-- Jalankan script ini di Supabase SQL Editor

-- 1. Tambahkan Foreign Key dari user_profiles ke auth.users
-- Ini menghubungkan tabel profile public dengan tabel auth internal Supabase
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_profiles_auth') THEN
        ALTER TABLE public.user_profiles
        ADD CONSTRAINT fk_user_profiles_auth
        FOREIGN KEY (auth) 
        REFERENCES auth.users(id)
        ON DELETE CASCADE;
        
        RAISE NOTICE 'Foreign key fk_user_profiles_auth berhasil ditambahkan';
    ELSE
        RAISE NOTICE 'Foreign key fk_user_profiles_auth sudah ada';
    END IF;
END $$;

-- 2. Perbaiki Column Role jika null
UPDATE public.user_profiles 
SET role = 'member' 
WHERE role IS NULL;

-- 3. Instruksi Manual untuk Set Admin
-- Ganti 'UUID_USER_ANDA' dengan ID User dari Menu Authentication di Supabase
-- Contoh: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

/* 
-- Hapus tanda komentar (--) di bawah dan ganti UUID-nya:

UPDATE public.user_profiles
SET role = 'admin'
WHERE auth = 'UUID_USER_ANDA';

-- Jika user belum ada di user_profiles, insert manual:
INSERT INTO public.user_profiles (id, auth, email, role, username, name)
VALUES (
  'user_' || substr(md5(random()::text), 1, 10), -- Random ID sementara
  'UUID_USER_ANDA',
  'email_anda@gmail.com',
  'admin',
  '@admin_username',
  'Admin Name'
);

*/
