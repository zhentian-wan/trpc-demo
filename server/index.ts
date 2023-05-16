import {publicProcedure as t, router} from "./trpc";
import { createHTTPHandler } from '@trpc/server/adapters/standalone';
import { applyWSSHandler } from '@trpc/server/adapters/ws';
import { z } from 'zod';
import uuid from "uuid"
import ws from "ws"
import { createServer } from "http";
import {observable} from "@trpc/server/observable"
import { EventEmitter } from "stream";

const eventEmitter = new EventEmitter()

// Zod schema
const UserValidator = z.object({
    name: z.string(),
    id: z.string().optional(),
})

const appRouter = router({
    healthcheck: t.query(() => {
        return 'ok'
    }),
    userList: t
        .query(async () => {
            const users = (await fetch("https://jsonplaceholder.typicode.com/users")).json();
            return users;
        }),
    userById: t
        .input(z.string())
        .query(async (opts) => {
            const {input} = opts;
            const user = (await fetch(`https://jsonplaceholder.typicode.com/users/${input}`)).json();
            return user
        }),
    userCreate: t
        .input(UserValidator)
        .mutation(async (req) => {
            const {input} = req
            const user = await Promise.resolve({
                name: input.name,
                id: uuid()
            })
            eventEmitter.emit("update", req.input.name)
            return user
        }),
    /**web socker */
    onUpdate: t.subscription(() => {
        return observable<string>((observer) => {
            eventEmitter.on("update", observer.next)

            // clean up
            return () => {
                eventEmitter.off("update", observer.next)
            }
        })
    })
})

export type AppRouter = typeof appRouter;

const handler = createHTTPHandler({
    router: appRouter,
})

const server = createServer(handler)

server.listen(3000)


/**
 * Express:
 * https://trpc.io/docs/server/adapters/express
 * https://codesandbox.io/s/github/trpc/trpc/tree/main/examples/express-server?file=/src/server.ts:2565-2689
 *
 export const appRouter = t.router({
  user: t.procedure
    .query((opt) => {
        const id = opt.input.id;
        return yourFunctionToGetUserById(id)
    })
  createUser: t.procedure
    .input(z.object({ name: z.string().min(5) }))
    .mutation(async (opts) => {
      // use your ORM of choice
      return await UserModel.create({
        data: opts.input,
      });
    }),
});
 */

applyWSSHandler({
    wss: new ws.Server({server}),
    router: appRouter,
    createContext: () => {
        return {}
    }
})