import WebSocket from 'ws'
import ConnectionManager from '../src/ws/connections/connection-manager'

export default class ConnectionManagerCycle implements ConnectionManager {
    private connections: Map<string, WebSocket> = new Map()

    private connectionIds: Map<WebSocket, string> = new Map()

    addConnection(ws: WebSocket): void {
        this.connections.set('a', ws)
        this.connectionIds.set(ws, 'a')
    }

    deleteConnection(ws: WebSocket): void {
        const connId = this.connectionIds.get(ws)
        this.connectionIds.delete(ws)

        if (connId === undefined) return

        this.connections.delete(connId)
    }

    getConnection(connectionId: string): WebSocket | undefined {
        return this.connections.get(connectionId)
    }

    getAllConnections(): WebSocket[] {
        const connections = this.connectionIds.keys()
        return [...connections]
    }
}
