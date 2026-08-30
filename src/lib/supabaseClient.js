// src/lib/supabaseClient.js
//
// Client Supabase partagé. Les identifiants viennent des variables
// d'environnement Vite (voir .env.example) :
//   VITE_SUPABASE_URL
//   VITE_SUPABASE_ANON_KEY
//
// La clé "anon" est PUBLIQUE par conception : elle n'autorise que ce que les
// règles RLS de la base permettent (ici : lecture pour tous, écriture pour
// l'administratrice connectée). Voir supabase/schema.sql.
//
// Tant que les variables ne sont pas renseignées, `supabase` vaut null et le
// site retombe automatiquement sur les données statiques de src/data/.

import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.info(
    '[Woltar] Supabase non configuré — le site utilise les données statiques de src/data/. ' +
      'Renseigne .env.local pour activer la base + l’admin.',
  )
}
