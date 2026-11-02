-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "coverUrl" TEXT,
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "startNodeId" TEXT,
    "nodesJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LicenseKey" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LicenseKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "currentNode" TEXT NOT NULL,
    "historyJson" TEXT NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL,
    "heroTitle" TEXT NOT NULL DEFAULT 'Kar1n Tease Paradise',
    "heroSubtitle" TEXT NOT NULL DEFAULT 'Kar1n 调教乐园 · 分支剧情文字冒险',
    "heroBody" TEXT NOT NULL DEFAULT '注册账号后可游玩免费作品；付费作品需使用专属秘钥激活解锁。',
    "navBrand" TEXT NOT NULL DEFAULT 'Kar1n Tease Paradise',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "LicenseKey_code_key" ON "LicenseKey"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Activation_userId_gameId_key" ON "Activation"("userId", "gameId");

-- CreateIndex
CREATE UNIQUE INDEX "Progress_userId_gameId_key" ON "Progress"("userId", "gameId");

-- AddForeignKey
ALTER TABLE "LicenseKey" ADD CONSTRAINT "LicenseKey_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicenseKey" ADD CONSTRAINT "LicenseKey_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activation" ADD CONSTRAINT "Activation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activation" ADD CONSTRAINT "Activation_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activation" ADD CONSTRAINT "Activation_keyId_fkey" FOREIGN KEY ("keyId") REFERENCES "LicenseKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Progress" ADD CONSTRAINT "Progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Progress" ADD CONSTRAINT "Progress_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default site settings row
INSERT INTO "SiteSettings" ("id", "heroTitle", "heroSubtitle", "heroBody", "navBrand", "updatedAt")
VALUES (
  'default',
  'Kar1n Tease Paradise',
  'Kar1n 调教乐园 · 分支剧情文字冒险',
  '注册账号后可游玩免费作品；付费作品需使用专属秘钥激活解锁。',
  'Kar1n Tease Paradise',
  CURRENT_TIMESTAMP
);
