ALTER TABLE "User" RENAME COLUMN "oidcSubject" TO "authUserId";
ALTER INDEX "User_oidcSubject_key" RENAME TO "User_authUserId_key";
