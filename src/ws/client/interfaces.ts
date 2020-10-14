/* eslint-disable no-use-before-define */
import WebSocket, { OpenEvent } from 'ws'
import { IAckEvent, IErrorEvent, IEvent, IEvents } from '../../events/interface'
import { Events } from '../../events'
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

export type ClientSendEvent = (event: Events) => Promise<IEvents>

export type ClientOnEvent = (event: IEvent<any>, reply: ClientSendEvent) => Promise<any>

export type ClientOnError = (event: IErrorEvent, reply: ClientSendEvent) => Promise<any>

export type ClientOnAck = (event: IAckEvent, reply: ClientSendEvent) => Promise<any>

export type ClientOnConnect = (client: EdcClient, ws: WebSocket, event: OpenEvent) => Promise<any>

export type ClientOnClose = (client: EdcClient, ws: WebSocket, event: WebSocket.CloseEvent) => Promise<any>

export interface ClientHandlers {
    onEvent: ClientOnEvent
    onError: ClientOnError
    onAck: ClientOnAck
    onConnect?: ClientOnConnect
    onClose?: ClientOnClose
}
