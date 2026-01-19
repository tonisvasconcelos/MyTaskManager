-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "invoiceCurrencyCode" VARCHAR(3),
ADD COLUMN     "refEndDate" TIMESTAMP(3),
ADD COLUMN     "refStartDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ExpenseAllocation" ADD COLUMN     "allocatedPercentage" DECIMAL(5,2),
ALTER COLUMN "allocatedAmount" DROP NOT NULL;
