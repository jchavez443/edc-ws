import { ServerOnEventHandler, Event } from '../../../src'

export const eventType = 'route-sub-1'

export const handler: ServerOnEventHandler = async (cause, conn, reply) => {
    const event = new Event('answer-route-sub-1').inherit(cause)
    reply(event)
}
