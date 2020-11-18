import 'mocha'
import { assert } from 'chai'
import { Event } from 'edc-events'
import Edc from '../src'

import routes from './routes'

const port = 8085

const server = new Edc.Server(port)
server.register(routes)
server.listen()

const client = new Edc.Client(`ws://localhost:${port}`)
client.onEvent('*', async () => {})
client.start()

beforeEach(`Clear events and await client connection`, async () => {
    await client.awaitReady()
})

after('TearDown', async () => {
    server.close()
})

describe('Test Routes Register', () => {
    it('Check the routes work', async () => {
        const toRoute1 = new Event('route-1', { acknowledge: true })
        const toRoute2 = new Event('route-2', { acknowledge: true })

        const reply1 = await client.sendEvent(toRoute1)
        const reply2 = await client.sendEvent(toRoute2)

        assert(!reply1.async, `Reply1 should not be async`)
        assert(!reply2.async, `Reply2 should not be async`)
        assert(reply1.event, `Reply1 should have an event but was ${reply1.event}`)
        assert(reply2.event, `Reply2 should have an event but was ${reply2.event}`)

        assert(
            reply1.event?.type === 'answer-route-1',
            `The reply should have been 'answer-route-1' but was ${reply1.event?.type} `
        )

        assert(
            reply2.event?.type === 'answer-route-2',
            `The reply should have been 'answer-route-2' but was ${reply2.event?.type} `
        )
    })
    it('Check the sub routes work', async () => {
        const toSubRoute1 = new Event('route-sub-1', { acknowledge: true })
        const toSubRoute2 = new Event('route-sub-2', { acknowledge: true })

        const reply1 = await client.sendEvent(toSubRoute1)
        const reply2 = await client.sendEvent(toSubRoute2)

        assert(!reply1.async, `Reply1 should not be async`)
        assert(!reply2.async, `Reply2 should not be async`)
        assert(reply1.event, `Reply1 should have an event but was ${reply1.event}`)
        assert(reply2.event, `Reply2 should have an event but was ${reply2.event}`)

        assert(
            reply1.event?.type === 'answer-route-sub-1',
            `The reply should have been 'answer-route-sub-1' but was ${reply1.event?.type} `
        )

        assert(
            reply2.event?.type === 'answer-route-sub-2',
            `The reply should have been 'answer-route-sub-1' but was ${reply2.event?.type} `
        )
    })
})
