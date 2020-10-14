import 'mocha'
import { expect, assert } from 'chai'
import { AckEvent, Event, ErrorEvent } from '../src'

describe('Test Event Objects', () => {
    it('Event type', async () => {
        const type = 'test-type'
        const sharedId = 'sharedId'

        const cause = new Event(type, {
            shared: {
                id: sharedId
            }
        })

        const event = new Event('inherit-test').inherit(cause)

        assert(event.trigger === cause.id, 'new event.trigger must == cause.id')
        assert(event.shared.id === sharedId, 'The new event must copy the shared data')

        assert(cause.type === type, 'Type must be set during construction')
    })
    it('AckEvent', async () => {
        const type = 'test-type'
        const sharedId = 'sharedId'

        const cause = new Event(type, {
            shared: {
                id: sharedId
            }
        })

        const event = new AckEvent(cause)

        assert(event.trigger === cause.id, 'new event.trigger must == cause.id')
        assert(event.type === 'acknowledgement', 'event.type must be "acknowledgement"')
    })
    it('ErrorEvent', async () => {
        const type = 'test-type'
        const sharedId = 'sharedId'

        const cause = new Event(type, {
            shared: {
                id: sharedId
            }
        })

        const event = new ErrorEvent(cause, {
            cn: 'cn',
            code: 400,
            data: {
                test: 'test'
            },
            message: 'simple message'
        })

        assert(event.trigger === cause.id, 'new event.trigger must == cause.id')
        assert(event.type === 'error', 'event.type must be "error"')
        assert(event.failed, 'failed event must be included in error')
        assert(event.failed.id === cause.id, 'Failed event id must match cause')
        assert(event.failed.shared?.id === sharedId, 'Failed event must include the shared data')

        assert(event.details, 'Error Event must incude the details')
        assert(event.details.data?.test === 'test', 'Error Event must incude the details.data.test')
    })
})
