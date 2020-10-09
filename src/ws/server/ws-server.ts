import WebSocket from 'ws'
import ConnectionManager from '../connections/connection-manager'
import { Events } from '../../events/index'
import RootClient from '../common'
import { IEvents, IEvent, IAckEvent, IErrorEvent } from '../../interface'
import { ServerHandlers } from '../interfaces'
/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */

// eslint-disable-next-line import/prefer-default-export
export default class Server extends RootClient {
    wss: WebSocket.Server

    connectionManager: ConnectionManager

    constructor(port: number, connectionManager: ConnectionManager, handlers: ServerHandlers, timeout?: number) {
        super(handlers)

        this.connectionManager = connectionManager

        if (timeout) this.ackTimeout = timeout

        this.wss = new WebSocket.Server({ port })

        this.wss.on('connection', (ws) => {
            console.log(`Connected new connection`)
            ws.onmessage = (event) => {
                try {
                    this.onMessage(ws, event)
                } catch (e) {
                    console.log(e) // This could be a passed in functio for handling erros
                }
            }

            ws.onclose = (event) => {
                this.connectionManager.deleteConnection(ws)
                this.onClose(ws, event)
            }
            this.connectionManager.addConnection(ws)
        })
    }

    public sendEvent(connection: WebSocket | string, event: Events): Promise<IEvents> {
        if (connection === undefined) {
            throw new Error(`Connection is undefined`)
        }

        if (typeof connection === 'string') {
            // @ts-ignore
            const ws = this.getConnection(connection)
            return this.send(ws, event)
        }
        return this.send(connection, event)
    }

    public onClose(ws: WebSocket, event: WebSocket.CloseEvent) {
        console.log(`ws connection closed: ${event.reason}`)
    }

    public broadCast(event: Events) {
        const connections = this.connectionManager.getAllConnections()

        connections.forEach((conn) => {
            this.sendEvent(conn, event)
        })
    }
}
