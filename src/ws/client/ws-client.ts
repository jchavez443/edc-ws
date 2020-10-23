import WebSocket from 'ws'
import { AckEvent, ErrorEvent, IEvents, Events, Event, IEvent, IErrorEvent, IAckEvent } from 'edc-events'
import ParentClient from '../parent-client'
// eslint-disable-next-line prettier/prettier
import {
    ClientHandlers,
    ClientOnAck,
    ClientOnClose,
    ClientOnConnect,
    ClientOnError,
    ClientOnEventHandler,
    ClientOptions,
    EdcClient
} from './interfaces'
import { UnknownEventErrorEvent } from '../errors'

// eslint-disable-next-line import/prefer-default-export
export default class Client extends ParentClient implements EdcClient {
    ws: WebSocket

    onError: ClientOnError = async () => {}

    onAck: ClientOnAck = async () => {}

    onConnect: ClientOnConnect = async () => {}

    onClose: ClientOnClose = async () => {}

    constructor(url: string, options?: ClientOptions) {
        super()

        if (options?.timeout) this.ackTimeout = options?.timeout

        this.ws = new WebSocket(url, {
            auth: options?.auth
        })

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

    protected async handleEvent(ievent: IEvents) {
        const reply = (newEvent: Events) => {
            return this.sendEvent(newEvent)
        }

        switch (ievent.type) {
            case 'error':
                await this.onError(new ErrorEvent(ievent as IErrorEvent<any>), reply)
                break
            case `acknowledgement`:
                await this.onAck(new AckEvent(ievent as IAckEvent), reply)
                break
            default: {
                const event = new Event<any, any>(ievent as IEvent<any, any>)
                let onEventHandler = this.onEventHandlers.get(event.type)
                if (!onEventHandler) {
                    onEventHandler = this.onEventHandlers.get('*')
                }

                if (!onEventHandler) {
                    reply(new UnknownEventErrorEvent(event))
                } else {
                    await (<ClientOnEventHandler>onEventHandler)(event, reply)
                }
                break
            }
        }
    }

    public onEvent(eventType: string, handler: ClientOnEventHandler) {
        if (eventType === undefined) return

        this.onEventHandlers.set(eventType, handler)
    }

    public sendEvent(event: Events) {
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
