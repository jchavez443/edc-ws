import { ServerOnEventHandler, Event } from '../../src'

export const eventType = 'route-2'

export const handler: ServerOnEventHandler = async (cause, conn, reply) => {
    const event = new Event('answer-route-2').inherit(cause)
    reply(event)
}
