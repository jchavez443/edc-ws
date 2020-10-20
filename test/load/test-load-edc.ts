import 'mocha'
import { assert } from 'chai'
import Edc, {
    ClientHandlers,
    Event,
    ServerHandlers,
    ErrorEvent,
    IEvents,
    Client,
    AckedErrorEvent,
    TimeoutError,
    BasicAuth
} from '../../src'

const port = 8082

const serverHandlers: ServerHandlers = {
    onAck: async () => {},
    onError: async () => {},
    onEvent: async () => {},

    onConnect: async (connection, auth, event, server) => {},
    authenticate: (request) => {
        const authHeader = request.headers.authorization || ''

        const auth = new BasicAuth(authHeader)
        auth.authenticated = true

        return auth
    }
}

const server = new Edc.Server(port, serverHandlers, {
    timeout: 500
})

const clientHandlers: ClientHandlers = {
    onAck: async () => {},
    onError: async () => {},
    onEvent: async () => {}
}
const client = new Edc.Client(`ws://localhost:${port}`, clientHandlers, { timeout: 500 })
const client2 = new Edc.Client(`ws://localhost:${port}`, clientHandlers, { timeout: 500 })

beforeEach(`Clear events an await connections`, async () => {
    await client.awaitReady()
    await client2.awaitReady()

    server.onError = serverHandlers.onError
    server.onAck = serverHandlers.onAck
    server.onEvent = serverHandlers.onError

    client.onError = clientHandlers.onError
    client.onAck = clientHandlers.onAck
    client.onEvent = clientHandlers.onError

    client2.onError = clientHandlers.onError
    client2.onAck = clientHandlers.onAck
    client2.onEvent = clientHandlers.onError
})

after('TearDown', async () => {
    server.close()
})

