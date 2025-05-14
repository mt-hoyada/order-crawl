# Node.js LTS 베이스 이미지 사용
FROM node:18

# 작업 디렉토리 생성
WORKDIR /usr/src/app

# package 파일 복사 및 의존성 설치
COPY package*.json ./
RUN npm install

# 앱 코드 복사
COPY . .

# Puppeteer 실행을 위한 필수 패키지 설치
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# 서버 포트 오픈
EXPOSE 8080

# 앱 실행
CMD [ "npm", "start" ]
