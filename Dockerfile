# =========================================================================
# Stage 1: Base - Instala Node.js y activa PNPM usando Corepack
# =========================================================================
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# =========================================================================
# Stage 2: Builder - Instala dependencias y compila Frontend y Backend
# =========================================================================
FROM base AS builder

# Copiar archivos de definición de dependencias y de TypeScript/Vite
COPY package.json pnpm-lock.yaml tsconfig*.json vite.config.ts index.html ./

# Instalar todas las dependencias (desarrollo y producción)
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Copiar carpetas de código de frontend y backend
COPY src ./src
COPY public ./public
COPY server ./server

# Compilar frontend (dist/) y backend (dist-server/)
RUN pnpm run build

# =========================================================================
# Stage 3: Runner - Imagen final súper ligera para producción en Easypanel
# =========================================================================
FROM base AS runner
ENV NODE_ENV=production

# Copiar los manifiestos para la instalación de dependencias de producción
COPY package.json pnpm-lock.yaml ./

# Instalar únicamente dependencias de producción
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

# Copiar los bundles generados en la etapa de compilación
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server

# Exponer el puerto por el que escuchará Express
EXPOSE 3000

# Iniciar el servidor backend en producción
CMD ["node", "dist-server/server.js"]
