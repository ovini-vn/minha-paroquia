-- Em que dia de cada novena a pessoa está.
--
-- Da conta, e não da paróquia: sem parish_id e sem RLS, como
-- notification_preferences. O serviço filtra sempre por user_id.
CREATE TABLE "novena_andamentos" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "novena" TEXT NOT NULL,
    "dias_rezados" INTEGER NOT NULL DEFAULT 0,
    "ultimo_dia_em" TIMESTAMP(3),
    "iniciada_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "concluida_em" TIMESTAMP(3),

    CONSTRAINT "novena_andamentos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "novena_andamentos_user_id_novena_key" ON "novena_andamentos"("user_id", "novena");

ALTER TABLE "novena_andamentos" ADD CONSTRAINT "novena_andamentos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
