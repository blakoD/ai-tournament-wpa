import cors from "@fastify/cors";
import Fastify from "fastify";

import { prisma } from "./db.js";
import { env } from "./env.js";
import { registerHealthRoute } from "./routes/health.js";
import { registerTournamentRoutes } from "./routes/tournaments.js";

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN
});

await registerHealthRoute(app);
await registerTournamentRoutes(app);

const start = async (): Promise<void> => {
  try {
    await app.listen({ host: env.HOST, port: env.PORT });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

app.addHook("onClose", async () => {
  await prisma.$disconnect();
});

await start();
