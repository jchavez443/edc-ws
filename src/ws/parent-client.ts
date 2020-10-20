/* eslint-disable no-use-before-define */
/* eslint-disable max-classes-per-file */
/* eslint-disable class-methods-use-this */
import Ajv from 'ajv'
import WebSocket, { MessageEvent } from 'ws'
import { EventSchema, ErrorEventSchema } from './json-schema'
import { ClientOnEvent, ClientOnError, ClientOnAck, ClientOnConnect, ClientOnClose } from './client'
import { AckEvent, ErrorEvent, Event, IEvent, IEvents } from '../events'
import { ServerOnAck, ServerOnClose, ServerOnConnect, ServerOnError, ServerOnEvent } from './server'
import { AckedErrorEvent, InvalidEventErrorEvent, InvalidJsonErrorEvent, TimeoutError } from './errors'

const ajv = new Ajv()
const eventValidator = ajv.compile(EventSchema)
const errorEventValidator = ajv.compile(ErrorEventSchema)

export default abstract class ParentClient {
    private requestedAcks: AckHandlerMap<
        string,
        [ws: WebSocket, timeout: NodeJS.Timeout, resolve: (event: IEvents) => void, reject: (reason: any) => void]
    > = new AckHandlerMap()

    private incomingAcks: AckHandlerSet<string> = new AckHandlerSet()

    protected ackTimeout: number = 5000

    /**
     * @returns Promise
     */
    abstract onEvent: ServerOnEvent | ClientOnEvent

    abstract onError: ServerOnError | ClientOnError

    abstract onAck: ServerOnAck | ClientOnAck

    onConnect: ServerOnConnect | ClientOnConnect = async () => {}

    onClose: ServerOnClose | ClientOnClose = async () => {}

    protected async onMessage(ws: WebSocket, msgEvent: MessageEvent) {
        let event
        try {
            event = JSON.parse(msgEvent.data.toString())
        } catch (e) {
            console.log(msgEvent.data)
            // Invalid JSON reply
            this.send(ws, new InvalidJsonErrorEvent(msgEvent.data.toString()))
            return
        }

        if (!this.validateJson(event)) {
            // Invalid Event Object
            this.send(ws, new InvalidEventErrorEvent(event))
            return
        }

        this.preOnEvent(event, ws)

        await this.handleEvent(event, ws)

        if (event.acknowledge && this.incomingAcks.has(ws, event.id)) {
            this.send(ws, new AckEvent(event))
        }
    }

    private validateJson(jsObj: any): boolean {
        const result = eventValidator(jsObj)

        if (result && jsObj.type === 'error') {
            const res2 = errorEventValidator(jsObj)
            return res2
        }

        return result
    }

    private preOnEvent(event: IEvents, websocket: WebSocket) {
        if ((event as IEvent<any, any>).acknowledge) {
            this.incomingAcks.add(websocket, event.id)
        }

        if (event.trigger === undefined || !this.requestedAcks.has(websocket, event.trigger)) return

        const tuple = this.requestedAcks.get(websocket, event.trigger)
        if (tuple === undefined) return

        const [ws, ackTimeout, resolve, reject] = tuple

        if (websocket !== ws) {
            return
        }

        clearTimeout(ackTimeout)
        this.requestedAcks.delete(websocket, event.trigger)

        if (event.type !== 'error') {
            resolve(event)
        } else {
            reject(new AckedErrorEvent(event as ErrorEvent<any>))
        }
    }

    protected send(ws: WebSocket, event: IEvents): Promise<IEvents> {
        if (event.trigger !== undefined && this.incomingAcks.has(ws, event.trigger)) {
            this.incomingAcks.delete(ws, event.trigger)
        }

        return new Promise((resolve, reject) => {
            if ((event as Event<any, any>).acknowledge) {
                const ackTimeout = setTimeout(() => {
                    this.requestedAcks.delete(ws, event.id)
                    reject(new TimeoutError(`waiting for event.id: ${event.id}`, this.ackTimeout))
                }, this.ackTimeout)
                this.requestedAcks.add(ws, event.id, [ws, ackTimeout, resolve, reject])

                ws.send(JSON.stringify(event))
            } else {
                ws.send(JSON.stringify(event))
                resolve() // we do not have the returned event.  ack not requested
            }
        })
    }

    protected cleanUp(ws: WebSocket) {
        this.incomingAcks.remove(ws)
        this.requestedAcks.remove(ws)
    }

    protected abstract handleEvent(event: any, ws: WebSocket): Promise<void>

    public abstract sendEvent(...args: any): Promise<IEvents>

    public abstract close(): Promise<void>
}

class AckHandlerSet<T> {
    private incomingAckSets: Map<WebSocket, Set<T>> = new Map()

    add(ws: WebSocket, uuid: T) {
        let idSet = this.incomingAckSets.get(ws)

        if (!idSet) {
            idSet = new Set()
            this.incomingAckSets.set(ws, idSet)
        }

        idSet.add(uuid)
    }

    has(ws: WebSocket, uuid: T) {
        const idSet = this.incomingAckSets.get(ws)
        return idSet?.has(uuid)
    }

    delete(ws: WebSocket, uuid: T) {
        const idSet = this.incomingAckSets.get(ws)
        idSet?.delete(uuid)

        if (idSet?.size === 0) this.incomingAckSets.delete(ws)
    }

    remove(ws: WebSocket) {
        this.incomingAckSets.delete(ws)
    }
}

class AckHandlerMap<T, S> {
    private incomingAckMaps: Map<WebSocket, Map<T, S>> = new Map()

    add(ws: WebSocket, uuid: T, obj: S) {
        let idMap = this.incomingAckMaps.get(ws)

        if (!idMap) {
            idMap = new Map()
            this.incomingAckMaps.set(ws, idMap)
        }

        idMap.set(uuid, obj)
    }

    has(ws: WebSocket, uuid: T) {
        const idMap = this.incomingAckMaps.get(ws)
        return idMap?.has(uuid)
    }

    get(ws: WebSocket, uuid: T) {
        return this.incomingAckMaps.get(ws)?.get(uuid)
    }

    delete(ws: WebSocket, uuid: T) {
        const idMap = this.incomingAckMaps.get(ws)
        idMap?.delete(uuid)

        if (idMap?.size === 0) this.incomingAckMaps.delete(ws)
    }

    remove(ws: WebSocket) {
        this.incomingAckMaps.delete(ws)
    }
}
