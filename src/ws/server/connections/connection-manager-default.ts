import WebSocket from 'ws'
import { v4 as uuidv4 } from 'uuid'
import ConnectionManager from './connection-manager'
import { ConnectionInfo } from './interfaces'

export default class ConnectionManagerDefault implements ConnectionManager {
    private connections: Map<string, ConnectionInfo> = new Map()

    private connectionIds: Map<WebSocket, ConnectionInfo> = new Map()

    addConnection(ws: WebSocket): ConnectionInfo {
        const uuid = uuidv4()

        const info: ConnectionInfo = {
            connectionId: uuid,
            ws
        }

        this.connections.set(uuid, info)
        this.connectionIds.set(ws, info)

        return info
    }

    removeConnection(ws: WebSocket): void {
        const info = this.connectionIds.get(ws)
        this.connectionIds.delete(ws)

        if (info === undefined || info.connectionId === undefined) return

        this.connections.delete(info.connectionId)
    }

    getConnection(connection: string | WebSocket): ConnectionInfo | undefined {
        if (typeof connection === 'string') return this.connections.get(connection)

        return this.connectionIds.get(connection)
    }

    getAllConnections(): ConnectionInfo[] {
        const connections = this.connections.values()
        return [...connections]
    }
}
