/* eslint-disable no-use-before-define */
import WebSocket, { OpenEvent } from 'ws'
import { AckEvent, ErrorEvent, Event, Events } from 'edc-events'
import ParentClient from '../parent-client'
import { AckReply } from '..'

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

export type ClientSendEvent = (event: Events) => Promise<AckReply>

export type ClientOnEventHandler = (event: Event<any, any>, reply: ClientSendEvent) => Promise<any> | any

export type ClientOnEvent = (eventType: string, handler: ClientOnEventHandler) => void

export type ClientOnError = (event: ErrorEvent<any>, reply: ClientSendEvent) => Promise<any> | any

export type ClientOnAck = (event: AckEvent, reply: ClientSendEvent) => Promise<any> | any

export type ClientOnConnect = (client: EdcClient, ws: WebSocket, event: OpenEvent) => Promise<any> | any

export type ClientOnClose = (client: EdcClient, ws: WebSocket, event: WebSocket.CloseEvent) => Promise<any> | any

export interface ClientOptions {
    auth?: string
    timeout?: number
}
