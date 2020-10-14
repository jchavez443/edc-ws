import WebSocket from 'ws'
import { ConnectionInfo, ConnectionManager, DefaultConnectionManager } from './connections'
import { Events, IAckEvent, IErrorEvent, IEvents } from '../../events'
import ParentClient from '../parent-client'
import { EdcServer, ServerHandlers, ServerOnClose, ServerOnConnect } from './interfaces'
/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */

// eslint-disable-next-line import/prefer-default-export
export default class Server extends ParentClient implements EdcServer {
    wss: WebSocket.Server

    connectionManager: ConnectionManager

    onEvent

    onError

    onAck

    onConnect: ServerOnConnect = async () => {}

    onClose: ServerOnClose = async () => {}

    constructor(port: number, handlers: ServerHandlers, connectionManager?: ConnectionManager, timeout?: number) {
        super()

        if (handlers.onConnect) this.onConnect = handlers.onConnect

        if (handlers.onClose) this.onClose = handlers.onClose

        this.onAck = handlers.onAck
        this.onError = handlers.onError
        this.onEvent = handlers.onEvent

        // if no connection manager supplied then the server can
        // not push to the customer but it can reply to incoming
        this.connectionManager = connectionManager || new DefaultConnectionManager()

        if (timeout) this.ackTimeout = timeout

        this.wss = new WebSocket.Server({ port })

        this.wss.on('connection', (ws, request) => {
            ws.onmessage = (event) => {
                this.onMessage(ws, event)
            }

            ws.onclose = (event) => {
                this.connectionManager.removeConnection(ws)
                this.onClose(this, ws, event)
                this.cleanUp(ws)
            }
            const connectionInfo = this.connectionManager.addConnection(ws)
            this.onConnect(this, connectionInfo, request)
        })
    }

    protected async handleEvent(event: IEvents, ws: WebSocket) {
        const connectionInfo = this.connectionManager.getConnection(ws)

        if (connectionInfo === undefined) throw new Error('Connection Info is undefined')

        const reply = (newEvent: Events) => {
            return this.sendEvent(connectionInfo, newEvent)
        }

        const send = (info: ConnectionInfo, newEvent: Events) => {
            return this.sendEvent(info, newEvent)
        }

        switch (event.type) {
            case 'error':
                await this.onError(event as IErrorEvent, connectionInfo, reply, send)
                break
            case `acknowledgement`:
                await this.onAck(event as IAckEvent, connectionInfo, reply, send)
                break
            default:
                await this.onEvent(event, connectionInfo, reply, send)
        }
    }

    public sendEvent(connectionInfo: ConnectionInfo, event: IEvents): Promise<IEvents> {
        if (connectionInfo === undefined) {
            throw new Error(`Connection is undefined`)
        }

        return this.send(connectionInfo.ws, event)
    }

    public broadCast(event: Events) {
        const connections = this.connectionManager.getAllConnections()

        connections.forEach((conn) => {
            this.sendEvent(conn, event)
        })
    }

    public close(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.wss.close((err) => {
                if (err) reject(err)

                resolve()
            })
        })
    }
}
