import 'mocha'
import { expect, assert } from 'chai'
import express from 'express'
import bodyParser from 'body-parser'
import axios, { AxiosResponse } from 'axios'
import { AckEvent, Event } from 'edc-events'

const port = 8086
const app = express()
app.use(bodyParser.json())

app.post('/', (req, res) => {
    const cause = req.body

    const ack = new AckEvent(cause)
    const pause = Math.floor(Math.random() * Math.floor(300))
    return new Promise((resolve) => {
        setTimeout(() => {
            res.send(JSON.stringify(ack))
            resolve()
        }, pause)
    })
})

const instance = app.listen(port)

after('TearDown', async () => {
    instance.close()
})

describe('Http Request comparision', () => {
    it('Load Test,  1 requests', async () => {
        const numberOfRequests = 1

        const promises: Promise<AxiosResponse<any>>[] = []

        for (let i = 0; i < numberOfRequests; i += 1) {
            const cause = new Event(`test-event`, {
                acknowledge: true
            })
            const str = JSON.stringify(cause)
            const resposne = axios({
                method: 'post',
                url: `http://localhost:${port}`,
                data: cause
            })
            promises.push(resposne)
        }

        const acks = await Promise.all(promises)

        for (let i = 0; i < acks.length; i += 1) {
            assert(acks[i], 'Ack must be defined')
            const ack = acks[i].data
            assert(ack.type === 'acknowledgement', 'ack.type must == "acknowledgement')
        }
    }).timeout(10000)
    it('Load Test,  300 requests', async () => {
        const numberOfRequests = 300

        const promises: Promise<AxiosResponse<any>>[] = []

        for (let i = 0; i < numberOfRequests; i += 1) {
            const cause = new Event(`test-event`, {
                acknowledge: true
            })
            const str = JSON.stringify(cause)
            const resposne = axios({
                method: 'post',
                url: `http://localhost:${port}`,
                data: cause
            })
            promises.push(resposne)
        }

        const acks = await Promise.all(promises)

        for (let i = 0; i < acks.length; i += 1) {
            assert(acks[i], 'Ack must be defined')
            const ack = acks[i].data
            assert(ack.type === 'acknowledgement', 'ack.type must == "acknowledgement')
        }
    }).timeout(10000)
    it('Load Test,  500 requests', async () => {
        const numberOfRequests = 500

        const promises: Promise<AxiosResponse<any>>[] = []

        for (let i = 0; i < numberOfRequests; i += 1) {
            const cause = new Event(`test-event`, {
                acknowledge: true
            })
            const str = JSON.stringify(cause)
            const resposne = axios({
                method: 'post',
                url: `http://localhost:${port}`,
                data: cause
            })
            promises.push(resposne)
        }

        const acks = await Promise.all(promises)

        for (let i = 0; i < acks.length; i += 1) {
            assert(acks[i], 'Ack must be defined')
            const ack = acks[i].data
            assert(ack.type === 'acknowledgement', 'ack.type must == "acknowledgement')
        }
    }).timeout(10000)
    it('Load Test,  750 requests', async () => {
        const numberOfRequests = 750

        const promises: Promise<AxiosResponse<any>>[] = []

        for (let i = 0; i < numberOfRequests; i += 1) {
            const cause = new Event(`test-event`, {
                acknowledge: true
            })
            const str = JSON.stringify(cause)
            const resposne = axios({
                method: 'post',
                url: `http://localhost:${port}`,
                data: cause
            })
            promises.push(resposne)
        }

        const acks = await Promise.all(promises)

        for (let i = 0; i < acks.length; i += 1) {
            assert(acks[i], 'Ack must be defined')
            const ack = acks[i].data
            assert(ack.type === 'acknowledgement', 'ack.type must == "acknowledgement')
        }
    }).timeout(10000)
})
