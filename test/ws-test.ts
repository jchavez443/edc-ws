import WebSocket from 'ws'
import Edc, { Event, IEvent, Server } from '../src/index'
import ConnectionManagerCycle from './connectionManager'

async function onAck(wss: Server, ws: any, cause: any) {
    console.log(`Ack for: ${cause.trigger}`)
}

async function onError(wss: Server, ws: any, cause: any) {
    console.log(`Error for: ${cause.trigger}`)
}

async function onEvent(wss: Server, ws: WebSocket, cause: IEvent<any>): Promise<any> {
    console.log(`Server:  `)

    if (cause.type === 'client-action-2') {
        wss.sendEvent(
            ws,
            new Event('server-action-success', {
                details: {
                    test: 'server response'
                }
            }).inherit(cause)
        )
    }
}

const handlers = {
    onError,
    onEvent,
    onAck
}

const wss = new Edc.Server(8080, new ConnectionManagerCycle(), handlers)

const wsc = new Edc.Client('ws://localhost:8080', {
    onEvent: async (client, ws, event) => {
        console.log(`Client:  `)
    },
    onAck: async (client, ws, cause) => {
        console.log(`Ack for: ${cause.trigger}`)
    },
    onError: async (client, ws, cause) => {
        console.log(`Error for: ${cause.trigger}`)
    }
})

setTimeout(async () => {
    const event = new Event('client-action', {
        acknowledge: true,
        details: {
            callId: 'asdf-asdjf'
        }
    })

    const event1 = new Event('client-action-2', {
        acknowledge: true
    })

    const event2 = new Event('client-action', {
        acknowledge: true,
        details: {
            test: 22
        },
        shared: {
            fis: 'adsf'
        }
    })

    console.log(event)
    let ackEvent = await wsc.sendEvent(event)
    console.log(ackEvent)

    console.log(event1)
    ackEvent = await wsc.sendEvent(event1)
    console.log(ackEvent)

    console.log(event2)
    ackEvent = await wsc.sendEvent(event2)
    console.log(ackEvent)

    console.log(' ')
}, 2000)
