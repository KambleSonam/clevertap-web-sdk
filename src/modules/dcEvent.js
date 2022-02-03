import { isString, isObject, sanitize } from '../util/datatypes'
import { EVENT_ERROR } from '../util/messages'
import { SYSTEM_EVENTS, unsupportedKeyCharRegex } from '../util/constants'
import { isChargedEventStructureValid, isEventStructureFlat } from '../util/validator'

export default class DCHandler extends Array {
  #logger
  #oldValues
  #request

  constructor ({ logger, request }, values) {
    super()
    this.#logger = logger
    this.#oldValues = values
    this.#request = request
  }

  push (...eventsArr) {
    this.#processDCEventArray(eventsArr)
    return 0
  }

  _processOldValues () {
    if (this.#oldValues) {
      this.#processDCEventArray(this.#oldValues)
    }
    this.#oldValues = null
  }

  #processDCEventArray (eventsArr) {
    if (Array.isArray(eventsArr)) {
      while (eventsArr.length > 0) {
        var eventName = eventsArr.shift()
        if (!isString(eventName)) {
          this.#logger.error(EVENT_ERROR)
          continue
        }

        if (eventName.length > 1024) {
          eventName = eventName.substring(0, 1024)
          this.#logger.reportError(510, eventName + '... length exceeded 1024 chars. Trimmed.')
        }

        if (SYSTEM_EVENTS.includes(eventName)) {
          this.#logger.reportError(513, eventName + ' is a restricted system event. It cannot be used as an event name.')
          continue
        }

        const data = {}
        data.type = 'event'
        data.evtName = sanitize(eventName, unsupportedKeyCharRegex)

        if (eventsArr.length !== 0) {
          const eventObj = eventsArr.shift()
          if (!isObject(eventObj)) {
            eventsArr.unshift(eventObj)
          } else {
            if (eventName === 'Charged') {
              if (!isChargedEventStructureValid(eventObj, this.#logger)) {
                this.#logger.reportError(511, 'Charged event structure invalid. Not sent.')
                continue
              }
            } else {
              if (!isEventStructureFlat(eventObj)) {
                this.#logger.reportError(512, eventName + ' event structure invalid. Not sent.')
                continue
              }
            }
            data.evtData = eventObj
          }
        }

        this.#request.processEvent(data)
      }
    }
  }
}
