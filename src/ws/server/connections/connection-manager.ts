import WebSocket from 'ws'
import { ConnectionInfo } from './interfaces'

export default abstract class ConnectionManager {
    abstract addConnection(ws: WebSocket): ConnectionInfo

    abstract removeConnection(ws: WebSocket): void

    abstract getConnection(connection: WebSocket | string): ConnectionInfo | undefined

    abstract getAllConnections(): ConnectionInfo[]
}
