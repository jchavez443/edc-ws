import WebSocket, { OpenEvent } from 'ws'
import { IEvents } from '../../interface'
import RootClient from '../common'
import { ClientHandlers } from '../interfaces'

// eslint-disable-next-line import/prefer-default-export
export default class Client extends RootClient {
    ws: WebSocket

    constructor(url: string, handlers: ClientHandlers, timeout?: number) {
        super(handlers)

        if (timeout) this.ackTimeout = timeout

        this.ws = new WebSocket(url)

        this.ws.onopen = (event) => {
            this.onConnection(event)
        }
        this.ws.onmessage = (event) => {
            this.onMessage(this.ws, event)
        }
        this.ws.onclose = (event) => {
            this.onClose(this.ws, event)
        }
    }

    // eslint-disable-next-line class-methods-use-this
    private onConnection(event: OpenEvent): void {
        event.target.send(`Client protocol: edc '1.0'`)
    }

    // eslint-disable-next-line class-methods-use-this
    onClose(ws: WebSocket, event: WebSocket.CloseEvent) {
        console.log(`Connection closed`)
    }

    public sendEvent(event: IEvents): Promise<IEvents> {
        return this.send(this.ws, event)
    }
}
