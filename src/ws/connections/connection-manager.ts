import WebSocket from 'ws'

export default abstract class ConnectionManager {
    abstract addConnection(ws: WebSocket): void

    abstract deleteConnection(ws: WebSocket): void

    abstract getConnection(connectionId: string): WebSocket | undefined

    abstract getAllConnections(): WebSocket[]
}
