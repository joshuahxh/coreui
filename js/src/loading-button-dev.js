/**
 * --------------------------------------------------------------------------
 * CoreUI (v3.2.2): loading-button.js
 * Licensed under MIT (https://coreui.io/license)
 * --------------------------------------------------------------------------
 */

/*

Library

manipulator:
setDataAttribute - dodaje atrybut
removeDataAttribute
getDataAttribute - zwraca atrybut
getDataAttributes - zwraca atrybuty
offset - zwraca offset
position
toggleClass

selector-engine:
matches
find
findOne
children
parents
prev
next

js dom:
classlist .add, .remove .containts
spr
loadingbutton

//

Pytania

Użycie komponentów
Usuniecie dom podwójne new i porównanie do jquery - omówione.
Przygotowałem 2 metody statyczne do zrobienia tego (jest w multi-select).
Przykład:
var multiSelect = coreui.MultiSelect.new(multiElement, {
  progress:50
});
zamiast = new ...

Część prywatnych mają parametry jakby były static (np. w alert)
Jako prywatne nie są wykorzystywane w innym kontekście niż this. Czy to zamierzone było?

Zalecenia co do wydzielenia logiki koponentów
Na teraz logika i sczególnie duża część kodu, która nie jest związana z konkretnym framworkiem, jest powielona.
Możliwe jest stworzenie obiektu ComponentsShared - przykład dla DataTable.

Inne
Scss - Dla kopi, problem, wyrzucilem linter na teraz, np. dla .c-select > select.hide

dispose w alert


Metody a prywatne

metody - dostępne z zewnątrz
jeżeli tylko z zewnątrz, ciało jest bezpośrednio w metodzie
jeżeli używana jest również z wewnątrz to ok


Methody wspólne

.new (static) - tworzy obiekt i łączy go z elementem
.remove - usuwa
.update - aktualizuje config
.dispose -

Static

getInstance - zwraca
.new - tworzy obiekt, ponowne użycie .new zwraca stary obiekt, nie wpływa na config


!!!

spr par w loading

document.createElement('div');

dom:
attributes
children
innerHtml, innerText, outer...
firstChild, lastChild
dataset
nodeType: 1 dla li
parentNode, parentElement
textContent
value


-

Komponent loading-button
metody: start, stop
data-: time
data-api: -
własne data- atrybuty:
generated content: stripe
/
Description:
interface:
time (ms)
waitOnEnd
onChange
data:
loadingState - component in loading state?

Komponent multi-select
metody: open, close, search
data-:
data-api: -
własne data- atrybuty:
generated content: -
/
Description:
-

*/


import {
  getjQuery,
  TRANSITION_END,
  emulateTransitionEnd,
  getElementFromSelector,
  getTransitionDurationFromElement,
  typeCheckConfig
} from './util/index'
import Data from './dom/data'
import EventHandler from './dom/event-handler'
import Manipulator from './dom/manipulator'
import SelectorEngine from './dom/selector-engine'

/**
 * ------------------------------------------------------------------------
 * Constants
 * ------------------------------------------------------------------------
 */

const NAME = 'loadingbutton'
const VERSION = '3.2.2'
const DATA_KEY = 'coreui.loadingbutton'
const EVENT_KEY = `.${DATA_KEY}`
const DATA_API_KEY = '.data-api'

const SELECTOR_SPINNER = '[data-spinner="true"]' //m
const SELECTOR_DISMISS = '[data-dismiss="alert"]'

const EVENT_START = `start${EVENT_KEY}` //m
const EVENT_STOP = `stop${EVENT_KEY}` //m
const EVENT_CLOSE = `close${EVENT_KEY}`
const EVENT_CLOSED = `closed${EVENT_KEY}`
const EVENT_CLICK_DATA_API = `click${EVENT_KEY}${DATA_API_KEY}`

const CLASSNAME_LOADING_BUTTON = 'c-loading-button' //m
const CLASSNAME_FADE = 'fade'
const CLASSNAME_SHOW = 'show'

const Default = {
  loading: false,
  progress: 100,//
  waitOnEnd: true,//
  time: 2.5,//
  variant: 'left-to-right',
  stripeColor: 'rgba(0, 0, 0, 0.1)',//
  showSpinner: false, //
  ///
  //track: false,
  //trackInterval: 1,
}

const DefaultType = {
  loading: 'boolean',
  progress: 'number',
  waitOnEnd: 'boolean',
  time: 'number',
  variant: 'string',
  stripeColor: 'string',
  showSpinner: 'boolean'
}

