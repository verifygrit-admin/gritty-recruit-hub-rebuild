// Vitest setup — loads .env so schema.test.js sees SUPABASE_URL /
// SUPABASE_SERVICE_ROLE_KEY when running locally. CI continues to work because
// dotenv silently no-ops when .env is absent.
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const here = fileURLToPath(import.meta.url);
dotenv.config({ path: resolve(here, '../..', '.env') });
