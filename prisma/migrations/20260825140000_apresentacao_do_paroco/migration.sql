-- AlterTable
ALTER TABLE "parishes" ADD COLUMN     "paroco_nome" TEXT,
ADD COLUMN     "paroco_titulo" TEXT,
ADD COLUMN     "paroco_historia" TEXT,
ADD COLUMN     "paroco_foto_url" TEXT;

-- Traz o que já estava no perfil do sacerdote para a paróquia, para não
-- perder a foto e o texto que a secretaria cadastrou antes desta mudança.
UPDATE "parishes" p
SET "paroco_titulo"  = pp."title",
    "paroco_historia" = pp."bio",
    "paroco_foto_url" = pp."photo_url"
FROM "priest_profiles" pp
JOIN "parish_memberships" pm
  ON pm."user_id" = pp."user_id"
 AND pm."parish_id" = pp."parish_id"
 AND pm."status"::text = 'active'
JOIN "roles" r
  ON r."id" = pm."role_id"
 AND r."code" = 'PAROCO'
WHERE pp."parish_id" = p."id";
