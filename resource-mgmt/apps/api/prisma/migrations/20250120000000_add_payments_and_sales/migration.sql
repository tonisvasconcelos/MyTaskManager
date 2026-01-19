-- CreateEnum (PaymentMethod should already exist, but adding IF NOT EXISTS for safety)
DO $$ BEGIN
 CREATE TYPE "PaymentMethod" AS ENUM('CORPORATE_CREDIT_CARD', 'BANK_TRANSFER', 'PAYPAL', 'OTHER');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- CreateEnum (PaymentStatus should already exist, but adding IF NOT EXISTS for safety)
DO $$ BEGIN
 CREATE TYPE "PaymentStatus" AS ENUM('PENDING', 'PARTIALLY_PAID', 'PAID');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Payment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "referenceNumber" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Sale" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Payment_tenantId_idx" ON "Payment"("tenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Payment_expenseId_idx" ON "Payment"("expenseId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Payment_tenantId_paymentDate_idx" ON "Payment"("tenantId", "paymentDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Sale_tenantId_idx" ON "Sale"("tenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Sale_tenantId_invoiceNumber_idx" ON "Sale"("tenantId", "invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Sale_tenantId_companyId_invoiceNumber_key" ON "Sale"("tenantId", "companyId", "invoiceNumber");

-- AddForeignKey
DO $$ BEGIN
 ALTER TABLE "Payment" ADD CONSTRAINT "Payment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
 ALTER TABLE "Payment" ADD CONSTRAINT "Payment_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
 ALTER TABLE "Sale" ADD CONSTRAINT "Sale_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
 ALTER TABLE "Sale" ADD CONSTRAINT "Sale_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
