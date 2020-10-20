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
} from '../src'

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
        server.onEvent = async (cause, connection, reply) => {
            const error = new ErrorEvent<{ type: string; test: number }>(cause, {
                cn: 'cn',
                code: 400,
                data: {
                    type: 'adsf',
                    test: 1
                },
                message: 'This is the error'
            })
            reply(error)
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
            if (e instanceof TimeoutError) {
                assert(false, 'The request should not have timed out')
            } else if (e instanceof AckedErrorEvent) {
                assert(e.message, 'The error have a message')
                assert(e.failed, 'Error need the failed event')
                assert(e.trigger, 'Error needs a trigger')
                assert(e.cn, 'Errro needs "cn"')
                assert(e.code, 'Errro needs "cn"')
                assert(e.name === 'AckedErrorEvent', 'Name of error should be "AckedErrorEvent"')

                const err = <AckedErrorEvent<{ type: string; test: number }>>e
                assert(err.data?.test, 'err should have a test data')
                assert(err.data?.type, 'err should have a type in data')
            } else {
                assert(false, 'The error should of been of type AckedErrorEvent')
            }
        }
    })
    it('Client: event{ack: true} --> Server: event', async () => {
        server.onEvent = async (cause, connection, reply) => {
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
        server.onEvent = (cause, connection, reply) => {
            return new Promise((resolve, reject) => {})
        }

        const event = new Event(`test-event`, {
            acknowledge: true
        })

        try {
            const ack = await client.sendEvent(event)
            assert(false, 'A timeout error needed to be thrown')
        } catch (e) {
            assert(e, 'An error object needs to be thrown')
        }
    })
    it('Client: event{ack: false} --> Server: event', async () => {
        server.onEvent = async (cause, connection, reply) => {
            reply(new Event('test-event').inherit(cause))
        }

        const event = new Event(`test-event`, {
            acknowledge: false
        })

        const ack = await client.sendEvent(event)

        assert(!ack, 'Acknowledgemnt needs to be undefined')
    })
    it('Client: event{ack: false} --> Server: no-reply', async () => {
        server.onEvent = async (cause, connection, reply, send) => {
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

        const connection = server.wss.clients.values().next().value
        const ack = await server.sendEvent(connection, event)

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
            const connection = server.wss.clients.values().next().value
            const error = await server.sendEvent(connection, event)
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

        const connection = server.wss.clients.values().next().value
        const event = await server.sendEvent(connection, cause)
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
            const connection = server.wss.clients.values().next().value
            const event = await server.sendEvent(connection, cause)
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

        const info = server.wss.clients.values().next().value
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
            const info = server.wss.clients.values().next().value
            const event = await server.sendEvent(info, cause)
            assert(!event, 'A timeout error should have been thrown')
        } catch (e) {
            assert(e, 'A timeout error should have been thrown')
        }
    })

    it('Server: Invalid Request --> Client: Invalid Event Error', async () => {
        const badJson = '{ error: not json }'

        const trip = new Promise((resolve, reject) => {
            server.onError = async (cause, reply) => {
                try {
                    assert(cause.details.code === 32600, 'code should match Invalid JSON code')
                    assert(cause.details.failed === badJson)
                    resolve()
                } catch (e) {
                    reject(e.message)
                }
            }
        })

        try {
            const connection = server.wss.clients.values().next().value
            // @ts-ignore // Need to ignore for this test
            const ack = await server.sendEvent(connection, badJson)
            assert(!ack, 'An ACK will NOT be returned because event has no acknowledge.')
        } catch (e) {
            assert(false, 'No error should have made it here.  Should be in client.onError ')
        }
        await trip.catch((msg) => {
            assert(false, msg)
        })
    })
    it('Server: Invalid Request --> Client: Invalid Event Error V2', async () => {
        const badObject = {
            test: 'this is not needed',
            test2: 'we are missing some items'
        }

        const trip = new Promise((resolve, reject) => {
            server.onError = async (cause, reply) => {
                try {
                    assert(cause.details.code === 32600, 'code should match Invalid Event code')
                    assert(cause.details.failed === JSON.stringify(badObject))
                    resolve()
                } catch (e) {
                    reject(e.message)
                }
            }
        })

        try {
            const connection = server.wss.clients.values().next().value
            // @ts-ignore // Need to ignore for this test
            const ack = await server.sendEvent(connection, badObject)
            assert(!ack, 'An ACK will NOT be returned because event has no acknowledge.')
        } catch (e) {
            assert(false, 'No error should have made it here.  Should be in server.onError ')
        }
        await trip.catch((msg) => {
            assert(false, msg)
        })
    })
    it('Server: Invalid Error Request --> Client: Invalid Event Error Obj', async () => {
        const badObject = {
            edc: '1.0',
            id: 'id',
            type: 'error',
            details: {
                missing: 'should have code for Error Object'
            }
        }

        const trip = new Promise((resolve, reject) => {
            server.onError = async (cause, reply) => {
                try {
                    assert(cause.details.code === 32600, 'code should match Invalid Event code')
                    assert(cause.details.failed === JSON.stringify(badObject))
                    resolve()
                } catch (e) {
                    reject(e.message)
                }
            }
        })

        try {
            const connection = server.wss.clients.values().next().value
            // @ts-ignore // Need to ignore for this test
            const ack = await server.sendEvent(connection, badObject)
            assert(!ack, 'An ACK will NOT be returned because event has no acknowledge.')
        } catch (e) {
            assert(false, 'No error should have made it here.  Should be in server.onError ')
        }
        await trip.catch((msg) => {
            assert(false, msg)
        })
    })
    it('Server: Invalid Request w/ ACk --> Client: Invalid Event Error Obj', async () => {
        const badObject = {
            edc: '1.0',
            type: 'bad-test-event-with-ack',
            acknowledge: true
        }

        const trip = new Promise((resolve, reject) => {
            server.onError = async (cause, reply) => {
                try {
                    assert(cause.details.code === 32600, 'code should match Invalid Event code')
                    assert(cause.details.failed === JSON.stringify(badObject))
                    resolve()
                } catch (e) {
                    reject(e.message)
                }
            }
        })

        try {
            const connection = server.wss.clients.values().next().value
            // @ts-ignore // Need to ignore for this test
            const ack = await server.sendEvent(connection, badObject)
            assert(false, 'Object has no id but an ack.  Timeout should have been thrown.')
        } catch (e) {
            if (e instanceof TimeoutError) {
                assert(true, 'The request should have timed out')
                assert(e.message, 'There should be a message')
                assert(e.timeout, 'There should be a timeout time')
            } else if (e instanceof AckedErrorEvent) {
                assert(false, 'No id on cause event.  Should have thrown timeout')
            } else {
                assert(false, 'The error should of been of type Timeout')
            }
        }
        await trip.catch((msg) => {
            assert(false, msg)
        })
    })
})
