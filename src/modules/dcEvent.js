import { isString, isObject, sanitize } from '../util/datatypes'
import { EVENT_ERROR } from '../util/messages'
import { EV_COOKIE, DIRECT_CALL_EVENTS, unsupportedKeyCharRegex } from '../util/constants'
// import { isChargedEventStructureValid, isEventStructureFlat } from '../util/validator'
import { StorageManager, $ct } from '../util/storage'

export default class DCHandler extends Array {
  #logger
  #oldValues
  #request
  #isPersonalisationActive

  constructor ({ logger, request, isPersonalisationActive }, values) {
    super()
    this.#logger = logger
    this.#oldValues = values
    this.#request = request
    this.#isPersonalisationActive = isPersonalisationActive
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

        if (!DIRECT_CALL_EVENTS.includes(eventName)) {
          this.#logger.reportError(513, eventName + ' is not a direct call event')
          return
        }

        const data = {}
        data.type = 'dcEvent'
        data.evtName = sanitize(eventName, unsupportedKeyCharRegex)

        if (eventsArr.length !== 0) {
          const eventObj = eventsArr.shift()
          if (!isObject(eventObj)) {
            eventsArr.unshift(eventObj)
          }
          // else {
          //   if (eventName === 'Charged') {
          //     if (!isChargedEventStructureValid(eventObj, this.#logger)) {
          //       this.#logger.reportError(511, 'Charged event structure invalid. Not sent.')
          //       continue
          //     }
          //   } else {
          //     if (!isEventStructureFlat(eventObj)) {
          //       this.#logger.reportError(512, eventName + ' event structure invalid. Not sent.')
          //       continue
          //     }
          //   }
          //   data.evtData = eventObj
          // }
        }

        this.#request.processEvent(data)
      }
    }
  }

  getDetails (evtName) {
    if (!this.#isPersonalisationActive()) {
      return
    }
    if (typeof $ct.globalEventsMap === 'undefined') {
      $ct.globalEventsMap = StorageManager.readFromLSorCookie(EV_COOKIE)
    }
    if (typeof $ct.globalEventsMap === 'undefined') {
      return
    }
    const evtObj = $ct.globalEventsMap[evtName]
    const respObj = {}
    if (typeof evtObj !== 'undefined') {
      respObj.firstTime = new Date(evtObj[1] * 1000)
      respObj.lastTime = new Date(evtObj[2] * 1000)
      respObj.count = evtObj[0]
      return respObj
    }
  }
}
