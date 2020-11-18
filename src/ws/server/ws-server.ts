import WebSocket from 'ws'
import http, { IncomingMessage } from 'http'
import https from 'https'
import { Events, AckEvent, ErrorEvent, IEvents, Event, IEvent, IErrorEvent, IAckEvent } from 'edc-events'
import ParentClient from '../parent-client'
import {
    EdcServer,
    ServerAuthenticate,
    ServerOnAck,
    ServerOnClose,
    ServerOnConnect,
    ServerOnError,
    ServerOnEventHandler,
    ServerOptions
} from './interfaces'
import { Auth } from './authentication/interfaces'
import { InvalidEventErrorEvent, InvalidJsonErrorEvent, UnknownEventErrorEvent } from '../errors'
/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */

// eslint-disable-next-line import/prefer-default-export
export default class Server extends ParentClient implements EdcServer {
    wss?: WebSocket.Server

    server?: http.Server | https.Server

    onError: ServerOnError = async () => {}

    onAck: ServerOnAck = async () => {}

    onConnect: ServerOnConnect = async () => {}

    onClose: ServerOnClose = async () => {}

    authenticate: ServerAuthenticate = async () => {
        return { authenticated: true }
    }

    private port: number

    private serverOptions?: ServerOptions

    constructor(port: number, serverOptions?: ServerOptions) {
        super()

        this.port = port

        this.serverOptions = serverOptions
    }

    public listen() {
        if (this.serverOptions?.https) {
            this.server = https.createServer(this.serverOptions?.htpServerOptions || {})
        } else {
            this.server = http.createServer(this.serverOptions?.htpServerOptions || {})
        }

        this.server.on('upgrade', async (request, socket, head) => {
            let auth: Auth
            try {
                auth = await this.authenticate(request)
            } catch (e) {
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
                socket.destroy()
                return
            }

            if (!auth.authenticated) {
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
                socket.destroy()
                return
            }

            this.wss?.handleUpgrade(request, socket, head, (ws) => {
                this.wss?.emit('connection', ws, request, auth)
            })
        })

        if (this.serverOptions?.timeout) this.ackTimeout = this.serverOptions?.timeout

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

        this.server.listen(this.port)
    }

    protected async handleEvent(ievent: IEvents, ws: WebSocket) {
        const reply = (newEvent: Events) => {
            return this.sendEvent(ws, newEvent)
        }

        const send = (connection: WebSocket, newEvent: Events) => {
            return this.sendEvent(connection, newEvent)
        }

        switch (ievent.type) {
            case 'error':
                await this.onError(new ErrorEvent(ievent as IErrorEvent<any>), ws, reply, send, this)
                break
            case 'acknowledgement':
                await this.onAck(new AckEvent(ievent as IAckEvent), ws, reply, send, this)
                break
            default: {
                const event = new Event<any, any>(ievent as IEvent<any, any>)
                let onEventHandler = this.onEventHandlers.get(event.type)
                if (!onEventHandler) {
                    onEventHandler = this.onEventHandlers.get('*')
                }

                if (!onEventHandler) {
                    await reply(new UnknownEventErrorEvent(event))
                } else {
                    await (<ServerOnEventHandler>onEventHandler)(event, ws, reply, send, this)
                }
                break
            }
        }
    }

    protected async onInvalidJson(ws: WebSocket, message: string) {
        this.send(ws, new InvalidJsonErrorEvent(message))
    }

    protected async onInvalidEvent(ws: WebSocket, obj: any) {
        this.send(ws, new InvalidEventErrorEvent(obj))
    }

    public onEvent(eventType: string, handler: ServerOnEventHandler) {
        if (eventType === undefined) return

        this.onEventHandlers.set(eventType, handler)
    }

    public sendEvent(connection: WebSocket, event: IEvents) {
        return this.send(connection, event)
    }

    public broadCast(event: Events) {
        const connections = this.wss?.clients

        connections?.forEach((conn) => {
            this.send(conn, event)
        })
    }

    public close(): Promise<void> {
        return new Promise((resolve, reject) => {
            console.log(`closing...`)
            this.wss?.close((err) => {
                console.log(`WS Server closed...`)

                if (err) reject(err)
                this.server?.close((err2) => {
                    console.log(`Server closed...`)

                    if (err2) reject(err2)

                    resolve()
                })
            })
        })
    }
}
