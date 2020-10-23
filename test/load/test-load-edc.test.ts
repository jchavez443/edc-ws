import 'mocha'
import { assert } from 'chai'
import { Event } from 'edc-events'
import Edc, { Client, AckReply } from '../../src'

const port = 8082

const server = new Edc.Server(port, {
    timeout: 500
})
server.onEvent('test-event', async () => {})

const client = new Edc.Client(`ws://localhost:${port}`, { timeout: 500 })
const client2 = new Edc.Client(`ws://localhost:${port}`, { timeout: 500 })

beforeEach(`Clear events an await connections`, async () => {
    await client.awaitReady()
    await client2.awaitReady()

    server.onError = async () => {}
    server.onAck = async () => {}

    client.onError = async () => {}
    client.onAck = async () => {}

    client2.onError = async () => {}
    client2.onAck = async () => {}
})

after('TearDown', async () => {
    server.close()
})

describe('Test Client & Server loads', () => {
    it('Multiple Clients: event{ack: true} --> Server: ack', async () => {
        const cause = new Event(`test-event`, {
            acknowledge: true
        })

        const cause2 = new Event('test-event', {
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
        server.onEvent('test-event', (event, conn, reply, send) => {
            const pause = Math.floor(Math.random() * Math.floor(200))
            return new Promise((resolve) => {
                setTimeout(resolve, pause)
            })
        })

        const promises: Promise<AckReply>[] = []
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
        server.onEvent('test-event', (cause, conn, reply, send) => {
            const pause = Math.floor(Math.random() * Math.floor(500))
            return new Promise((resolve) => {
                setTimeout(resolve, pause)
            })
        })

        const clients: Client[] = []
        const awaitReadys: Promise<any>[] = []

        for (let i = 0; i <= 25; i += 1) {
            const temp = new Edc.Client(`ws://localhost:${port}`, { timeout: 1000 })
            clients.push(temp)
            awaitReadys.push(temp.awaitReady())
        }

        await Promise.all(awaitReadys)

        const promises: Promise<AckReply>[] = []
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

        server.onEvent('test-event', (cause, conn, reply, send) => {
            const pause = Math.floor(Math.random() * Math.floor(300))
            return new Promise((resolve) => {
                setTimeout(resolve, pause)
            })
        })

        const clients: Client[] = []
        const awaitReadys: Promise<any>[] = []

        for (let i = 0; i <= numberOfClients; i += 1) {
            const temp = new Edc.Client(`ws://localhost:${port}`, { timeout: 1000 })
            clients.push(temp)
            awaitReadys.push(temp.awaitReady())
        }

        await Promise.all(awaitReadys)

        const promises: Promise<AckReply>[] = []
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

        server.onEvent('test-event', (cause, conn, reply, send) => {
            const pause = Math.floor(Math.random() * Math.floor(300))
            return new Promise((resolve) => {
                setTimeout(resolve, pause)
            })
        })

        const clients: Client[] = []
        const awaitReadys: Promise<any>[] = []

        for (let i = 0; i <= numberOfClients; i += 1) {
            const temp = new Edc.Client(`ws://localhost:${port}`, { timeout: 1000 })
            clients.push(temp)
            awaitReadys.push(temp.awaitReady())
        }

        await Promise.all(awaitReadys)

        const promises: Promise<AckReply>[] = []
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

        server.onEvent('test-event', (cause, conn, reply, send) => {
            const pause = Math.floor(Math.random() * Math.floor(300))
            return new Promise((resolve) => {
                setTimeout(resolve, pause)
            })
        })

        const clients: Client[] = []
        const awaitReadys: Promise<any>[] = []

        for (let i = 0; i <= numberOfClients; i += 1) {
            const temp = new Edc.Client(`ws://localhost:${port}`, { timeout: 1000 })
            clients.push(temp)
            awaitReadys.push(temp.awaitReady())
        }

        await Promise.all(awaitReadys)

        const promises: Promise<AckReply>[] = []
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
    it('Load Test,  231 Clients{ack: false} x 400 request/client', async () => {
        const numberOfClients = 231
        const eventsPerClient = 400

        server.onEvent('test-event', (cause, conn, reply, send) => {
            const pause = Math.floor(Math.random() * Math.floor(300))
            return new Promise((resolve) => {
                setTimeout(resolve, pause)
            })
        })

        const clients: Client[] = []
        const awaitReadys: Promise<any>[] = []

        for (let i = 0; i <= numberOfClients; i += 1) {
            const temp = new Edc.Client(`ws://localhost:${port}`, { timeout: 1000 })
            clients.push(temp)
            awaitReadys.push(temp.awaitReady())
        }

        await Promise.all(awaitReadys)

        const promises: Promise<AckReply>[] = []
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
            assert(!acks[i].event, 'Ack must be undefined')
            assert(acks[i].async, 'Reply must be async')
        }

        const closePromises: Promise<any>[] = []
        clients.forEach((tempClient) => {
            closePromises.push(tempClient.close())
        })

        Promise.all(closePromises)
    }).timeout(10000)
    it('Load Test,  231 Clients{ack: true} x 400 request/client', async () => {
        const numberOfClients = 231
        const eventsPerClient = 400

        server.onEvent('test-event', (cause, conn, reply, send) => {
            const pause = Math.floor(Math.random() * Math.floor(300))
            return new Promise((resolve) => {
                setTimeout(resolve, pause)
            })
        })

        const clients: Client[] = []
        const awaitReadys: Promise<any>[] = []

        for (let i = 0; i <= numberOfClients; i += 1) {
            const temp = new Edc.Client(`ws://localhost:${port}`, { timeout: 50000 })
            clients.push(temp)
            awaitReadys.push(temp.awaitReady())
        }

        await Promise.all(awaitReadys)

        const promises: Promise<AckReply>[] = []
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
    it('Load Test,  231 Clients{ack: true} x 1 request/client', async () => {
        const numberOfClients = 231
        const eventsPerClient = 1

        server.onEvent('test-event', (cause, conn, reply, send) => {
            const pause = Math.floor(Math.random() * Math.floor(300))
            return new Promise((resolve) => {
                setTimeout(resolve, pause)
            })
        })

        const clients: Client[] = []
        const awaitReadys: Promise<any>[] = []

        for (let i = 0; i <= numberOfClients; i += 1) {
            const temp = new Edc.Client(`ws://localhost:${port}`, { timeout: 50000 })
            clients.push(temp)
            awaitReadys.push(temp.awaitReady())
        }

        await Promise.all(awaitReadys)

        const promises: Promise<AckReply>[] = []
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

        server.onEvent('test-event', (cause, conn, reply, send) => {
            const pause = Math.floor(Math.random() * Math.floor(300))
            return new Promise((resolve) => {
                setTimeout(resolve, pause)
            })
        })

        const clients: Client[] = []
        const awaitReadys: Promise<any>[] = []

        for (let i = 0; i <= numberOfClients; i += 1) {
            const temp = new Edc.Client(`ws://localhost:${port}`, { timeout: 50000 })
            clients.push(temp)
            awaitReadys.push(temp.awaitReady())
        }

        await Promise.all(awaitReadys)

        const promises: Promise<AckReply>[] = []
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

        server.onEvent('test-event', (cause, conn, reply, send) => {
            const pause = Math.floor(Math.random() * Math.floor(300))
            return new Promise((resolve) => {
                setTimeout(resolve, pause)
            })
        })

        const clients: Client[] = []
        const awaitReadys: Promise<any>[] = []

        for (let i = 0; i <= numberOfClients; i += 1) {
            const temp = new Edc.Client(`ws://localhost:${port}`, { timeout: 50000 })
            clients.push(temp)
            awaitReadys.push(temp.awaitReady())
        }

        await Promise.all(awaitReadys)

        const promises: Promise<AckReply>[] = []
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
            assert(!acks[i].event, 'Reply event must be undefined')
            assert(acks[i].async, 'Reply must be async')
        }

        const closePromises: Promise<any>[] = []
        clients.forEach((tempClient) => {
            closePromises.push(tempClient.close())
        })

        Promise.all(closePromises)
    }).timeout(60000)
})
