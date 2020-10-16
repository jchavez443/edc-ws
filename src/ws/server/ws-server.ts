import WebSocket from 'ws'
import http, { IncomingMessage } from 'http'
import https from 'https'
import { Events, IAckEvent, IErrorEvent, IEvents } from '../../events'
import ParentClient from '../parent-client'
import {
    EdcServer,
    ServerAuthenticate,
    ServerHandlers,
    ServerOnClose,
    ServerOnConnect,
    ServerOptions
} from './interfaces'
import { Auth } from './authentication/interfaces'
/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */

// eslint-disable-next-line import/prefer-default-export
export default class Server extends ParentClient implements EdcServer {
    wss: WebSocket.Server

    server: http.Server | https.Server

    onEvent

    onError

    onAck

    onConnect: ServerOnConnect = async () => {}

    onClose: ServerOnClose = async () => {}

    authenticate: ServerAuthenticate = () => {
        return { authenticated: true }
    }

    constructor(port: number, handlers: ServerHandlers, serverOptions?: ServerOptions) {
        super()

        if (serverOptions?.https) {
            this.server = https.createServer(serverOptions?.htpServerOptions || {})
        } else {
            this.server = http.createServer(serverOptions?.htpServerOptions || {})
        }

        this.server.on('upgrade', (request, socket, head) => {
            const auth: Auth = this.authenticate(request)

            if (!auth.authenticated) {
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
                socket.destroy()
                return
            }

            this.wss.handleUpgrade(request, socket, head, (ws) => {
                this.wss.emit('connection', ws, request, auth)
            })
        })

        if (handlers.onConnect) this.onConnect = handlers.onConnect

        if (handlers.onClose) this.onClose = handlers.onClose

        if (handlers.authenticate) this.authenticate = handlers.authenticate

        this.onAck = handlers.onAck
        this.onError = handlers.onError
        this.onEvent = handlers.onEvent

        if (serverOptions?.timeout) this.ackTimeout = serverOptions?.timeout

        this.wss = new WebSocket.Server({ noServer: true })

        this.wss.on('connection', (ws: WebSocket, request: IncomingMessage, auth: any) => {
            ws.onmessage = (event) => {
                this.onMessage(ws, event)
            }

            ws.onclose = (event) => {
                this.onClose(event, ws, this)
                this.cleanUp(ws)
            }
            this.onConnect(ws, auth, request, this)
        })

        this.server.listen(port)
    }

    protected async handleEvent(event: IEvents, ws: WebSocket) {
        const reply = (newEvent: Events) => {
            return this.sendEvent(ws, newEvent)
        }

        const send = (connection: WebSocket, newEvent: Events) => {
            return this.sendEvent(connection, newEvent)
        }

        switch (event.type) {
            case 'error':
                await this.onError(event as IErrorEvent, ws, reply, send, this)
                break
            case 'acknowledgement':
                await this.onAck(event as IAckEvent, ws, reply, send, this)
                break
            default:
                await this.onEvent(event, ws, reply, send, this)
        }
    }

    public sendEvent(connection: WebSocket, event: IEvents): Promise<IEvents> {
        return this.send(connection, event)
    }

    public broadCast(event: Events) {
        const connections = this.wss.clients

        connections.forEach((conn) => {
            this.send(conn, event)
        })
    }

    public close(): Promise<void> {
        return new Promise((resolve, reject) => {
            console.log(`closing...`)
            this.wss.close((err) => {
                console.log(`WS Server closed...`)

                if (err) reject(err)
                this.server.close((err2) => {
                    console.log(`Server closed...`)

                    if (err2) reject(err2)

                    resolve()
                })
            })
        })
    }
}
