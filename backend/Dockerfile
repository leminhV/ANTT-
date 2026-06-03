# OWASP Rule: Sử dụng phiên bản Base Image cố định (pinned) thay vì 'latest' để tránh rủi ro bảo mật do thay đổi ngầm.
# STAGE 1: Builder (Dùng để build source code và tải dependencies)
FROM node:20.11.0-alpine AS builder

WORKDIR /app

# Chỉ copy package.json và lock file để tận dụng Docker cache
COPY package*.json ./
COPY prisma ./prisma/

# Cài đặt toàn bộ dependencies (kể cả dev) để build
RUN npm ci

# Copy mã nguồn
COPY . .

# Generate Prisma Client & Build code NestJS
RUN npx prisma generate
RUN npm run build
RUN npm prune --production # Loại bỏ devDependencies để giảm kích thước

# STAGE 2: Production (Image gọn nhẹ và an toàn để chạy thực tế)
FROM node:20.11.0-alpine AS production

WORKDIR /app

# OWASP Rule #2: KHÔNG chạy container dưới quyền Root. Sử dụng user 'node' có sẵn của image.
# Ngăn chặn Hacker chiếm được hệ điều hành Host nếu thoát được Container (Container Breakout).
USER node

# Chỉ copy các tệp nhị phân và thư viện chạy thực tế từ Stage 1
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/package.json ./

EXPOSE 3000

# OWASP Rule: Khởi chạy ứng dụng trực tiếp bằng node binary thay vì 'npm start'
# Giảm thiểu các tiến trình (process) rác và tín hiệu (signals) được truyền thẳng tới ứng dụng.
CMD ["node", "dist/main"]
