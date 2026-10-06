import React from 'react';
import {createRoot} from 'react-dom/client';
import {ConvexReactClient} from 'convex/react';
import {ConvexAuthProvider} from '@convex-dev/auth/react';
import {App} from './App';
import {ErrorBoundary} from './ErrorBoundary';
import './style.css';
import './account.css';
import './tasks.css';
const url=import.meta.env.VITE_CONVEX_URL;
const app=<ErrorBoundary><App connected={!!url}/></ErrorBoundary>;
const widget=(window as Window & {__BOOMERANG_WIDGET__?:boolean}).__BOOMERANG_WIDGET__||location.pathname.includes('/widget')||new URLSearchParams(location.search).has('widget');
// Embedded cards inherit the host's authenticated tool connection. Website auth
// reads localStorage, which is unavailable in isolated MCP Apps sandboxes.
createRoot(document.getElementById('root')!).render(widget?app:<React.StrictMode>{url?<ConvexAuthProvider client={new ConvexReactClient(url)}>{app}</ConvexAuthProvider>:app}</React.StrictMode>);
