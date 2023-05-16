import {initTRPC} from "@trpc/server"

const app = initTRPC.create();

export const router = app.router;
export const publicProcedure = app.procedure;