/**
 * ------------------------------------------------------------------------
 * Class Definition
 * ------------------------------------------------------------------------
 */

class LoadingButton {

  constructor(element, config) {
    this._element = element
    this._config = this._getConfig(config)

    // zapisuje obiekt wewnatrz elementu dom
    if (this._element) {
      Data.setData(element, DATA_KEY, this)
    }

    // dodaje tylko raz
    /*
    if (Data.getData(element, DATA_KEY)) {
      // already found
      //this._elementStripe = SelectorEngine.findOne('.c-stripe', element);
      return;
    }
    */

    this._elementSpinner = SelectorEngine.findOne(SELECTOR_SPINNER, element);
    if (this._elementSpinner) {
      this._elementSpinner.style.display = 'none';
    }

    this._elementStripe = this._addStripe(element);

  }


  // Getters

  static get VERSION() { // zwraca wersje
    return VERSION
  }

  static get Default() {
    return Default
  }

  static get DefaultType() {
    return DefaultType
  }


  // Public - metody publiczne

  start(element) { // uruchamia loading
    let rootElement = this._element
    if (element) {
      rootElement = this._getRootElement(element) // po podaniu dom szuka najbliższego
    }
    const customEvent = this._triggerStartEvent(rootElement)
    if (customEvent === null || customEvent.defaultPrevented) {
      return
    }
    setTimeout(()=>{
      this._animateStripe(this._elementStripe, this._elementSpinner);
      setTimeout(()=>{
        if (!this._config.waitOnEnd)
          this.stop();
      }, this._config.time*1000);
    }, 1);
  }

  stop(element) { // stop loading
    const customEvent = this._triggerStopEvent(this._element)
    if (customEvent === null || customEvent.defaultPrevented) {
      return;
    }
    this._stopStripe(this._elementStripe, this._elementSpinner);
  }

  //

  dispose() { // usuwa siebie z elementu dom
    Data.removeData(this._element, DATA_KEY)
    this._element = null
  }


  // Private - prywatne

  _getConfig(config) {
    config = {
      ...this.constructor.Default,
      ...Manipulator.getDataAttributes(this._element),
      ...config
    }

    typeCheckConfig(
      NAME,
      config,
      this.constructor.DefaultType
    )

    return config
  }

  _getRootElement(element) { // zwraca glowny dom
    //getElementFromSelector(element) || - data-target?
    return element.closest(`.${CLASSNAME_LOADING_BUTTON}`)
  }

  _triggerStartEvent(element) {
    return EventHandler.trigger(element, EVENT_START)
  }

  _triggerStopEvent(element) {
    return EventHandler.trigger(element, EVENT_STOP)
  }

  _addStripe(element) {
    const html = '<div class="c-stripe" style="\
    background-color: '+this._config.stripeColor+';\
    "></div>';
    const stripe = Manipulator.createElementFromHTML(html);
    this._resetStripe(stripe);
    element.prepend(stripe);
    return stripe;
  }

  _resetStripe(element) {
    element.style.transition = 'left 0s linear';
    element.style.left = '-100%';
  }

  _stopStripe(element, elementSpinner) {
    this._resetStripe(element);
    if (elementSpinner)
      elementSpinner.style.display = 'none';
  }

  _animateStripe(element, elementSpinner) {
    element.style.transition = 'left '+this._config.time+'s linear';
    element.style.left = (-100+this._config.progress)+'%';
    if (elementSpinner)
      elementSpinner.style.display = 'inline-block';
  }


  // Static

  static jQueryInterface(config) {
    return this.each(function () {
      let data = Data.getData(this, DATA_KEY)

      if (!data) {
        data = new LoadingButton(this)
      }

      if (config === 'start' || config === 'stop') {
        data[config](this)
      }
    })
  }

  static getInstance(element) { // zwraca dom obj. ?
    return Data.getData(element, DATA_KEY)
  }
}

const $ = getjQuery()

/**
 * ------------------------------------------------------------------------
 * jQuery
 * ------------------------------------------------------------------------
 * add .alert to jQuery only if jQuery is present
 */

/* istanbul ignore if */
if ($) {
  const JQUERY_NO_CONFLICT = $.fn[NAME]
  $.fn[NAME] = LoadingButton.jQueryInterface
  $.fn[NAME].Constructor = LoadingButton
  $.fn[NAME].noConflict = () => {
    $.fn[NAME] = JQUERY_NO_CONFLICT
    return LoadingButton.jQueryInterface
  }
}

export default LoadingButton
