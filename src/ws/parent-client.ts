/* eslint-disable no-use-before-define */
/* eslint-disable max-classes-per-file */
/* eslint-disable class-methods-use-this */
import WebSocket, { MessageEvent } from 'ws'
import { AckEvent, EdcValidator, ErrorEvent, Event, IErrorEvent, IEvent, IEvents } from 'edc-events'
import { ClientOnError, ClientOnAck, ClientOnConnect, ClientOnClose } from './client'
import { ServerOnAck, ServerOnClose, ServerOnConnect, ServerOnError } from './server'
import { AckedErrorEvent, TimeoutError } from './errors'
import AckReply from './ack-reply'
import { OnEventHandlers, Route } from './interfaces'

export default abstract class ParentClient {
    private requestedAcks: AckHandlerMap<
        string,
        [ws: WebSocket, timeout: NodeJS.Timeout, resolve: (event: AckReply) => void, reject: (reason: any) => void]
    > = new AckHandlerMap()

    private incomingAcks: AckHandlerSet<string> = new AckHandlerSet()

    protected ackTimeout: number = 5000

    protected onEventHandlers: Map<string, OnEventHandlers> = new Map()

    protected awaitHandlers: Map<string, OnEventHandlers> = new Map()

    abstract onError: ServerOnError | ClientOnError

    abstract onAck: ServerOnAck | ClientOnAck

    onConnect: ServerOnConnect | ClientOnConnect = async () => {}

    onClose: ServerOnClose | ClientOnClose = async () => {}

    protected async onMessage(ws: WebSocket, msgEvent: MessageEvent) {
        let event
        try {
            event = JSON.parse(msgEvent.data.toString())
        } catch (e) {
            // Invalid JSON reply
            this.onInvalidJson(ws, msgEvent.data.toString())
            return
        }

        if (!EdcValidator.validate(event)) {
            // Invalid Event Object
            this.onInvalidEvent(ws, event)
            return
        }

        const ievent = <IEvent<any, any>>event

        if (ievent.acknowledge) {
            this.incomingAcks.add(ws, ievent.id)
        }

        if (ievent.trigger && this.requestedAcks.has(ws, ievent.trigger)) {
            this.handleRequestedAck(ievent, ws)
        } else {
            await this.handleEvent(ievent, ws)
        }

        if (ievent.acknowledge && this.incomingAcks.has(ws, ievent.id)) {
            this.send(ws, new AckEvent(ievent))
        }
    }

    private handleRequestedAck(ievent: IEvent<any, any>, websocket: WebSocket) {
        if (ievent.trigger === undefined || !this.requestedAcks.has(websocket, ievent.trigger)) return

        const tuple = this.requestedAcks.get(websocket, ievent.trigger)
        if (tuple === undefined) return

        const [ws, ackTimeout, resolve, reject] = tuple

        if (websocket !== ws) {
            return
        }

        clearTimeout(ackTimeout)
        this.requestedAcks.delete(websocket, ievent.trigger)

        if (ievent.type !== ErrorEvent.type) {
            resolve(new AckReply(ievent))
        } else {
            reject(new AckedErrorEvent(new ErrorEvent(ievent as IErrorEvent<any>)))
        }
    }

    protected send(ws: WebSocket, event: IEvents): Promise<AckReply> {
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
                resolve(new AckReply()) // we do not have the returned event.  ack not requested
            }
        })
    }

    protected cleanUp(ws: WebSocket) {
        this.incomingAcks.remove(ws)
        this.requestedAcks.remove(ws)
    }

    public register(routes: Route[]) {
        if (!routes) {
            throw new Error('routes is undefined')
        }

        // eslint-disable-next-line no-restricted-syntax
        for (const route of routes) {
            this.onEvent(route.eventType, route.handler)
        }
    }

    public abstract onEvent(eventType: string, handler: OnEventHandlers): void

    public abstract awaitTrigger(trigger: string, handler: OnEventHandlers): void

    public removeAwaitTrigger(trigger: string) {
        this.awaitHandlers.delete(trigger)
    }

    protected abstract onInvalidJson(ws: WebSocket, message: string): Promise<void>

    protected abstract onInvalidEvent(ws: WebSocket, obj: any): Promise<void>

    protected abstract handleEvent(event: any, ws: WebSocket): Promise<void>

    public abstract sendEvent(...args: any): Promise<any>

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
