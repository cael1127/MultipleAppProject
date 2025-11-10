-- CreateTable
CREATE TABLE "SecurityProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "moduleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "completedLessons" TEXT NOT NULL DEFAULT '[]',
    "completedChallenges" TEXT NOT NULL DEFAULT '[]',
    "vibeConfidence" REAL NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SecurityProgress_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "SecurityModule" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SecurityProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SecurityPreference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "preferredTone" TEXT NOT NULL DEFAULT 'security',
    "shortcuts" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SecurityPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "moduleId_userId_unique" ON "SecurityProgress"("moduleId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "SecurityPreference_userId_key" ON "SecurityPreference"("userId");
