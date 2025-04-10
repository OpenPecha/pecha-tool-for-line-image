-- CreateTable
CREATE TABLE "Abbreviation" (
    "id" TEXT NOT NULL,
    "convention" TEXT NOT NULL,
    "expansion" TEXT NOT NULL,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Abbreviation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Abbreviation_convention_key" ON "Abbreviation"("convention");
