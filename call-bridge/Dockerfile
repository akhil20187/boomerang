# Build from repository root: docker build -f call-bridge/Dockerfile .
# Set NODE_IMAGE to a reviewed digest when deploying for reproducible base images.
ARG NODE_IMAGE=node:22-alpine
FROM ${NODE_IMAGE} AS dependencies
WORKDIR /opt/runtime
COPY call-bridge/package.json call-bridge/package-lock.json ./
RUN npm ci --omit=dev --omit=optional --ignore-scripts --no-audit --no-fund

FROM ${NODE_IMAGE}
ENV NODE_ENV=production \
    PORT=3212 \
    CALL_BRIDGE_BIND_HOST=0.0.0.0 \
    CALL_BRIDGE_JOURNAL=/var/lib/human-mcp/attempts.json
WORKDIR /app
COPY --from=dependencies --chown=node:node /opt/runtime/node_modules ./node_modules
COPY --chown=node:node call-bridge/bridge.cjs call-bridge/answer.cjs call-bridge/reconcile.cjs call-bridge/bootstrap.cjs ./call-bridge/
COPY --chown=node:node voice-test/phone-agent.cjs voice-test/phone-core.cjs ./voice-test/
RUN mkdir -p /var/lib/human-mcp \
    && chown node:node /var/lib/human-mcp \
    && chmod 700 /var/lib/human-mcp
USER node
# Persistent journal storage is attached explicitly by the hosting platform.
EXPOSE 3212
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health',{signal:AbortSignal.timeout(4000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "call-bridge/bootstrap.cjs"]
