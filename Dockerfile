FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
# next start membaca next.config.ts saat runtime. Tanpa file ini batas body
# Server Action kembali ke default 1 MB, dan unggahan per potongan 3 MB macet.
COPY next.config.ts ./
COPY node_modules ./node_modules
COPY .next ./.next
COPY public ./public
COPY prisma ./prisma
COPY lib ./lib
COPY .env ./.env
EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000
CMD ["npm", "start"]
