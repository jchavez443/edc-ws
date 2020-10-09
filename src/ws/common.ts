import { on } from 'process'
/* eslint-disable class-methods-use-this */
import WebSocket, { MessageEvent, CloseEvent } from 'ws'
import { Events, AckEvent, ErrorEvent, Event } from '../events/index'
import { IAckEvent, IErrorEvent, IEvent, IEvents } from '../interface'

export default abstract class Edc {
    protected requestedAcks: Map<
        string,
        [timeout: NodeJS.Timeout, resolve: (event: IEvents) => void, reject: (reason: any) => void]
    > = new Map()

    protected incomingAcks: Set<string> = new Set()

    protected ackTimeout: number = 5000

    /**
     * @returns Promise
     */
    onEvent: (edc: Edc, ws: WebSocket, event: IEvent<any>) => Promise<any>

    onError: (edc: Edc, ws: WebSocket, event: IErrorEvent) => Promise<any>

    onAck: (edc: Edc, ws: WebSocket, event: IAckEvent) => Promise<any>

    constructor(handlers: {
        onEvent: (edc: Edc, ws: WebSocket, event: IEvent<any>) => Promise<any>
        onError: (edc: Edc, ws: WebSocket, event: IErrorEvent) => Promise<any>
        onAck: (edc: Edc, ws: WebSocket, event: IAckEvent) => Promise<any>
    }) {
        this.onAck = handlers.onAck
        this.onError = handlers.onError
        this.onEvent = handlers.onEvent
    }

    private preOnEvent(event: IEvents) {
        if ((event as IEvent<any>).acknowledge) {
            this.incomingAcks.add(event.id)
        }

        if (event.trigger === undefined || !this.requestedAcks.has(event.trigger)) return

        const tuple = this.requestedAcks.get(event.trigger)
        if (tuple === undefined) return

        const [ackTimeout, resolve, reject] = tuple
        clearTimeout(ackTimeout)
        this.requestedAcks.delete(event.trigger)

        if (event.type !== 'error') {
            resolve(event)
        } else {
            reject(new Error((event as ErrorEvent).details.message))
        }
    }

    onMessage(ws: WebSocket, msgEvent: MessageEvent) {
        let event
        try {
            event = JSON.parse(msgEvent.data.toString())
        } catch (e) {
            console.log(msgEvent.data)
            return
        }

        if (!Event.isEvent(event)) {
            throw new Error('the ws data is not Event data.')
        }

        this.preOnEvent(event)

        switch (event.type) {
            case 'error':
                this.onError(this, ws, event)
                break
            case `acknowledgement`:
                this.onAck(this, ws, event)
                break
            default:
                this.onEvent(this, ws, event)
        }

        if (event.acknowledge && this.incomingAcks.has(event.id)) {
            this.send(ws, new AckEvent(event))
        }
    }

    abstract onClose(ws: WebSocket, event: CloseEvent): any

    protected send(ws: WebSocket, event: IEvents): Promise<IEvents> {
        if (event.trigger !== undefined && this.incomingAcks.has(event.trigger)) {
            this.incomingAcks.delete(event.trigger)
        }

        return new Promise((resolve, reject) => {
            if ((event as Event<any>).acknowledge) {
                const ackTimeout = setTimeout(() => {
                    this.requestedAcks.delete(event.id)
                    reject(new Error(`Timeout waiting for ack for ${event.id}`))
                }, this.ackTimeout)
                this.requestedAcks.set(event.id, [ackTimeout, resolve, reject])

                ws.send(JSON.stringify(event))
            } else {
                ws.send(JSON.stringify(event))
                resolve() // we do not have the returned event.  ack not requested
            }
        })
    }

    abstract sendEvent(...args: any): Promise<IEvents>
}
