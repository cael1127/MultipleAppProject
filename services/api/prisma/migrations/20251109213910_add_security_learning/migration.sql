-- CreateTable
CREATE TABLE "SecurityModule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'intermediate',
    "topics" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SecurityLesson" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "moduleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'text',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SecurityLesson_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "SecurityModule" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VibeChallenge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "moduleId" TEXT,
    "prompt" TEXT NOT NULL,
    "snippet" TEXT NOT NULL,
    "hints" TEXT NOT NULL DEFAULT '[]',
    "solutionNotes" TEXT NOT NULL,
    "heuristics" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VibeChallenge_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "SecurityModule" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
