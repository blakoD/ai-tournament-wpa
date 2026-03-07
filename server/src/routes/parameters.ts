import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { prisma } from "../db.js";

const keyParamsSchema = z.object({
  key: z.string().min(1).regex(/^[a-z0-9_.-]+$/i),
});

type ParameterRow = {
  value: unknown;
};

const parameterBodySchema = z.object({
  value: z.unknown(),
});

const getOrCreateReadOnlyParameter = async (): Promise<unknown> => {
  const existing = await prisma.$queryRaw<ParameterRow[]>`
    SELECT value
    FROM app_parameters
    WHERE key = 'read_only'
    LIMIT 1
  `;

  if (existing.length > 0) {
    return existing[0].value;
  }

  await prisma.$executeRaw`
    INSERT INTO app_parameters (key, value)
    VALUES ('read_only', 'true'::jsonb)
    ON CONFLICT (key) DO NOTHING
  `;

  return true;
};

export const registerParametersRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/api/parameters/:key", async (request, reply) => {
    const parsedParams = keyParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.code(400).send({ error: "Invalid parameter key" });
    }

    if (parsedParams.data.key === "read_only") {
      const value = await getOrCreateReadOnlyParameter();
      return { key: parsedParams.data.key, value };
    }

    const rows = await prisma.$queryRaw<ParameterRow[]>`
      SELECT value
      FROM app_parameters
      WHERE key = ${parsedParams.data.key}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return reply.code(404).send({ error: "Parameter not found" });
    }

    return { key: parsedParams.data.key, value: rows[0].value };
  });

  app.put("/api/parameters/:key", async (request, reply) => {
    const parsedParams = keyParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.code(400).send({ error: "Invalid parameter key" });
    }

    const parsedBody = parameterBodySchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.code(400).send({ error: "Invalid parameter payload" });
    }

    const serializedValue = JSON.stringify(parsedBody.data.value);

    await prisma.$executeRaw`
      INSERT INTO app_parameters (key, value)
      VALUES (${parsedParams.data.key}, CAST(${serializedValue} AS jsonb))
      ON CONFLICT (key)
      DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `;

    return { key: parsedParams.data.key, value: parsedBody.data.value };
  });
};
