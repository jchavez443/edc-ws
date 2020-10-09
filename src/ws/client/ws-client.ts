import WebSocket, { OpenEvent } from 'ws'
import { IAckEvent, IErrorEvent, IEvent, IEvents } from '../../interface'
/* eslint-disable class-methods-use-this */
import Edc from '../common'

export default class Client extends Edc {
    ws: WebSocket

    constructor(
        url: string,
        handlers: {
            onEvent: (client: Client, ws: WebSocket, event: IEvent<any>) => Promise<any>
            onError: (client: Client, ws: WebSocket, event: IErrorEvent) => Promise<any>
            onAck: (client: Client, ws: WebSocket, event: IAckEvent) => Promise<any>
        },
        timeout?: number
    ) {
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

    private onConnection(event: OpenEvent): void {
        event.target.send(`Client protocol: edc '1.0'`)
    }

    onClose(ws: WebSocket, event: WebSocket.CloseEvent) {
        console.log(`Connection closed`)
    }

    public sendEvent(event: IEvents): Promise<IEvents> {
        return this.send(this.ws, event)
    }
}
