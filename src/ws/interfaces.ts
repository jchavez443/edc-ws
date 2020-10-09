import WebSocket from 'ws'
import { IAckEvent, IErrorEvent, IEvent } from '../interface'
import Client from './client'
import Server from './server'

export interface ServerHandlers {
    onEvent: (wss: Server, ws: WebSocket, event: IEvent<any>) => Promise<any>
    onError: (wss: Server, ws: WebSocket, event: IErrorEvent) => Promise<any>
    onAck: (wss: Server, ws: WebSocket, event: IAckEvent) => Promise<any>
}

export interface ClientHandlers {
    onEvent: (client: Client, ws: WebSocket, event: IEvent<any>) => Promise<any>
    onError: (client: Client, ws: WebSocket, event: IErrorEvent) => Promise<any>
    onAck: (client: Client, ws: WebSocket, event: IAckEvent) => Promise<any>
}

export type Handlers = ClientHandlers | ServerHandlers
