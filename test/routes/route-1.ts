import { ServerOnEventHandler, Event } from '../../src'

export const eventType = 'route-1'

export const handler: ServerOnEventHandler = async (cause, conn, reply) => {
    const event = new Event('answer-route-1').inherit(cause)
    reply(event)
}