describe('Test Client & Server loads', () => {
    it('Multiple Clients: event{ack: true} --> Server: ack', async () => {
        const cause = new Event(`test-event`, {
            acknowledge: true
        })

        const cause2 = new Event('test-evnt', {
            acknowledge: true
        })

        const promise1 = client.sendEvent(cause)
        const promise2 = client2.sendEvent(cause2)

        const res = await Promise.all([promise1, promise2])

        assert(res[0].type === 'acknowledgement', 'Needs to be an ACK')
        assert(res[1].type === 'acknowledgement', 'Needs to be an ACK')

        assert(res[0].trigger === cause.id, 'The trigger needs to be the ID')
        assert(res[1].trigger === cause2.id, 'The trigger needs to be the ID')
    })
    it('Single Client: event{ack: true} --> Server: ack.  Loop random replies', async () => {
        server.onEvent = (event, conn, reply, send) => {
            const pause = Math.floor(Math.random() * Math.floor(200))
            return new Promise((resolve) => {
                setTimeout(resolve, pause)
            })
        }

        const promises: Promise<IEvents>[] = []
        const ids: string[] = []

        for (let i = 0; i <= 25; i += 1) {
            const cause = new Event(`test-event`, {
                acknowledge: true
            })
            ids.push(cause.id)
            const response = client.sendEvent(cause)
            promises.push(response)
        }

        const acks = await Promise.all(promises)

        for (let i = 0; i < acks.length; i += 1) {
            assert(acks[i], 'Ack cannot be undefined')
            assert(acks[i].type === 'acknowledgement')
            assert(acks[i].trigger === ids[i], 'event.trigger must == cause.id')
        }
    })
    it('Multiple Clients: event{ack: true} --> Server: ack.  Loop random replies', async () => {
        server.onEvent = (cause, conn, reply, send) => {
            const pause = Math.floor(Math.random() * Math.floor(500))
            return new Promise((resolve) => {
                setTimeout(resolve, pause)
            })
        }

        const clients: Client[] = []
        const awaitReadys: Promise<any>[] = []

        for (let i = 0; i <= 25; i += 1) {
            const temp = new Edc.Client(`ws://localhost:${port}`, clientHandlers, { timeout: 1000 })
            clients.push(temp)
            awaitReadys.push(temp.awaitReady())
        }

        await Promise.all(awaitReadys)

        const promises: Promise<IEvents>[] = []
        const ids: string[] = []

        clients.forEach((tempClient) => {
            const cause = new Event(`test-event`, {
                acknowledge: true
            })
            ids.push(cause.id)
            const response = tempClient.sendEvent(cause)
            promises.push(response)
        })

        const acks = await Promise.all(promises)

        for (let i = 0; i < acks.length; i += 1) {
            assert(acks[i], 'Ack cannot be undefined')
            assert(acks[i].type === 'acknowledgement')
            assert(acks[i].trigger === ids[i], 'event.trigger must == cause.id')
        }

        const closePromises: Promise<any>[] = []
        clients.forEach((tempClient) => {
            closePromises.push(tempClient.close())
        })

        Promise.all(closePromises)
    })
    it('Load Test,  25 Clients: event{ack: true} x 10 --> Server: ack.  Loop random replies', async () => {
        const numberOfClients = 25
        const numberOfReqeusts = 10

        server.onEvent = (cause, conn, reply, send) => {
            const pause = Math.floor(Math.random() * Math.floor(300))
            return new Promise((resolve) => {
                setTimeout(resolve, pause)
            })
        }

        const clients: Client[] = []
        const awaitReadys: Promise<any>[] = []

        for (let i = 0; i <= numberOfClients; i += 1) {
            const temp = new Edc.Client(`ws://localhost:${port}`, clientHandlers, { timeout: 1000 })
            clients.push(temp)
            awaitReadys.push(temp.awaitReady())
        }

        await Promise.all(awaitReadys)

        const promises: Promise<IEvents>[] = []
        const ids: string[] = []

        clients.forEach((tempClient) => {
            for (let i = 0; i < numberOfReqeusts; i += 1) {
                const cause = new Event(`test-event`, {
                    acknowledge: true
                })
                ids.push(cause.id)
                const response = tempClient.sendEvent(cause)
                promises.push(response)
            }
        })

        const acks = await Promise.all(promises)

        for (let i = 0; i < acks.length; i += 1) {
            assert(acks[i], 'Ack cannot be undefined')
            assert(acks[i].type === 'acknowledgement')
            assert(acks[i].trigger === ids[i], 'event.trigger must == cause.id')
        }

        const closePromises: Promise<any>[] = []
        clients.forEach((tempClient) => {
            closePromises.push(tempClient.close())
        })

        Promise.all(closePromises)
    })
    it('Load Test,  1 Clients{ack: true} x 500 request/client', async () => {
        const numberOfClients = 1
        const eventsPerClient = 500

        server.onEvent = (cause, conn, reply, send) => {
            const pause = Math.floor(Math.random() * Math.floor(300))
            return new Promise((resolve) => {
                setTimeout(resolve, pause)
            })
        }

        const clients: Client[] = []
        const awaitReadys: Promise<any>[] = []

        for (let i = 0; i <= numberOfClients; i += 1) {
            const temp = new Edc.Client(`ws://localhost:${port}`, clientHandlers, { timeout: 1000 })
            clients.push(temp)
            awaitReadys.push(temp.awaitReady())
        }

        await Promise.all(awaitReadys)

        const promises: Promise<IEvents>[] = []
        const ids: string[] = []

        clients.forEach((tempClient) => {
            for (let i = 0; i < eventsPerClient; i += 1) {
                const cause = new Event(`test-event`, {
                    acknowledge: true
                })
                ids.push(cause.id)
                const response = tempClient.sendEvent(cause)
                promises.push(response)
            }
        })

        const acks = await Promise.all(promises)

        for (let i = 0; i < acks.length; i += 1) {
            assert(acks[i], 'Ack cannot be undefined')
            assert(acks[i].type === 'acknowledgement')
            assert(acks[i].trigger === ids[i], 'event.trigger must == cause.id')
        }

        const closePromises: Promise<any>[] = []
        clients.forEach((tempClient) => {
            closePromises.push(tempClient.close())
        })

        Promise.all(closePromises)
    }).timeout(10000)
    it('Load Test,  1 Clients{ack: true} x 750 request/client', async () => {
        const numberOfClients = 1
        const eventsPerClient = 750

        server.onEvent = (cause, conn, reply, send) => {
            const pause = Math.floor(Math.random() * Math.floor(300))
            return new Promise((resolve) => {
                setTimeout(resolve, pause)
            })
        }

        const clients: Client[] = []
        const awaitReadys: Promise<any>[] = []

        for (let i = 0; i <= numberOfClients; i += 1) {
            const temp = new Edc.Client(`ws://localhost:${port}`, clientHandlers, { timeout: 1000 })
            clients.push(temp)
            awaitReadys.push(temp.awaitReady())
        }

        await Promise.all(awaitReadys)

        const promises: Promise<IEvents>[] = []
        const ids: string[] = []

        clients.forEach((tempClient) => {
            for (let i = 0; i < eventsPerClient; i += 1) {
                const cause = new Event(`test-event`, {
                    acknowledge: true
                })
                ids.push(cause.id)
                const response = tempClient.sendEvent(cause)
                promises.push(response)
            }
        })

        const acks = await Promise.all(promises)

        for (let i = 0; i < acks.length; i += 1) {
            assert(acks[i], 'Ack cannot be undefined')
            assert(acks[i].type === 'acknowledgement')
            assert(acks[i].trigger === ids[i], 'event.trigger must == cause.id')
        }

        const closePromises: Promise<any>[] = []
        clients.forEach((tempClient) => {
            closePromises.push(tempClient.close())
        })

        Promise.all(closePromises)
    }).timeout(10000)
    it('Load Test,  300 Clients{ack: false} x 400 request/client', async () => {
        const numberOfClients = 200
        const eventsPerClient = 400

        server.onEvent = (cause, conn, reply, send) => {
            const pause = Math.floor(Math.random() * Math.floor(300))
            return new Promise((resolve) => {
                setTimeout(resolve, pause)
            })
        }

        const clients: Client[] = []
        const awaitReadys: Promise<any>[] = []

        for (let i = 0; i <= numberOfClients; i += 1) {
            const temp = new Edc.Client(`ws://localhost:${port}`, clientHandlers, { timeout: 1000 })
            clients.push(temp)
            awaitReadys.push(temp.awaitReady())
        }

        await Promise.all(awaitReadys)

        const promises: Promise<IEvents>[] = []
        const ids: string[] = []

        clients.forEach((tempClient) => {
            for (let i = 0; i < eventsPerClient; i += 1) {
                const cause = new Event(`test-event`, {
                    acknowledge: false
                })
                ids.push(cause.id)
                const response = tempClient.sendEvent(cause)
                promises.push(response)
            }
        })

        const acks = await Promise.all(promises)

        for (let i = 0; i < acks.length; i += 1) {
            assert(!acks[i], 'Ack must be undefined')
        }

        const closePromises: Promise<any>[] = []
        clients.forEach((tempClient) => {
            closePromises.push(tempClient.close())
        })

        Promise.all(closePromises)
    }).timeout(10000)
    it('Load Test,  300 Clients{ack: true} x 400 request/client', async () => {
        const numberOfClients = 300
        const eventsPerClient = 400

        server.onEvent = (cause, conn, reply, send) => {
            const pause = Math.floor(Math.random() * Math.floor(300))
            return new Promise((resolve) => {
                setTimeout(resolve, pause)
            })
        }

        const clients: Client[] = []
        const awaitReadys: Promise<any>[] = []

        for (let i = 0; i <= numberOfClients; i += 1) {
            const temp = new Edc.Client(`ws://localhost:${port}`, clientHandlers, { timeout: 50000 })
            clients.push(temp)
            awaitReadys.push(temp.awaitReady())
        }

        await Promise.all(awaitReadys)

        const promises: Promise<IEvents>[] = []
        const ids: string[] = []

        clients.forEach((tempClient) => {
            for (let i = 0; i < eventsPerClient; i += 1) {
                const cause = new Event(`test-event`, {
                    acknowledge: true
                })
                ids.push(cause.id)
                const response = tempClient.sendEvent(cause)
                promises.push(response)
            }
        })

        const acks = await Promise.all(promises)

        for (let i = 0; i < acks.length; i += 1) {
            assert(acks[i], 'Ack cannot be undefined')
            assert(acks[i].type === 'acknowledgement')
            assert(acks[i].trigger === ids[i], 'event.trigger must == cause.id')
        }

        const closePromises: Promise<any>[] = []
        clients.forEach((tempClient) => {
            closePromises.push(tempClient.close())
        })

        Promise.all(closePromises)
    }).timeout(60000)
    it('Load Test,  12 Clients{ack: true} x 10000 request/client', async () => {
        const numberOfClients = 12
        const eventsPerClient = 10000

        server.onEvent = (cause, conn, reply, send) => {
            const pause = Math.floor(Math.random() * Math.floor(300))
            return new Promise((resolve) => {
                setTimeout(resolve, pause)
            })
        }

        const clients: Client[] = []
        const awaitReadys: Promise<any>[] = []

        for (let i = 0; i <= numberOfClients; i += 1) {
            const temp = new Edc.Client(`ws://localhost:${port}`, clientHandlers, { timeout: 50000 })
            clients.push(temp)
            awaitReadys.push(temp.awaitReady())
        }

        await Promise.all(awaitReadys)

        const promises: Promise<IEvents>[] = []
        const ids: string[] = []

        clients.forEach((tempClient) => {
            for (let i = 0; i < eventsPerClient; i += 1) {
                const cause = new Event(`test-event`, {
                    acknowledge: true
                })
                ids.push(cause.id)
                const response = tempClient.sendEvent(cause)
                promises.push(response)
            }
        })

        const acks = await Promise.all(promises)

        for (let i = 0; i < acks.length; i += 1) {
            assert(acks[i], 'Ack cannot be undefined')
            assert(acks[i].type === 'acknowledgement')
            assert(acks[i].trigger === ids[i], 'event.trigger must == cause.id')
        }

        const closePromises: Promise<any>[] = []
        clients.forEach((tempClient) => {
            closePromises.push(tempClient.close())
        })

        Promise.all(closePromises)
    }).timeout(60000)
    it('Load Test,  12 Clients{ack: false} x 10000 request/client', async () => {
        const numberOfClients = 12
        const eventsPerClient = 10000

        server.onEvent = (cause, conn, reply, send) => {
            const pause = Math.floor(Math.random() * Math.floor(300))
            return new Promise((resolve) => {
                setTimeout(resolve, pause)
            })
        }

        const clients: Client[] = []
        const awaitReadys: Promise<any>[] = []

        for (let i = 0; i <= numberOfClients; i += 1) {
            const temp = new Edc.Client(`ws://localhost:${port}`, clientHandlers, { timeout: 50000 })
            clients.push(temp)
            awaitReadys.push(temp.awaitReady())
        }

        await Promise.all(awaitReadys)

        const promises: Promise<IEvents>[] = []
        const ids: string[] = []

        clients.forEach((tempClient) => {
            for (let i = 0; i < eventsPerClient; i += 1) {
                const cause = new Event(`test-event`, {
                    acknowledge: false
                })
                ids.push(cause.id)
                const response = tempClient.sendEvent(cause)
                promises.push(response)
            }
        })

        const acks = await Promise.all(promises)

        for (let i = 0; i < acks.length; i += 1) {
            assert(!acks[i], 'Ack must be undefined')
        }

        const closePromises: Promise<any>[] = []
        clients.forEach((tempClient) => {
            closePromises.push(tempClient.close())
        })

        Promise.all(closePromises)
    }).timeout(60000)
})
