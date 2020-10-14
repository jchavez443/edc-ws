import { ClientHandlers, ClientSendEvent } from './client'
import { ServerHandlers, ServerSendEvent } from './server'

export type SendEvent = ClientSendEvent | ServerSendEvent

export type Handlers = ServerHandlers | ClientHandlers
