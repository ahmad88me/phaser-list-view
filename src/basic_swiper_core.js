import _ from 'lodash';
import MathUtils from './utils/math_utils'
import 'gsap'

var _ptHelper = new Phaser.Point()

// ** WORK IN PROGRESS **
//
// Similar to the Scroller class but there is no focus on a start and end of the scroll surface.
// For example with Scroller if you swiped left 3 times you would continue to go further left and
// closer to the end of the limit.
// With BasicSwiper if you swiped left 3 times, each time you receive values between -1 and 1, depending
// on the direction you swipe.
//
// TODO - consolidate BasicSwiper and Scroller. At least they could share same functions
//
var BasicSwiperCore = function(game, bounds, options = {}) {

  this.game        = game

  let defaultOptions = {
    from: 0,
    to: 200,
    direction: 'y',
    snapStep : 10,
    duration : 1, // (s) duration of the inertial scrolling simulation.
    time : {}, // contains timestamps of the most recent down, up, and move events
    swipeThreshold: 5, // (pixels) must move this many pixels for a swipe action
    swipeTimeThreshold: 250, // (ms) determines if a swipe occurred: time between last updated movement @ touchmove and time @ touchend, if smaller than this value, trigger swipe
  }

  this.o = this.options = _.extend(defaultOptions, options)

  this._updateMinMax()

  this.addListeners()

  this.scrollObject = {}
  this.scrollObject[this.o.direction] = this.o.from

  // set tween that will be re-used for moving scrolling sprite
  this.tweenScroll = TweenMax.to(this.scrollObject, 0, {
    ease: Quart.easeOut,
    onUpdate: this.handleUpdate,
    onUpdateScope: this,
    onComplete: this.handleComplete,
    onCompleteScope: this
  })
}

BasicSwiperCore.prototype = Object.create({

  addListeners() {
    this.events = {
      onUpdate    : new Phaser.Signal(),
      onInputUp   : new Phaser.Signal(),
      onInputDown : new Phaser.Signal(),
      onInputMove : new Phaser.Signal(),
      onComplete  : new Phaser.Signal(),
      onSwipe     : new Phaser.Signal()
    }
  },

  removeListeners() {
    _.forIn(this.events, (signal, key)=> {
      signal.removeAll()
    })
  },

  destroy() {
    this.removeListeners()
  },

  isTweening() {
    return TweenMax.isTweening(this.scrollObject)
  },

  handleDown(target, pointer) {
    this.old = this.down = pointer[this.o.direction]
    this.target = 0
    console.log('set down', this.target)
    this.o.time.down = pointer.timeDown

    //stop tween for touch-to-stop
    this.tweenScroll.pause()

    this.events.onInputDown.dispatch(target, pointer)
  },

  addDiff( diff ) {
    this.target -= diff
    this.scrollObject[this.o.direction] = this.target
    // console.log('addDiff', diff, this.target)
    this.handleUpdate()
  },

  handleUp(target, pointer) {
    //store timestamp for event
    this.o.time.up = pointer.timeUp

    var o = {
      duration: this.o.duration,
      target: this.target
    }

    // *** SWIPING
    this._addSwiping(o, pointer)

    // *** SNAPPING
    this._addSnapping(o)

    this.doTween(o.duration, o.target)

    this.events.onInputUp.dispatch(target, pointer)

  },

  _addSwiping(o, pointer) {
    let swipeDistance = Math.abs(this.down - this.old)
    if (this.o.time.up - this.o.time.down < this.o.swipeTimeThreshold && swipeDistance > this.o.swipeThreshold) {
      let direction = (pointer[this.o.direction] < this.down) ? 'forward' : 'backward'

      if (direction == 'forward') {
        o.target -= this.o.snapStep/2
      } else {
        o.target += this.o.snapStep/2
      }

      this.events.onSwipe.dispatch(direction)
    }
    return o
  },

  _addSnapping(o) {
    o.target = MathUtils.nearestMultiple(o.target, this.o.snapStep)
    return o
  },

  doTween(duration, target) {
    // console.log('doTween', duration, target)
    //stop a tween if it is currently happening
    let o = {}
    o[this.o.direction] = target

    this.tweenScroll.pause()
    this.tweenScroll.duration(duration)
    this.tweenScroll.updateTo(o, true)
    this.tweenScroll.restart()
  },

  // dispatches a value between -1 and 1 depending on the direction of the swipe action.
  handleUpdate() {
    this.events.onUpdate.dispatch( MathUtils.scaleBetween(-1, 1, MathUtils.percentageBetween2( this.scrollObject[this.o.direction], -this.length, this.length ) ) )
  },

  handleComplete() {
    // reset multiplier when finished
    this.o.multiplier = 1
    this.events.onComplete.dispatch()
  },

  _updateMinMax() {
    this.min = Math.min(this.o.from, this.o.to)
    this.max = Math.max(this.o.from, this.o.to)
    this.length = Math.abs(this.max - this.min)
    this.o.snapStep = this.length
  },

})

BasicSwiperCore.prototype.constructor = BasicSwiperCore

export default BasicSwiperCore
