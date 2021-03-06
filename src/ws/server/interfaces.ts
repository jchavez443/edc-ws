/* eslint-disable no-use-before-define */
import http, { IncomingMessage } from 'http'
import https from 'https'
import WebSocket from 'ws'
import { AckEvent, ErrorEvent, Event, Events } from 'edc-events'
import ParentClient from '../parent-client'
import { Auth } from './authentication/interfaces'
import { AckReply } from '..'

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

export type ServerAuthenticate = (request: IncomingMessage) => Promise<Auth>

export type ServerSendEvent = (connection: WebSocket, event: Events) => Promise<AckReply>
export type ServerReplyEvent = (event: Events) => Promise<AckReply>

export type ServerBroadCastEvent = (event: Events) => void

export type ServerOnEventHandler = (
    event: Event<any, any>,
    connection: WebSocket,
    reply: ServerReplyEvent,
    send: ServerSendEvent,
    server: EdcServer
) => Promise<any> | any

export type ServerOnEvent = (eventType: string, handler: ServerOnEventHandler) => void

export type ServerOnError = (
    event: ErrorEvent<any>,
    connection: WebSocket,
    reply: ServerReplyEvent,
    send: ServerSendEvent,
    server: EdcServer
) => Promise<any> | any

export type ServerOnAck = (
    event: AckEvent,
    connection: WebSocket,
    reply: ServerReplyEvent,
    send: ServerSendEvent,
    server: EdcServer
) => Promise<any> | any

export type ServerOnConnect = (
    connection: WebSocket,
    auth: Auth,
    event: IncomingMessage,
    server: EdcServer
) => Promise<any> | any

export type ServerOnClose = (event: WebSocket.CloseEvent, ws: WebSocket, server: EdcServer) => Promise<any> | any

export interface ServerOptions {
    timeout?: number
    htpServerOptions?: http.ServerOptions | https.ServerOptions
    https?: boolean
}
