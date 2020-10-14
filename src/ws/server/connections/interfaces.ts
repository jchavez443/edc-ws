import WebSocket from 'ws'

export interface ConnectionInfo {
    ws: WebSocket
    connectionId: string
}
