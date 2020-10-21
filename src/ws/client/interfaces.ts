/* eslint-disable no-use-before-define */
import WebSocket, { OpenEvent } from 'ws'
import { AckEvent, ErrorEvent, Event, IEvents, Events } from 'edc-events'
import ParentClient from '../parent-client'

export interface EdcClient extends ParentClient {
    sendEvent: ClientSendEvent

    onEvent: ClientOnEvent
    onError: ClientOnError
    onAck: ClientOnAck
    onConnect: ClientOnConnect
    onClose: ClientOnClose

    close(): Promise<void>
    awaitReady: () => Promise<void>
}

export type ClientSendEvent = (event: Events) => Promise<Event<any, any> | AckEvent>

export type ClientOnEvent = (event: Event<any, any>, reply: ClientSendEvent) => Promise<any>

export type ClientOnError = (event: ErrorEvent<any>, reply: ClientSendEvent) => Promise<any>

export type ClientOnAck = (event: AckEvent, reply: ClientSendEvent) => Promise<any>

export type ClientOnConnect = (client: EdcClient, ws: WebSocket, event: OpenEvent) => Promise<any>

export type ClientOnClose = (client: EdcClient, ws: WebSocket, event: WebSocket.CloseEvent) => Promise<any>

export interface ClientHandlers {
    onEvent: ClientOnEvent
    onError: ClientOnError
    onAck: ClientOnAck
    onConnect?: ClientOnConnect
    onClose?: ClientOnClose
}

export interface ClientOptions {
    auth?: string
    timeout?: number
}
