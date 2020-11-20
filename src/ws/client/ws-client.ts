import WebSocket from 'ws'
import { AckEvent, ErrorEvent, IEvents, Events, Event, IEvent, IErrorEvent, IAckEvent } from 'edc-events'
import ParentClient from '../parent-client'
// eslint-disable-next-line prettier/prettier
import {
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
    ws?: WebSocket

    onError: ClientOnError = async () => {}

    onAck: ClientOnAck = async () => {}

    onConnect: ClientOnConnect = async () => {}

    onClose: ClientOnClose = async () => {}

    private url: string

    private options?: ClientOptions

    constructor(url: string, options?: ClientOptions) {
        super()

        this.url = url
        this.options = options

        if (options?.timeout) this.ackTimeout = options?.timeout
    }

    public start() {
        this.ws = new WebSocket(this.url, {
            auth: this.options?.auth
        })

        this.ws.onopen = (event) => {
            if (this.ws === undefined) throw new Error(`Websocket === ${this.ws}, on this.ws`)
            this.onConnect(this, this.ws, event)
        }
        this.ws.onmessage = (event) => {
            if (this.ws === undefined) throw new Error(`Websocket === ${this.ws}, on this.ws`)
            this.onMessage(this.ws, event)
        }
        this.ws.onclose = (event) => {
            if (this.ws === undefined) throw new Error(`Websocket === ${this.ws}, on this.ws`)
            this.onClose(this, this.ws, event)
            this.cleanUp(this.ws)
        }
        return this
    }

    protected async handleEvent(ievent: IEvents) {
        const reply = (newEvent: Events) => {
            return this.sendEvent(newEvent)
        }

        if (ievent.trigger && this.awaitHandlers.has(ievent.trigger)) {
            const awaitHandler = this.awaitHandlers.get(ievent.trigger)
            if (awaitHandler) {
                const event = new Event<any, any>(ievent as IEvent<any, any>)
                await (<ClientOnEventHandler>awaitHandler)(event, reply)
                return // Stop execution, only need to handler the trigger.... for now
                // can see some value to allowing double handling of an event.
            }
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

    // eslint-disable-next-line class-methods-use-this
    protected async onInvalidJson() {
        console.log(`Invalid JSON received`)
    }

    // eslint-disable-next-line class-methods-use-this
    protected async onInvalidEvent() {
        console.log(`Invalid EDC Event received`)
    }

    public onEvent(eventType: string, handler: ClientOnEventHandler) {
        if (eventType === undefined) return

        this.onEventHandlers.set(eventType, handler)
    }

    public awaitTrigger(trigger: string, handler: ClientOnEventHandler) {
        if (trigger === undefined) return

        this.awaitHandlers.set(trigger, handler)
    }

    public sendEvent(event: Events) {
        if (this.ws === undefined) throw new Error(`Websocket === ${this.ws}, on this.ws`)
        return this.send(this.ws, event)
    }

    public async awaitReady(): Promise<void> {
        let count = 0

        if (this.ws === undefined) {
            return Promise.reject(new Error('Did NOT start the Client'))
        }

        const check = (resolve: any, reject: any) => {
            if (this.ws?.readyState === WebSocket.OPEN) {
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
        this.ws?.close()
        let count = 0

        const check = (resolve: any, reject: any) => {
            if (this.ws?.readyState === WebSocket.CLOSED) {
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
