import { AckEvent, Event, IAckEvent, IEvent } from 'edc-events'

export default class AckReply {
    async: boolean

    event?: Event<any, any>

    ack?: {
        id: string
        trigger: string
        type: string
    }

    id?: string

    trigger?: string

    type?: string

    constructor(event?: IEvent<any, any> | IAckEvent) {
        if (!event) {
            this.async = true
            return
        }

        this.async = false
        this.id = event.id
        this.trigger = event.trigger
        this.type = event.type

        this.ack = {
            id: event.id,
            trigger: (event as IAckEvent).trigger,
            type: event.type
        }

        if (event.type !== AckEvent.type) {
            this.event = new Event(event)
        }
    }
}
