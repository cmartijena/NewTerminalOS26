/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_WAM_API_BASE_URL: string;
  readonly VITE_WAM_API_SECRET: string;
  readonly VITE_EMAILJS_PUBLIC_KEY: string;
  readonly VITE_EMAILJS_SERVICE_ID: string;
  readonly VITE_EMAILJS_TEMPLATE_WAM: string;
  readonly VITE_EMAILJS_TEMPLATE_WELCOME: string;
  readonly VITE_EMAILJS_TEMPLATE_OTP: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
