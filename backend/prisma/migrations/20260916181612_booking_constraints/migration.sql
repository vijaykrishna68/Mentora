-- AlterTable
ALTER TABLE "mentor_profiles" ADD COLUMN     "maximumAdvanceDays" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "minimumNoticeMinutes" INTEGER NOT NULL DEFAULT 60;
