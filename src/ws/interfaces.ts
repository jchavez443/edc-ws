import { ClientOnEventHandler, ClientSendEvent } from './client'
import { ServerOnEventHandler, ServerSendEvent } from './server'

export type SendEvent = ClientSendEvent | ServerSendEvent

export type OnEventHandlers = ServerOnEventHandler | ClientOnEventHandler

export interface Route {
    eventType: string

    handler: OnEventHandlers
}
