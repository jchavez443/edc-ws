import 'mocha'
import { assert } from 'chai'
import { AckEvent, ErrorEvent, Event } from 'edc-events'
import Edc, { AckedErrorEvent, TimeoutError, UnknownEventErrorEvent } from '../src'

const port = 8081

const server = new Edc.Server(port, {
    timeout: 500
})

server.onEvent('test-event', async (event, conn, reply, send, that) => {})
server.listen()

const client = new Edc.Client(`ws://localhost:${port}`, { timeout: 500 }).start()
const client2 = new Edc.Client(`ws://localhost:${port}`, { timeout: 500 }).start()

client.onEvent('test-event', async (event, reply) => {})
client2.onEvent('test-event', async (event, reply) => {})

type Details = { foo: string; bar: number }
type Shared = { who: string; where: string }

const commonEvent = new Event<Details, Shared>('test-event', {
    acknowledge: true,
    details: {
        bar: 100,
        foo: 'string here'
    },
    shared: {
        where: 'to',
        who: 'from'
    }
})

const commonError = new ErrorEvent({
    cn: 'cn',
    code: 1234,
    message: 'simple message',
    failed: JSON.stringify(commonEvent)
})

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

describe('Test Client & Server behavior', () => {
    it('Client: event{ack: true} --> Server: ack', async () => {
        const event = new Event(`test-event`, {
            acknowledge: true
        })

        const reply = await client.sendEvent(event)

        if (!reply.async && reply.event) {
            assert(reply.event.type, 'Has type')
        }

        assert(reply, 'Acknowledgemnt not returned')

        assert(reply.trigger === event.id, 'Acknowledgemnt trigger != cause.id')
    })
    it('Client: event{ack: true} --> Server: error', async () => {
        server.onEvent('test-event', async (cause, connection, reply) => {
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
        })

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
        server.onEvent('test-event', async (cause, connection, reply) => {
            reply(new Event('test-event').inherit(cause))
        })

        const event = new Event(`test-event`, {
            acknowledge: true
        })

        const ack = await client.sendEvent(event)

        assert(ack, 'Acknowledgemnt not returned')

        assert(ack.trigger === event.id, 'Acknowledgemnt trigger != cause.id')
        assert(ack.type === 'test-event', 'Wasnt an event.type = "test-event"')
    })
    it('Client: event{ack: true} --> Server: no-reply', async () => {
        server.onEvent('test-event', (cause, connection, reply) => {
            return new Promise((resolve, reject) => {})
        })

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
        server.onEvent('test-event', async (cause, connection, reply) => {
            reply(new Event('test-event').inherit(cause))
        })

        const event = new Event(`test-event`, {
            acknowledge: false
        })

        const ack = await client.sendEvent(event)

        assert(!ack.event, 'Acknowledgemnt, event needs to be undefined')
    })
    it('Client: event{ack: false} --> Server: no-reply', async () => {
        server.onEvent('test-event', async (cause, connection, reply, send) => {
            return new Promise((resolve, reject) => {})
        })

        const event = new Event(`test-event`, {
            acknowledge: false
        })

        const reply = await client.sendEvent(event)

        assert(!reply.event, 'Acknowledgemnt, event needs to be undefined')
        assert(reply.async, 'The reply needs to be async')
    })

    it('Server: event{ack: true} --> Client: ack', async () => {
        const event = new Event(`test-event`, {
            acknowledge: true
        })

        const connection = server.wss?.clients.values().next().value
        const ack = await server.sendEvent(connection, event)

        assert(ack, 'Acknowledgemnt undefined')
        assert(ack.trigger === event.id, 'Ack trigger == event')
    })
    it('Server: event{ack: true} --> Client: error', async () => {
        client.onEvent('test-event', async (cause, reply) => {
            const error = new ErrorEvent(cause, {
                code: 400,
                cn: 'cn',
                message: 'simple message',
                data: null
            })
            reply(error)
        })

        const event = new Event(`test-event`, {
            acknowledge: true
        })

        try {
            const connection = server.wss?.clients.values().next().value
            const error = await server.sendEvent(connection, event)
            assert(error || !error, 'Error should have been thrown by server')
        } catch (e) {
            assert(e, 'An Error should have been thrown')
        }
    })
    it('Server: event{ack: true} --> Client: event', async () => {
        client.onEvent('test-event', async (cause, reply) => {
            const event = new Event('test-event').inherit(cause)
            reply(event)
        })

        const cause = new Event(`test-event`, {
            acknowledge: true
        })

        const connection = server.wss?.clients.values().next().value
        const event = await server.sendEvent(connection, cause)
        assert(event, 'An event should have been returned')
        assert(event.trigger === cause.id)
    })
    it('Server: event{ack: true} --> Client: no-reply', async () => {
        client.onEvent('test-event', (cause, reply) => {
            return new Promise(() => {})
        })

        const cause = new Event(`test-event`, {
            acknowledge: true
        })

        try {
            const connection = server.wss?.clients.values().next().value
            const event = await server.sendEvent(connection, cause)
            assert(!event, 'A timeout error should have been thrown')
        } catch (e) {
            assert(e, 'A timeout error should have been thrown')
        }
    })
    it('Server: event{ack: false} --> Client: event', async () => {
        client.onEvent('test-event', async (cause, reply) => {
            return new Event('test-event').inherit(cause)
        })

        const cause = new Event(`test-event`, {
            acknowledge: false
        })

        const info = server.wss?.clients.values().next().value
        const reply = await server.sendEvent(info, cause)
        assert(!reply.event, 'An NO event should be returned')
        assert(reply.async, 'the reply should not be async')
    })
    it('Server: event{ack: false} --> Client: no-reply', async () => {
        client.onEvent('test-event', (cause, reply) => {
            return new Promise(() => {})
        })

        const cause = new Event(`test-event`, {
            acknowledge: true
        })

        try {
            const info = server.wss?.clients.values().next().value
            const event = await server.sendEvent(info, cause)
            assert(!event, 'A timeout error should have been thrown')
        } catch (e) {
            assert(e, 'A timeout error should have been thrown')
        }
    })

    it('Server: types --> Client: event', async () => {
        server.onEvent('test-event-2', (cause, conn, reply) => {
            reply(new Event('success2').inherit(cause))
        })

        const cause = new Event(`test-event-2`, {
            acknowledge: true
        })

        try {
            const reply = await client.sendEvent(cause)
            assert(reply.event, 'an event should be returned')
            assert(reply.type === 'success2', 'The type returned should match new event path')
            assert(reply.event?.trigger === cause.id, 'trigger should match cause id')
        } catch (e) {
            assert(false, 'No error should be thrown')
        }
    })
    it('Server: types --> Client: unknown event', async () => {
        const cause = new Event(`test-event-unknown`, {
            acknowledge: true
        })

        try {
            const reply = await client.sendEvent(cause)
            assert(false, 'an event should NOT be returned')
        } catch (e) {
            assert(e, 'Error should be thrown')
            assert(e instanceof AckedErrorEvent, 'Error should be of type AckedErrorEvent')

            const err = e as AckedErrorEvent<any>
            const actual = new UnknownEventErrorEvent(cause)
            assert(err.code === actual.details.code)
            assert(err.cn === actual.details.cn)
        }
    })
    it('Server: types --> Client: * event', async () => {
        server.onEvent('*', (cause, conn, reply) => {
            reply(new Event('success-any').inherit(cause))
        })

        const cause = new Event(`test-event-any`, {
            acknowledge: true
        })

        try {
            const reply = await client.sendEvent(cause)
            assert(reply.event, 'an event should be returned')
            assert(reply.type === 'success-any', 'The type returned should match new event path')
            assert(reply.event?.trigger === cause.id, 'trigger should match cause id')
        } catch (e) {
            assert(false, 'Error should not be thrown')
        }
    })

    it('Client awaitTrigger(trigger) --> server', async () => {
        server.onEvent('*', (cause, conn, reply) => {
            reply(new Event('success-any').inherit(cause))
        })

        const cause = new Event(`test-event-any`)

        const trip = new Promise((resolve, reject) => {
            client.awaitTrigger(cause.id, (event) => {
                try {
                    assert(event.trigger === cause.id, 'The awaitTrigger did not catch the trigger id')
                    resolve()
                } catch (e) {
                    reject(e.message)
                }
            })
        })

        try {
            const reply = await client.sendEvent(cause)
            assert(reply.async, 'Reply should be async')

            await trip
        } catch (e) {
            assert(false, e.message)
        }
    })

    it('Server: onEvent', async () => {
        server.onEvent(commonEvent.type, async (cause, ws, reply, send) => {
            const event = cause.caused(new Event('new-event'))
            reply(event)
        })

        const reply = await client.sendEvent(commonEvent)

        if (reply.event) {
            const newEvent = reply.event.caused(new Event('final'))
            assert(newEvent.trigger === reply.id, 'new event trigger === reply id')
        } else {
            // either async or an ACK
        }
    })
    it('Server: onError', async () => {
        server.onError = async (cause, ws, reply, send) => {
            assert(cause instanceof ErrorEvent, 'needs to be an Error Event')
        }

        const reply = await client.sendEvent(new ErrorEvent(commonError))

        assert(!reply.event, 'Reply should be undefined')
        assert(reply.async, 'The reply should be async')
    })
    it('Server: onAck', async () => {
        server.onAck = async (cause, ws, reply, send) => {
            assert(cause instanceof AckEvent, 'Needs to be and AckEvent')
        }

        const reply = await client.sendEvent(new AckEvent(commonEvent))

        assert(!reply.event, 'Reply event should be undefined')
        assert(reply.async, 'Reply should be async')
    })

    it('Client: Invalid Request --> Server: Invalid Event Error', async () => {
        const badJson = '{ error: not json }'

        const trip = new Promise((resolve, reject) => {
            client.onError = async (cause, reply) => {
                try {
                    assert(
                        cause.details.code === 32600,
                        `code should match Invalid JSON code 32600: ${cause.details.code}`
                    )
                    assert(cause.details.failed === badJson)
                    resolve()
                } catch (e) {
                    reject(e.message)
                }
            }
        })

        try {
            // @ts-ignore // Need to ignore for this test
            const ack = await client.sendEvent(badJson)
            assert(!ack.event, 'Should have no event')
            assert(ack.async, 'Reply should be async')
        } catch (e) {
            assert(false, 'No error should have made it here.  Should be in client.onError ')
        }
        await trip.catch((msg) => {
            assert(false, msg)
        })
    })
    it('Client: Invalid Request --> Server: Invalid Event Error V2', async () => {
        const badObject = {
            test: 'this is not needed',
            test2: 'we are missing some items'
        }

        const trip = new Promise((resolve, reject) => {
            client.onError = async (cause, reply) => {
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
            // @ts-ignore // Need to ignore for this test
            const ack = await client.sendEvent(badObject)
            assert(!ack.event, 'Should have no event')
            assert(ack.async, 'Reply should be async')
        } catch (e) {
            assert(false, 'No error should have made it here.  Should be in server.onError ')
        }
        await trip.catch((msg) => {
            assert(false, msg)
        })
    })
    it('Client: Invalid Error Request --> Server: Invalid Event Error Obj', async () => {
        const badObject = {
            edc: '1.0',
            id: 'id',
            type: 'error',
            details: {
                missing: 'should have code for Error Object'
            }
        }

        const trip = new Promise((resolve, reject) => {
            client.onError = async (cause, reply) => {
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
            // @ts-ignore // Need to ignore for this test
            const ack = await client.sendEvent(badObject)
            assert(!ack.event, 'Should have no event')
            assert(ack.async, 'Reply should be async')
        } catch (e) {
            assert(false, 'No error should have made it here.  Should be in server.onError ')
        }
        await trip.catch((msg) => {
            assert(false, msg)
        })
    })
    it('Client: Invalid Request w/ ACk --> Server: Invalid Event Error Obj', async () => {
        const badObject = {
            edc: '1.0',
            type: 'bad-test-event-with-ack',
            acknowledge: true
        }

        const trip = new Promise((resolve, reject) => {
            client.onError = async (cause, reply) => {
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
            // @ts-ignore // Need to ignore for this test
            const ack = await client.sendEvent(badObject)
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
