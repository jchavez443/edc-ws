import WebSocket, { OpenEvent } from 'ws'
import { Events } from '../../events'
import { IAckEvent, IErrorEvent, IEvents } from '../../events/interface'
import ParentClient from '../parent-client'
// eslint-disable-next-line prettier/prettier
import {
    ClientHandlers,
    ClientOnClose,
    ClientOnConnect,
    EdcClient
} from './interfaces'

// eslint-disable-next-line import/prefer-default-export
export default class Client extends ParentClient implements EdcClient {
    ws: WebSocket

    onEvent

    onError

    onAck

    onConnect: ClientOnConnect = async () => {}

    onClose: ClientOnClose = async () => {}

    constructor(url: string, handlers: ClientHandlers, timeout?: number) {
        super()

        if (handlers.onConnect) this.onConnect = handlers.onConnect

        if (handlers.onClose) this.onClose = handlers.onClose

        this.onAck = handlers.onAck
        this.onError = handlers.onError
        this.onEvent = handlers.onEvent

        if (timeout) this.ackTimeout = timeout

        this.ws = new WebSocket(url)

        this.ws.onopen = (event) => {
            this.onConnect(this, this.ws, event)
        }
        this.ws.onmessage = (event) => {
            this.onMessage(this.ws, event)
        }
        this.ws.onclose = (event) => {
            this.onClose(this, this.ws, event)
            this.cleanUp(this.ws)
        }
    }

    protected async handleEvent(event: IEvents) {
        const reply = (newEvent: Events) => {
            return this.sendEvent(newEvent)
        }

        switch (event.type) {
            case 'error':
                await this.onError(event as IErrorEvent, reply)
                break
            case `acknowledgement`:
                await this.onAck(event as IAckEvent, reply)
                break
            default:
                await this.onEvent(event, reply)
        }
    }

    public sendEvent(event: Events): Promise<IEvents> {
        return this.send(this.ws, event)
    }

    public async awaitReady(): Promise<void> {
        let count = 0

        const check = (resolve: any, reject: any) => {
            if (this.ws.readyState === WebSocket.OPEN) {
                resolve()
            } else if (count < 10) {
                count += 1
                setTimeout(check, 200, resolve, reject)
            } else {
                reject('Websocket connection never made')
            }
        }

        return new Promise(check)
    }

    public close(): Promise<void> {
        this.ws.close()
        let count = 0

        const check = (resolve: any, reject: any) => {
            if (this.ws.readyState === WebSocket.CLOSED) {
                resolve()
            } else if (count < 3) {
                count += 1
                setTimeout(check, 500, resolve, reject)
            } else {
                reject('Websocket connection never closed')
            }
        }

        return new Promise(check)
    }
}
