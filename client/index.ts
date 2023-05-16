import { createTRPCProxyClient, createWSClient, httpBatchLink, wsLink, splitLink } from '@trpc/client';
import type { AppRouter } from '../server';

const wsClient = createWSClient({
    url: "ws://localhost:3000"
})

const trpc = createTRPCProxyClient<AppRouter>({
    links: [
        splitLink({
            condition: opreation => {
                return opreation.type === "subscription"
            },
            true: wsLink({
                client: wsClient
            }),
            false:  httpBatchLink({
                url: "http://localhost:3000"
            })
        })
    ]
})

// Express: const health = await fetch('sidecar/healtcheck').json() as string
// const user = await fetch('sidecar/healtcheck').json() as User
// const createdUser = await fetch('sidecar/user', {method: 'POST', body: JSON.stringify({name: 'abc'})}).json() as User
const healthcheck = await trpc.healthcheck.query();
const user = await trpc.userById.query("1")
const createdUser = await trpc.userCreate.mutate({ name: 'abc' });



/**Web socket */
// trigger updates
trpc.userCreate.mutate({name: "abc"})

// listen for updates
const connection = trpc.onUpdate.subscribe(undefined,{
    onData: (name) => {
        console.log("Name udpate", name)
    }
})
// close connection
connection.unsubscribe();
// close socket
wsClient.close();