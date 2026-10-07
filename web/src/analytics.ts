import { inject } from '@vercel/analytics';

// Included only in the Vercel website HTML, never in embedded MCP cards.
inject({
  mode: 'production',
  beforeSend(event) {
    const url = new URL(event.url);
    // Sign-in codes, connection requests and private task IDs live in the query.
    url.search = '';
    url.hash = '';
    return { ...event, url: url.toString() };
  },
});
