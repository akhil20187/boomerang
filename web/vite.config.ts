import {defineConfig,loadEnv} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({mode})=>{const env=loadEnv(mode,process.cwd(),'');return {root:'web',envDir:process.cwd(),define:{'import.meta.env.VITE_CONVEX_URL':JSON.stringify(env.VITE_CONVEX_URL||env.CONVEX_URL||''),'import.meta.env.VITE_MCP_PUBLIC_URL':JSON.stringify(env.VITE_MCP_PUBLIC_URL||env.MCP_PUBLIC_URL||''),'import.meta.env.VITE_APP_PUBLIC_URL':JSON.stringify(env.VITE_APP_PUBLIC_URL||env.CONVEX_SITE_URL||'')},plugins:[react()],build:{outDir:'dist',emptyOutDir:true},server:{host:'127.0.0.1'}}});
