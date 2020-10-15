import 'mocha'
import { expect, assert } from 'chai'
import Edc, {
    ClientHandlers,
    Event,
    ServerHandlers,
    ErrorEvent,
    IEvents,
    Client,
    DefaultConnectionManager,
    AckedErrorEvent,
    TimeoutError
} from '../src'

const port = 8082

const serverHandlers: ServerHandlers = {
    onAck: async () => {},
    onError: async () => {},
    onEvent: async () => {},

    onConnect: async (server, connectionInfo, event) => {}
}

const server = new Edc.Server(port, serverHandlers, new DefaultConnectionManager(), 500)

const clientHandlers: ClientHandlers = {
    onAck: async () => {},
    onError: async () => {},
    onEvent: async () => {}
}
const client = new Edc.Client(`ws://localhost:${port}`, clientHandlers, 500)
const client2 = new Edc.Client(`ws://localhost:${port}`, clientHandlers, 500)

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

describe('Test Client & Server behavior', () => {
    it('Client: event{ack: true} --> Server: ack', async () => {
        const event = new Event(`test-event`, {
            acknowledge: true
        })

        const ack = await client.sendEvent(event)

        assert(ack, 'Acknowledgemnt not returned')

        assert(ack.trigger === event.id, 'Acknowledgemnt trigger != cause.id')
    })
    it('Client: event{ack: true} --> Server: error', async () => {
        server.onEvent = async (cause, info, reply) => {
            reply(
                new ErrorEvent(cause, {
                    cn: 'cn',
                    code: 400,
                    data: null,
                    message: 'This is the error'
                })
            )
        }

        client.onError = async (cause) => {
            assert(cause, 'Cause is undefined')
        }

        const event = new Event(`test-event`, {
            acknowledge: true
        })

        try {
            const ack = await client.sendEvent(event)
            assert(false, 'Error should be trown if server returns error --> client')
        } catch (e) {
            if (e instanceof AckedErrorEvent) {
                assert(e.message, 'The error hase a message')
                assert(e.failed, 'Error need the failed event')
                assert(e.trigger, 'Error needs a trigger')
                assert(e.details, 'Errro needs details')
                assert(e.name === 'AckedErrorEvent', 'Name of error should be "AckedErrorEvent"')
            } else if (e instanceof TimeoutError) {
                assert(false, 'The request should not have timed out')
            } else {
                assert(false, 'The error should of been of type AckedErrorEvent')
            }
        }
    })
    it('Client: event{ack: true} --> Server: event', async () => {
        server.onEvent = async (cause, info, reply) => {
            reply(new Event('test-event').inherit(cause))
        }

        const event = new Event(`test-event`, {
            acknowledge: true
        })

        const ack = await client.sendEvent(event)

        assert(ack, 'Acknowledgemnt not returned')

        assert(ack.trigger === event.id, 'Acknowledgemnt trigger != cause.id')
        assert(ack.type === 'test-event', 'Wasnt an event.type = "test-event"')
    })
    it('Client: event{ack: true} --> Server: no-reply', async () => {
        server.onEvent = (cause, info, reply) => {
            return new Promise((resolve, reject) => {})
        }

        const event = new Event(`test-event`, {
            acknowledge: true
        })

        try {
            const ack = await client.sendEvent(event)
            assert(!ack)
            assert(false, 'A timeout error needed to be thrown')
        } catch (e) {
            assert(e, 'An error object need to be thrown')
        }
    })
    it('Client: event{ack: false} --> Server: event', async () => {
        server.onEvent = async (cause, info, reply) => {
            reply(new Event('test-event').inherit(cause))
        }

        const event = new Event(`test-event`, {
            acknowledge: false
        })

        const ack = await client.sendEvent(event)

        assert(!ack, 'Acknowledgemnt needs to be undefined')
    })
    it('Client: event{ack: false} --> Server: no-reply', async () => {
        server.onEvent = async (cause, info, reply, send) => {
            return new Promise((resolve, reject) => {})
        }

        const event = new Event(`test-event`, {
            acknowledge: false
        })

        const ack = await client.sendEvent(event)

        assert(!ack, 'Acknowledgemnt needs to be undefined')
    })

    it('Server: event{ack: true} --> Client: ack', async () => {
        const event = new Event(`test-event`, {
            acknowledge: true
        })

        const info = server.connectionManager.getAllConnections()[0]
        const ack = await server.sendEvent(info, event)

        assert(ack, 'Acknowledgemnt undefined')
        assert(ack.trigger === event.id, 'Ack trigger == event')
    })
    it('Server: event{ack: true} --> Client: error', async () => {
        client.onEvent = async (cause, reply) => {
            const error = new ErrorEvent(cause, {
                code: 400,
                cn: 'cn',
                message: 'simple message',
                data: null
            })
            reply(error)
        }

        const event = new Event(`test-event`, {
            acknowledge: true
        })

        try {
            const info = server.connectionManager.getAllConnections()[0]
            const error = await server.sendEvent(info, event)
            assert(error || !error, 'Error should have been thrown by server')
        } catch (e) {
            assert(e, 'An Error should have been thrown')
        }
    })
    it('Server: event{ack: true} --> Client: event', async () => {
        client.onEvent = async (cause, reply) => {
            const event = new Event('test-event').inherit(cause)
            reply(event)
        }

        const cause = new Event(`test-event`, {
            acknowledge: true
        })

        const info = server.connectionManager.getAllConnections()[0]
        const event = await server.sendEvent(info, cause)
        assert(event, 'An event should have been returned')
        assert(event.trigger === cause.id)
    })
    it('Server: event{ack: true} --> Client: no-reply', async () => {
        client.onEvent = (cause, reply) => {
            return new Promise(() => {})
        }

        const cause = new Event(`test-event`, {
            acknowledge: true
        })

        try {
            const info = server.connectionManager.getAllConnections()[0]
            const event = await server.sendEvent(info, cause)
            assert(!event, 'A timeout error should have been thrown')
        } catch (e) {
            assert(e, 'A timeout error should have been thrown')
        }
    })
    it('Server: event{ack: false} --> Client: event', async () => {
        client.onEvent = async (cause, reply) => {
            return new Event('test-event').inherit(cause)
        }

        const cause = new Event(`test-event`, {
            acknowledge: false
        })

        const info = server.connectionManager.getAllConnections()[0]
        const event = await server.sendEvent(info, cause)
        assert(!event, 'An event should NOT be returned')
    })
    it('Server: event{ack: false} --> Client: no-reply', async () => {
        client.onEvent = (cause, reply) => {
            return new Promise(() => {})
        }

        const cause = new Event(`test-event`, {
            acknowledge: true
        })

        try {
            const info = server.connectionManager.getAllConnections()[0]
            const event = await server.sendEvent(info, cause)
            assert(!event, 'A timeout error should have been thrown')
        } catch (e) {
            assert(e, 'A timeout error should have been thrown')
        }
    })

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
            const temp = new Edc.Client(`ws://localhost:${port}`, clientHandlers, 1000)
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
            const temp = new Edc.Client(`ws://localhost:${port}`, clientHandlers, 1000)
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
            const temp = new Edc.Client(`ws://localhost:${port}`, clientHandlers, 1000)
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
            const temp = new Edc.Client(`ws://localhost:${port}`, clientHandlers, 1000)
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
            const temp = new Edc.Client(`ws://localhost:${port}`, clientHandlers, 1000)
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
            const temp = new Edc.Client(`ws://localhost:${port}`, clientHandlers, 50000)
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
    }).timeout(20000)
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
            const temp = new Edc.Client(`ws://localhost:${port}`, clientHandlers, 50000)
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
    }).timeout(20000)
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
            const temp = new Edc.Client(`ws://localhost:${port}`, clientHandlers, 50000)
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
    }).timeout(20000)
})
