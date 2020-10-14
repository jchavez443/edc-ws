/* eslint-disable no-use-before-define */
import { IncomingMessage } from 'http'
import WebSocket from 'ws'
import { IAckEvent, IErrorEvent, IEvent, IEvents, Events } from '../../events'
import ParentClient from '../parent-client'
import { ConnectionInfo } from './connections'

export interface EdcServer extends ParentClient {
    sendEvent: ServerSendEvent
    broadCast: ServerBroadCastEvent

    onEvent: ServerOnEvent
    onError: ServerOnError
    onAck: ServerOnAck
    onConnect: ServerOnConnect
    onClose: ServerOnClose
}

export type ServerSendEvent = (connectionInfo: ConnectionInfo, event: Events) => Promise<IEvents>
export type ServerReplyEvent = (event: Events) => Promise<IEvents>

export type ServerBroadCastEvent = (event: Events) => void

export type ServerOnEvent = (
    event: IEvent<any>,
    connectionInfo: ConnectionInfo,
    reply: ServerReplyEvent,
    send: ServerSendEvent
) => Promise<any>

export type ServerOnError = (
    event: IErrorEvent,
    connectionInfo: ConnectionInfo,
    reply: ServerReplyEvent,
    send: ServerSendEvent
) => Promise<any>

export type ServerOnAck = (
    event: IAckEvent,
    connectionInfo: ConnectionInfo,
    reply: ServerReplyEvent,
    send: ServerSendEvent
) => Promise<any>

export type ServerOnConnect = (
    server: EdcServer,
    connectionInfo: ConnectionInfo,
    event: IncomingMessage
) => Promise<any>

export type ServerOnClose = (server: EdcServer, ws: WebSocket, event: WebSocket.CloseEvent) => Promise<any>

export interface ServerHandlers {
    onEvent: ServerOnEvent
    onError: ServerOnError
    onAck: ServerOnAck
    onConnect?: ServerOnConnect
    onClose?: ServerOnClose
}
