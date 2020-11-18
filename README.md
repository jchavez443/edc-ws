# Event Driven Communications (EDC) w/ WebSockets

## EDC-WS Server/Clients
Is a server-clinet pakage that uses websockets to enable EDC.

Examples:
* [Guessing Game Example](https://github.com/jchavez443/edc-ws-guess-game-example)
* [Chat Room Example](https://github.com/jchavez443/edc-ws-chat-example)

## What is The Event Driven Communications (EDC) Protocol?
Is a JSON based communications protocol that allows for the communication of events while enabling the sharing of common data between a chain of events.

The concept that one event is the cause of a new event is a first class citizen in the EDC protocol.  This allows for the logical grouping of events based on the cause-effect chain by tie together UUIDs.  In additions, a chain of events logically share data that is common to each event in the chain.  This allows the detail of the events to live seperate from the shared chain data.

* [See Event Driven Communications](#event-driven-communications-edc-components)

> **Note:** [Acknowledge](#acknowledge) has a few nuances and controls if the `sendEvent()` resolves instantly or waits for a reply.  If `"acknowledge": true` then the promise will reslove after a valid reply, or reject after a timeout | [Error Event](#error-event)
> See this for more on [Acknowledge](#acknowledge-and-flow)

```
              Event Chain
|-----------------------------------------|
|             shared data                 |
|    |event-1|-->|event-2|-->|event-3|    |
|        |                                |
|        |-->|event-N|                    |
|-----------------------------------------|
```

## Examples

Server initialization
```ts
import Edc, { Event } from 'edc-ws'

const server = new Edc.Server(port)

server.onEvent('event-type', async (cause, ws, reply, send, that) => {
    const event = new Event('other-event').inherit(cause)

    reply(event)
})

server.onAck = async (cause, ws, reply, send, that) => {
    // Handle events.type = "acknowledgement"
}
server.onError = async (cause, ws, reply, send, that) => {
    // Handle events.type = "error"
}
```

Send an Event (Server)
```ts
const cause = new Event('event-type', {
    acknowledge: true, // Note** that this is 'true'
    details: {
        test: 'prop',
        count: 23
    },
    shared: {
        id: 'shared id',
        step: 3
    }
})

try {
    const event = await server.sendEvent(connection, cause)
} catch (e) {
    console.log(err.message)
    if (e instanceof AckedErrorEvent) {
       console.log(`Failed Event Id:  ${e.trigger}`)
    } else if (e instanceof TimeoutError) {
        console.log(`Event timedout after  ${e.timeout}ms`)
    } else {
        // Handler other
    }
}
```
> **Note:** if the `cause` Event was set to **`"acknowledge": false`** then no [`AckedErrorEvent`](#AckedErrorEvent) or [`TimeoutError`](#TimeoutError) could be thrown.  

Client initilization
```ts
import Edc, { Event } from 'edc-ws'

const client = new Edc.Client('ws://websocket.server.com')

client.onEvent('event-type', sync (cause, reply) => {
    const event = new Event('event-type').inherit(cause)

    reply(event)
})

client.onAck = async (cause, reply) => {
    // Handle events.type = "acknowledgement"
}
client.onError = async (cause, reply) => {
    // Handle events.type = "error"
}
```

Send an Event (Client)
```ts
const cause = new Event('event-type', {
    acknowledge: true, // Note** that this is 'true'
    details: {
        test: 'prop',
        count: 23
    },
    shared: {
        id: 'shared id',
        step: 3
    }
})

try {
    const event = await client.sendEvent(cause)
} catch (e) {
    console.log(err.message)
    if (e instanceof AckedErrorEvent) {
       console.log(`Failed Event Id:  ${e.trigger}`)
    } else if (e instanceof TimeoutError) {
        console.log(`Event timedout after  ${e.timeout}ms`)
    } else {
        // Handler other
    }
}
```
> **Note:** if the `cause` Event was set to **`"acknowledge": false`** then no [`AckedErrorEvent`](#AckedErrorEvent) or [`TimeoutError`](#TimeoutError) could be thrown.

Create a `new Event()` from a `cause: Event`
```ts
const cause = new Event('event-type', {
    acknowledge: true,
    details: {
        test: 'prop',
        count: 23
    },
    shared: {
        id: 'shared id',
        step: 3
    }
})

const event = new Event('event-type-2').inherit(cause)

// event.trigger === cause.id
// event.shared === cause.shared

```

To match any event use `'*'` as the event type in the `onEvent()` function
```ts
// This will match any event. But the server|client will first try to match the event to a named one.
server.onEvent('*', async (cause, ws, reply, send, that) => {
    const event = new Event('other-event').inherit(cause)

    reply(event)
})
``` 

## Table of Contents

<!-- TOC -->

- [Event Driven Communications (EDC) w/ WebSockets](#event-driven-communications-edc-w-websockets)
    - [EDC-WS Server/Clients](#edc-ws-serverclients)
    - [What is The Event Driven Communications (EDC) Protocol?](#what-is-the-event-driven-communications-edc-protocol)
    - [Examples](#examples)
    - [Table of Contents](#table-of-contents)
    - [Event Driven Communications (EDC) Components](#event-driven-communications-edc-components)
        - [Event](#event)
        - [Acknowledgement Event](#acknowledgement-event)
        - [Error Event](#error-event)
            - [Error Event Details](#error-event-details)
        - [Fields](#fields)
            - [edc](#edc)
            - [type](#type)
            - [id](#id)
            - [trigger](#trigger)
            - [acknowledge](#acknowledge)
                - [Request](#request)
                - [Responses](#responses)
            - [details](#details)
            - [shared](#shared)
            - [failed](#failed)
    - [Acknowledge and Flow](#acknowledge-and-flow)
        - [TimeoutError](#timeouterror)
        - [AckedErrorEvent](#ackederrorevent)
        - [Multiple Synchronous Events](#multiple-synchronous-events)
    - [Generic Events](#generic-events)
        - [Event<T, K>](#eventt-k)
        - [ErrorEvent<T>](#erroreventt)
    - [Registering Routes](#registering-routes)
        - [Further Organize](#further-organize)

<!-- /TOC -->

## Event Driven Communications (EDC) Components

### Event
An Event is a JSON object defined as

> **Note:** `"type": ` `"error"` and `"acknowledgement"` are reserved for [Error Event](#error-event) and [Acknowledgement Event](#acknowledgement-event) respectivley

```ts
{
    "edc" : string                 // Version
    "type": string,                // Event type 
    "id": string,                  // UUID for the event,
    "trigger":? string,            // UUID of the event triggering this event
    "acknowledge":? boolean,       // A reply is expected (syncronous) if true
    "details":? {},                // Details of this event
    "shared":? {}                  // Shared information from the chain of events, (modifiable),
}
```

### Acknowledgement Event

```json
{
    "edc": "1.0",
    "type": "acknowledgement",
    "id": "71e92430-77b6-48ad-899c-7a5fc769f328",
    "trigger": "af0f0d3e-5c48-4265-9f3e-e37a21ff84c1"
}
```

### Error Event

```ts
{
    "edc": "1.0",
    "type": "error",
    "id": "71e92430-77b6-48ad-899c-7a5fc769f328",
    "trigger": "af0f0d3e-5c48-4265-9f3e-e37a21ff84c1",
    "details": { 
        "code": 4083, 
        "cn": "common-error",
        "message": "Simple message about error",
        "failed": "<JSON string of failing payload>"
        "data": {}
    },
    "shared": { shared data from erroring event },
    
}
```

#### Error Event Details

The `"details"` of the error event MUST include
* `"cn"` the common name of the error
* `"code"` the number for the error
* `"message"` the message to help understand the error
* `"failed"` the string form of the failed event

* `"data"` this field is allowed for any additional information about the error.

```ts
details: { 
    code: number; 
    cn: string; 
    message: string;
    failed: string;
    data: {} | null 
}
```


### Fields

#### edc
The version of the EDC protocoll
```json
    "edc": "1.0"
```

#### type
The type field represent the event type.  It can be any string except `"error"` and `"acknowldegement"` which are reserved.

Examples:
```json
    "type": "mouse-moved"
```
```json
    "type": "transcripted"
```
```json
    "type": "request-action"
```
```json
    "type": "initiate-action"
```

#### id
The id field is a UUID and MUST be unique for **all** events

#### trigger
The trigger is set to the event that triggered the new event.  `new event.trigger = cause.id`

The concept is meant to build a chain of events with `events` becoming the `cuase` of `new events`.  An `event` is not limited to causing only a linear chain.  It is possible for one `cause` to trigger multiple `events`.  `cause --> event1 & event2`

#### acknowledge
If an event is sent with the `"acknowledge": true` flag then the recieving system MUST reply with an `event`, `error`, or `acknowledgement` with the `trigger` field set to the `id` of the sent event. Multiple replies of different events is allowed.

Example:

##### Request
```json
A --> B
{
    "edc": "1.0",
    "type": "initiate",
    "id": "0a385c23-4b65-4d9f-8c78-6b7bf5ad0530",
    "acknowledge": true,
}
```
##### Responses
```json
B --> A

Ack Event
{
    "edc": "1.0",
    "type": "acknowledgement",
    "id": "71e92430-77b6-48ad-899c-7a5fc769f328",
    "trigger": "0a385c23-4b65-4d9f-8c78-6b7bf5ad0530"
}
```
-- Or --
```json
Error Event 
{
    "edc": "1.0",
    "type": "error",
    "id": "93de2206-9669-4e07-948d-329f4b722ee2",
    "trigger": "0a385c23-4b65-4d9f-8c78-6b7bf5ad0530",
    "details": {
        "cn": "common-error",
        "code": 10983,
        "message": "Common error caused my silly mistake",
        "failed": "{\"type\":\"initiate\",\"id\":\"0a385c23-4b65-4d9f-8c78-6b7bf5ad0530\",\"acknowledge\":\"true\"}",
        "data": {}
    }
}
```
-- Or --
```json
Responding Event
{
    "edc": "1.0",
    "type": "next-event",
    "id": "a201b948-4282-49e8-ae92-1c146ddd538b",
    "trigger":  "0a385c23-4b65-4d9f-8c78-6b7bf5ad0530"
}
```

#### details
The details is any JSON object and would hold the details for the OCCURING event.  It is not inteded to be used for `shared` properties that relate to the chain of events.

#### shared
The shared property is any JSON object.  It is inteded to be used as a property that a `chain of events` share in common.

When an event is `triggered` by a `cause` then it SHOULD set the `trigger` to the `cause.id` and copy the `cause.shared` data to the `new event.shared`.  The shared data is not immutable and can evolve.  

Examples would include a connection-Id that events share incommon, a call-Id for a phone call, a survey-Id, or a start time for a `chain of events`.

```json
A --> B
{
    "edc": "1.0",
    "type": "survey-question",
    "id": "e680a8a0-ad3e-4f9e-991b-fa0fe752b8d1",
    "details": {
        "question": "what is your favorite programming language?"
    },
    "shared": {
        "survey": "programming-favorites",
        "step": 0
    }
}
```
```json
B --> A
// Note the shared data is copied
{
    "edc": "1.0",
    "type": "survey-answer",
    "id": "09d0bc49-29be-4e2e-a347-aee23f9a815b",
    "trigger": "e680a8a0-ad3e-4f9e-991b-fa0fe752b8d1",
    "details": {
        "answer": "I love them all!"
    },
    "shared": {
        "survey": "programming-favorites",
        "step": 0
    }
}
```
```json
A --> B
// Note that the shared.step was increased
{
    "edc": "1.0",
    "type": "survey-question",
    "id": "9d37afee-9b68-4d8f-ae63-2bc8f9b2d7a7",
    "trigger": "09d0bc49-29be-4e2e-a347-aee23f9a815b",
    "details": {
        "question": "Who is your favorite computer scientist?"
    },
    "shared": {
        "survey": "programming-favorites",
        "step": 1
    }
}
```

#### failed
Is only used with the `"type": "error"` event.  It MUST be a string copy of the event that triggered the error

```json
{
    "edc": "1.0",
    "type": "error",
    "id": "93de2206-9669-4e07-948d-329f4b722ee2",
    "trigger": "0a385c23-4b65-4d9f-8c78-6b7bf5ad0530",
    "details": {
        "cn": "common-error",
        "code": 10983,
        "message": "Common error caused my silly mistake",
        "failed": "{\"type\":\"initiate\",\"id\":\"0a385c23-4b65-4d9f-8c78-6b7bf5ad0530\",\"acknowledge\":\"true\"}",
        "data": {}
     }
}
```

## Acknowledge and Flow

The requirement that `"acknowledge": true` event MUST have a reply leads to two thrown errors `AckedErrorEvent` and `TimeoutError`.  In addition, `"acknowledge": false` events are asynchronous even if `await` is used.  This is because the promise will resolve instantly on the `sendEvent()` as `Promise<undefined>`.

### TimeoutError

The `TimeoutError` is thrown on `"acknowledge": true` if no non-error reply is recived before the after client/server timeout is reached.  Since the `"acknowledge": true` events expects a reply and it is not possible to wait forever it is logical that there must be a timeout and that it would be a error by the system.

### AckedErrorEvent

The `AckedErrorEvent` is throw on `"acknowledge": true` event if an event of type `"error"` is recieved in response to the sent event.  The motivation for this is to allow the handling of events that were expected or NEEDED to be successful in order to continue.

### Multiple Synchronous Events

Acknowledge is key in sending multiple synchronous events in which the order of recieval matters.  If event `A` must be before event `B`, then event `A` should be sent with `"acknowledge": true` this would gurantee an acknowledging reply that `A` was recieved and that `B` could now be sent.  This would be true for any length of synchronous dependant events.  `A` before `B`, `B` before `C`, `C` before `D`, etc.... `[A, B, C, D, ...]`

## Generic Events 

### Event<T, K>
The type `T` represents the type that `details` is.  While the type `K` represents the type that the `shared` property is.

```ts
type T = { foo: string }
type K = { baz: string }

const event = new Event<T, K>('event-type', {
    details: {
        // type T
        foo: 'bar'
    },
    shared: {
        // type K
        baz: 'taz'
    }
})
```

### ErrorEvent<T>
The type `T` for the ErrorEvent represents the type of `error.details.data`

```ts
type T = { foo: string }

const error = new ErrorEvent<T>({
    cn: 'cn',
    code: 9999,
    message: 'simple message',
    failed: failedEventStr,
    data: {
        // type T
        foo: 'bar'
    }
})
```

## Registering Routes

In the hopes of staying organized it is possible to register event-routes in seperate files.
Each route file would have to export an `eventType` string and a `handler` function

The file sturcture would look something like bellow:
```text
src/
|-- main.ts   
|----routes/   
     |-- index.ts
     |-- route-1.ts
     |-- route-2.ts
     |-- route-3.ts
```

index.ts
```ts
import * as route1 from './route-1'
import * as route2 from './route-2'
import * as route3 from './route-3'

export default [route1, route2, route3]
```

route-1.ts
```ts
import { ServerOnEventHandler, Event } from 'edc-ws'

export const eventType = 'route-1'

export const handler: ServerOnEventHandler = async (cause, conn, reply) => {
    const event = new Event('answer-route-1').inherit(cause)
    reply(event)
}
```

main.ts
```ts
import routes from './routes'

const server = new Edc.Server(port)
server.register(routes)
```
> Note: `register()` will add all event routes that are exported in the array that is in the `src/routes/index.ts`

### Further Organize

```text
src/
|-- main.ts   
|-----routes/   
      |-- index.ts
      |-- route-1.ts
      |-- route-2.ts
      |-- route-3.ts
      |-----sub/
              |-- index.ts
              |-- sub-route-1.ts
              |-- sub-route-2.ts
```

src/routes/sub/index.ts
```ts
import * as sub1 from './route-sub-1'
import * as sub2 from './route-sub-2'

export default [sub1, sub2]
```

src/routes/index.ts
```ts
import * as route1 from './route-1'
import * as route2 from './route-2'
import sub from './sub'

export default [route1, route2, ...sub] // Spread Operator makes this one long array.
```

It is possible to go to extreme depths using this, grouping common events together.
