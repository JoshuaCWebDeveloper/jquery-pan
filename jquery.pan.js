// jQuery.pan v0.1
// Author: Joshua Carter
// Created: June 05, 2013

// pass window, document, and undefined to our code to 
// improve minifying and avoid conflicts
(function( $, window, document, undefined ){
    
    "use strict";
    
    //utility functions
    var getSize = function($element) {
        return {
            'width': $element.width(), 
            'height': $element.height()
        };
    },
    toCoords = function(x, y) {
        return {'x': x, 'y': y};
    };
    
    //create constructor for our plugin
    var Plugin = function (element, options) {
        //define defaults
        this._defaults = {
            content: element.children(':first'),
            contentCenter: '#content-center',
            fps: 20,
            controls: {
                'up': false,
                'up/right': false,
                'right': false,
                'down/right': false,
                'down': false,
                'down/left': false,
                'left': false,
                'up/left': false,
                'circle': false,
                'center': false
            },
            onPan: false,
            speed: 200
        };
        //get settings from defaults and options
        this.settings = $.extend(true, {}, this._defaults, options);
        //Container is element this plugin is applied to;
        //we're panning it's child element: content
        this.container = element;
        this.content = this.settings.content;
        //create dragger object to handle drag functionality
        this.dragger = new Dragger(this);
        //create controls object to handle pan controls
        this.controls = new Controls(this);
        //initialize variables
        //Precalculate the limits of panning - offset stores
        //the current amount of pan throughout
        this._offset = this.refreshOffset();
        this.focused = false;
        
        this.init();
    },
    //create constructor for controls
    Controls = function (plugin) {
        //set a reference to our plugin
        this.plugin = plugin;
        //create a circles object for circle controls
        this.circles = new Circles(this);
        //create jQuery object to store controls
        this.$jQ = $();
        //private properties to store state of controls
        this._active = false;
        this._activeId = false;
        this._vector = toCoords(0, 0);
        //private properties to store static info
        //amount of time each frame lasts (for timers)
        this._frameLength = 1000/plugin.settings.fps;
        //amount content moves each frame
        this._frameMove = plugin.settings.speed/plugin.settings.fps;
        //private properties to store control maps
        //directions that controls can move content and their movement ratios
        this._directions = {
            'up': 		  [0, -1],
            'up/right':   [.5, -.5],
            'right': 	  [1, 0],
            'down/right': [.5, .5],
            'down':       [0, 1],
            'down/left':  [-.5, .5],
            'left':       [-1, 0],
            'up/left':    [-.5, -.5]
        };
        //keys (jQuery key ids) that can move content and their directions
        this._keys = {
            37: 'left',
            65: 'left', 
            38: 'up',
            87: 'up', 
            39: 'right',
            68: 'right', 
            40: 'down',
            83: 'down'
        };
        
        this.init();
    },
    //create constructor for special circle controls
    Circles = function (controls) {
        //set a refernce to our controls
        this.controls = controls;
        //private properties to store the state of the control
        this._active = false; 
        this._current = null; 
    },
    //create constructor for basic mouse pan functionality
    Dragger = function (plugin) {
        //set a reference to our plugin
        this.plugin = plugin;
        //private properties, to store the state of drag functionality
        this._mousePosition = toCoords(0, 0);
        this._dragging = false;
        this._lastMousePosition = null;
    };
    
    //add methods to the controls prototype
    $.extend(Controls.prototype, {
        //checks if a controls is active
        isActive: function () {
            return this._active;    
        },
        //checks if a jQury key id is a control key
        validKey: function (eWhich) {
            return (eWhich in this._keys);
        },
        //takes a jQuery control element and returns the assigned control type
        getControlType: function ($control) {
            var d = $control.data('jqp-control');
            //if we have a valid control type
            if (typeof d == "string" && d in this.plugin.settings.controls) {
                return d;
            }
            //if we couldn't find a valid direction or type, return false
            return false;
        },
        //take a movement ratio and multiply by our speed to get a vector
        setVector: function (moveRatio, speed) {
            var frmmv;
            //if we received a speed
            if (typeof speed != "undefined") {
                //determine our frame movement using this new speed
                frmmv = speed/this.plugin.settings.fps;
            }
            else {
                //use our default speed
                frmmv = this._frameMove;
            }
            //set our vector
            this._vector = toCoords(frmmv*moveRatio.x, frmmv*moveRatio.y);
        },
        //take a direction (e.g. 'up' or 'right') and use it to return a movement ratio
        getMoveRatio: function (d) {
            //if we received a valid direction
            if (d in this._directions) {
                //return the associated ratio
                return this._directions[d];
            }
            //if something went wrong, return 0 (will result in no movement)
            return [0, 0];
        },
        //sets a vector using either a direction with an optional speed, or a movement ratio
        setControl: function (a, b) {
            var speed, r;
            //if we received a direction
            if (a in this._directions) {
                //get a movement ratio for our direction
                r = this.getMoveRatio(a);
                //validate possible speed
                speed = (b > 0) ? b : undefined;
                //set the vector
                this.setVector(toCoords(r[0], r[1]), speed);       
            }
            else {
                //assume we received a movement ratio
                this.setVector(toCoords(a, b));
            }
        },
        _frameLoop: function () {
            //create reference to this for callback
            var self = this;
            //if we are active
            if (this.isActive()) {
                this.plugin.updatePosition (this._vector.x, this._vector.y);
                this._activeId = setTimeout (function(){self._frameLoop();}, this._frameLength);
            }
        },
        //starts moving the content
        move: function () {
            //refresh the offset before we start panning
            this.plugin.refreshOffset();
            //indicate that a control is now active
            this._active = true;
            //start the loop
            this._frameLoop();
        },
        stop: function () {
            //if we have an active control
            if (this.isActive()) {
                //indicate that no control is now active
                this._active = false;
                //clear any remaining frames from the loop
                clearTimeout(this._activeId);
                this._activeId = false;
            }
        },
        //takes a jQuery key id and uses it to execute a control
        handleKey: function (eWhich) {
            //if we have a valid key
            if (this.validKey(eWhich)) {
                //trigger a controldown event using our key's direction
                this.plugin.container.trigger("controldown", [this._keys[eWhich]]);
            }
        },
        
        //set up controls
        init: function () {
            //loop through the defined controls in our plugin's settings
            for (var c in this.plugin.settings.controls) {
                //if we were given a control
                if (this.plugin.settings.controls[c]) {
                    //store the control's assigned direction or type, and add it
                    this.$jQ = this.$jQ.add(
                        $(this.plugin.settings.controls[c]).data('jqp-control', c)
                    );
                }
            }
        }
    });
    
    //add methods to the circles prototpye
    $.extend(Circles.prototype, {
        //checks if a circle control is active
        isActive: function () {
            return this._active;    
        },
        //set's a circle control as the currently active control
        setActive: function($circle) {
            //indicate a circle control is active
            this._active = true;
            //set the passed jQuery circle control as the active circle
            this._current = $circle;
        },
        //unset the currently active control
        unsetActive: function() {
            //indicate there is no active circle control
            this._active = false;
            this._current = null;  
        },
        //get a movement ratio based on the cursor's location on the circle control
        getMoveRatio: function(e) {
            var $circle = this._current,
                offset = $circle.offset(),
                size = getSize($circle),
                range = toCoords(
                    size.height / 2, 
                    size.width / 2
                ),
                axis = toCoords(
                    offset.top + range.x, 
                    offset.left + range.y
                ),
                s = toCoords(
                    (axis.y < e.pageX) ? 1 : -1,
                    (axis.x < e.pageY) ? 1 : -1
                ),
                diff = toCoords(
                    Math.abs(axis.x - e.pageY),
                    Math.abs(axis.y - e.pageX)
                );
            return [
                ((diff.x > diff.y) ? diff.y/diff.x : 1) * s.x,
                ((diff.y > diff.x) ? diff.x/diff.y : 1) * s.y
            ];
        },
        //handles the use of a circle control
        handleCircle: function (evt, element) {
            var move;
            //if the target wasn't another control (like a center button)
            if (evt.target == element || !this.controls.$jQ.is(evt.target)) {
                //set our circle control as active
                this.setActive($(element));
                //get a movement ratio from our mouse location on the circle
                move = this.getMoveRatio(evt);
                //trigger a controldown event
                this.controls.plugin.container.trigger('controldown', [move[0], move[1]]);
            }
        },
        update: function (evt) {
            //determine our new movement ratio
            var move = this.getMoveRatio(evt);
            //trigger a controlchange event on our container
            this.controls.plugin.container.trigger('controlchange', [move[0], move[1]]);
        }
    });
    
    // add methods to the Dragger prototype
    $.extend(Dragger.prototype, {
        //determines if content is currently being drug
        isDragging: function () {
            return this._dragging;    
        },
        //updates the mouse position
        updateMousePosition: function (evt) {
            //make position relative to container
            this._mousePosition = toCoords(
                evt.pageX - this.plugin.container.offset().left, 
                evt.pageY - this.plugin.container.offset().top
            );
        },
        //moves the content based on how much the mouse has moved
        mouseMove: function() {
            var movement;
            //if we have no lastMousePosition
            if(this._lastMousePosition == null) {
                //initialize it to our current position
                this._lastMousePosition = toCoords(this._mousePosition.x, this._mousePosition.y);    
            }
            //determine movement based on how much our mouse has moved
            movement = toCoords(
                this._mousePosition.x - this._lastMousePosition.x,
                this._mousePosition.y - this._lastMousePosition.y
            );
            //update lastMousePosition to our current position
            this._lastMousePosition = toCoords(this._mousePosition.x, this._mousePosition.y);
            //move the content
            this.plugin.updatePosition (movement.x, movement.y);
        },
        //toggles dragging on
        start: function () {
            //refresh the offset before we start panning
            this.plugin.refreshOffset();
            //indicate we are now dragging
            this._dragging = true;
        },
        //toggles dragging off
        stop: function () {
            //erase lastMousePosition
            this._lastMousePosition = null;
            //indicate we are no longer dragging
            this._dragging = false;
        }
    });
    
    // add methods to our plugin's prototype
    $.extend(Plugin.prototype, {
        refreshOffset: function () {
            this._offset = toCoords(
                Number(this.content.css('left').replace('px', '')) | 0,
                Number(this.content.css('top').replace('px', ''))  | 0
            );
        },
        updatePosition: function (x, y, animate) {
            var animate = (typeof animate != 'undefined') ? animate : false,
                newCss;
            this._offset.x += x;
            this._offset.y += y;
            
            //Finally, update the position of the content
            //with our carefully calculated value
            newCss = {
                left: this._offset.x + "px",
                top: this._offset.y + "px"
            };
            //determine whether to animate position change or not
            (animate) ? this.content.animate(newCss, 500) : this.content.css(newCss);
            //if there is an onPan function to execute
            if (typeof this.settings.onPan == 'function') {
                //then execute it
                this.settings.onPan(x, y, offset.x, offset.y);
            }
        },
        //centers the content in the container
        center: function () {
            //find the center element
            var $centerElement = $(this.settings.contentCenter),
                //calculate center of container (view box) relative to itself
                cs = getSize(this.container),
                containerCenter = toCoords(cs.width/2, cs.height/2), 
                //calculate the position of the content relative to the container
                co = this.container.offset(),
                cno = this.content.offset(),
                contentOffset = {
                    left: cno.left-co.left, 
                    top: cno.top-co.top
                },
                ces, ceo, contentCenter;
            //if a center element was found
            if ($centerElement.length > 0) {
                //get the first element in the center element object (should only be one)
                $centerElement = $centerElement.eq(0);
                //calculate center of center element relative to the content
                ces = getSize($centerElement);
                ceo = $centerElement.offset();
                contentCenter = toCoords(
                    (ceo.left - cno.left + (ces.width/2)),
                    (ceo.top - cno.top + (ces.height/2))
                );
            }
            else {
                //calculate the center of the content relative to itself using its dimentions
                ces = getSize(this.content);
                contentCenter = toCoords(ces.width/2, ces.height/2);  
            }
            //make the content center relative to the container (instead of content)
            contentCenter.x += contentOffset.left;
            contentCenter.y += contentOffset.top;
            //refresh the offset before we update the offset
            this.refreshOffset();
            //calculate the difference between the two centers and use it to update the content's offset
            this.updatePosition(
                containerCenter.x - contentCenter.x,
                containerCenter.y - contentCenter.y,
                true
            );
        },
        //method to setup our plugin
        init: function () {
            //create reference to our plugin
            var plugin = this;
                
            $(document).on('mousemove', function(evt) {
                //if special functionality will be executed
                if (plugin.dragger.isDragging() || plugin.controls.circles.isActive())
                    evt.preventDefault();
                //if our content is being drug by the mouse
                if (plugin.dragger.isDragging()) {
                    //update the mouse position
                    plugin.dragger.updateMousePosition(evt);
                    //move the content
                    plugin.dragger.mouseMove();
                }
                //if a circle control is active
                if (plugin.controls.circles.isActive()) {
                    plugin.controls.circles.update(evt);
                }
            }).on('mouseup', function(evt) {
                //if we are currently dragger
                if (plugin.dragger.isDragging()) {	
                    //stop dragging
                    plugin.dragger.stop();
                }
                //if a circle control is currently active
                if (plugin.controls.circles.isActive()) {
                    //make it not active
                    plugin.controls.circles.unsetActive();
                }
                //trigger a controlup event (it's okay if no control was down)
                plugin.container.trigger('controlup');
            }).on('mousedown', function (evt) {
                //if the element clicked was the view box or inside the view box
                if (evt.target == plugin.container.get(0) || $(evt.target).parents().index(plugin.container) >= 0) {
                    //if the view box is not "focused" (non-technical)
                    if (!plugin.focused) {
                        //"focus" it
                        plugin.focused = true;
                    }
                }
                else {
                    //if the view box is "focused" (non-technical)
                    if (plugin.focused) {
                        //"unfocus" it
                        plugin.focused = false;
                    }
                }
            }).on('keydown', function (evt) {
                //if the view box is "focused" (non-technical)
                //and they key pressed is a control key
                if (plugin.focused && plugin.controls.validKey(evt.which)) {
                    evt.preventDefault();
                    //keydown will repeatedly fire when key is held
                    //if control movement is not active (meaning this is the first keydown event)
                    if (!plugin.controls.isActive()) {
                        //handle the key and send controldown event
                        plugin.controls.handleKey(evt.which);
                    }
                }
            }).on('keyup', function (evt) {
                //if there is an active control
                if (plugin.controls.isActive()) {
                    evt.preventDefault();
                    //stop it
                    plugin.container.trigger("controlup");
                }
            });
            
            /*
            content.on('mousedown', function (evt) {
                evt.preventDefault();
            });
            */
            
            plugin.container.on('controldown', function(evt, a, b) {
                //use set control to set a vector
                plugin.controls.setControl(a, b);
                //start our controlled move
                plugin.controls.move();
            }).on('controlchange', function(evt, a, b) {
                //use set control to set a vector
                plugin.controls.setControl(a, b);
            }).on('controlup', function (evt) {
                //stop our controlled move
                plugin.controls.stop();
            }).on('mousedown', function(evt) {
                if (evt.target == plugin.container.get(0) 
                    || evt.target == plugin.content.get(0) 
                    || $(evt.target).parents().index(plugin.content) >= 0) {
                        evt.preventDefault();
                        //enable dragging
                        plugin.dragger.start();
                }
            }).on('center', function() {
                //center our content
                plugin.center();
            });
            
            //handle events on controls
            plugin.controls.$jQ.on('mousedown', function (e) {
                //if we have a stored direction for this control
                var d = plugin.controls.getControlType($(this));
                if (d) {
                    //if this is center control
                    if (d == 'center') {
                        //then trigger a center event on our container
                        plugin.container.trigger('center');
                    }
                    //else if this is a circle control
                    else if (d == 'circle') {
                         //handle the circle and send a controldown event
                         plugin.controls.circles.handleCircle(e, this);
                    }
                    else {
                        //else, it is a standard directional control, 
                        //trigger control event on our container
                        plugin.container.trigger('controldown', [d]);
                    }
                }
            });
        }
    });
							
	$.fn.pan = function(arg1) {
	    //create options
		var options = (typeof arg1 == 'object' && arg1 !== null) ? arg1 : {};
		//create plugin
        new Plugin (this, options);
        //return this to maintain jQuery chainability
        return this;
    };
	
})( jQuery, window, document );