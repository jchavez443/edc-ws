import Event from './event'
import ErrorEvent from './error-event'
import AckEvent from './ack-event'

type Events = Event<any> | ErrorEvent | AckEvent

export { Event, ErrorEvent, AckEvent, Events }
