/* eslint-disable no-use-before-define */
import http, { IncomingMessage } from 'http'
import https from 'https'
import WebSocket from 'ws'
import { IAckEvent, IErrorEvent, IEvent, IEvents, Events } from '../../events'
import ParentClient from '../parent-client'
import { Auth } from './authentication/interfaces'

export interface EdcServer extends ParentClient {
    sendEvent: ServerSendEvent
    broadCast: ServerBroadCastEvent

    onEvent: ServerOnEvent
    onError: ServerOnError
    onAck: ServerOnAck
    onConnect: ServerOnConnect
    onClose: ServerOnClose

    authenticate: ServerAuthenticate
}

export type ServerAuthenticate = (request: IncomingMessage) => Auth

export type ServerSendEvent = (connection: WebSocket, event: Events) => Promise<IEvents>
export type ServerReplyEvent = (event: Events) => Promise<IEvents>

export type ServerBroadCastEvent = (event: Events) => void

export type ServerOnEvent = (
    event: IEvent<any, any>,
    connection: WebSocket,
    reply: ServerReplyEvent,
    send: ServerSendEvent,
    server: EdcServer
) => Promise<any>

export type ServerOnError = (
    event: IErrorEvent,
    connection: WebSocket,
    reply: ServerReplyEvent,
    send: ServerSendEvent,
    server: EdcServer
) => Promise<any>

export type ServerOnAck = (
    event: IAckEvent,
    connection: WebSocket,
    reply: ServerReplyEvent,
    send: ServerSendEvent,
    server: EdcServer
) => Promise<any>

export type ServerOnConnect = (
    connection: WebSocket,
    auth: Auth,
    event: IncomingMessage,
    server: EdcServer
) => Promise<any>

export type ServerOnClose = (event: WebSocket.CloseEvent, ws: WebSocket, server: EdcServer) => Promise<any>

export interface ServerHandlers {
    onEvent: ServerOnEvent
    onError: ServerOnError
    onAck: ServerOnAck
    onConnect?: ServerOnConnect
    onClose?: ServerOnClose
    authenticate?: ServerAuthenticate
}

export interface ServerOptions {
    timeout?: number
    htpServerOptions?: http.ServerOptions | https.ServerOptions
    https?: boolean
}
