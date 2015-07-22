// jQuery.pan v0.1
// Author: Joshua Carter
// Created: June 05, 2013

// pass window, document, and undefined to our code to 
// improve minifying and avoid conflicts
(function( $, window, document, undefined ){

    var getSize = function($element) {
        return {
            'width': $element.width(), 
            'height': $element.height()
        };
    };

    var toCoords = function(x, y) {
        return {'x': x, 'y': y};
    };
    
    //create constructor for our plugin
    var Plugin = function (element, options) {
        this.settings = $.extend(true, {
            centerSelector: '#center',
            content: element.children(':first'),
            continuous: {
                fps: 20,
                interval: 10
            },
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
            onPan: false
        }, options);
        //Container is element this plugin is applied to;
        //we're panning it's child element: content
        this.container = element;
        this.content = this.settings.content;
        //initialize variables
        //Precalculate the limits of panning - offset stores
        //the current amount of pan throughout
        this.offset = toCoords(
            Number(this.content.css('left').replace('px', '')) | 0,
            Number(this.content.css('top').replace('px', ''))  | 0
        );
        //Mouse state variables, set by bound mouse events below
        this.mousePosition = toCoords(0, 0);
        this.dragging = false;
        this.lastMousePosition = null;
        this.movement = toCoords(0, 0);
        this.focused = false;
        this.circleActive = false;
        this.continuous = {
            active: false,
            directions: {
                'up': 		  [0, -1],
                'up/right':   [.5, -.5],
                'right': 	  [1, 0],
                'down/right': [.5, .5],
                'down':       [0, 1],
                'down/left':  [-.5, .5],
                'left':       [-1, 0],
                'up/left':    [-.5, -.5]
            },
            'id': null,
            keys: [37, 38, 39, 40, 65, 87, 68, 83],
            moveX: 0,
            moveY: 0,
            plugin: this,
            speed: 1000 / this.settings.continuous.fps,
            move: function () {
                //create reference to this for callback
                self = this;
                //if we are active
                if (this.active) {
                    this.plugin.updatePosition (this.moveX, this.moveY);
                    this.id = setTimeout (function(){self.move();}, this.speed, this.moveX, this.moveY);
                }
            }
        };
        
        this.init();
    };
    
    // add methods to our plugin's prototype
    $.extend(Plugin.prototype, {
        //take a movement ratio and multiply by our speed to get a vector
        setVector: function (moveRatio, speed) {
            //if we didn't receive a speed
            if (typeof speed == "undefined") {
                //use the default speed
                speed = this.settings.continuous.interval
            }
            this.continuous.moveX = speed * moveRatio.x;
            this.continuous.moveY = speed * moveRatio.y;
        },
        //take a direction (e.g. 'up' or 'right') and use it to return a movement ratio
        getMoveRatio: function (d) {
            //if we received a valid direction
            if (d in this.continuous.directions) {
                //return the associated ration
                return this.continuous.directions[d];
            }
            //if something went wrong, return 0 (will result in no movement)
            return [0, 0];
        },
        //take a direction (e.g. 'up' or 'right') and use it to set a vector
        setDirection: function (d) {
            //get the movement ratio for this direction
            var r = this.getMoveRatio(d);
            //set the vector
            this.setVector(toCoords(r[0], r[1]));
        },
        getCircleMoveRatio: function(e, $circle) {
            var offset = $circle.offset(),
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
        refreshOffset: function () {
            this.offset = toCoords(
                Number(this.content.css('left').replace('px', '')) | 0,
                Number(this.content.css('top').replace('px', ''))  | 0
            );
        },
        updatePosition: function (x, y, animate) {
            var animate = (typeof animate != 'undefined') ? animate : false,
                newCss;
            this.offset.x += x;
            this.offset.y += y;
            
            //Finally, update the position of the content
            //with our carefully calculated value
            newCss = {
                left: this.offset.x + "px",
                top: this.offset.y + "px"
            };
            //determine whether to animate position change or not
            (animate) ? this.content.animate(newCss, 500) : this.content.css(newCss);
            //if there is an onPan function to execute
            if (typeof this.settings.onPan == 'function') {
                //then execute it
                this.settings.onPan(x, y, offset.x, offset.y);
            }
        },
        mouseMove: function() {
            if(this.lastMousePosition == null) {
                this.lastMousePosition = toCoords(this.mousePosition.x, this.mousePosition.y);    
            }
    
            movement = toCoords(
                this.mousePosition.x - this.lastMousePosition.x,
                this.mousePosition.y - this.lastMousePosition.y
            );
    
            this.lastMousePosition = toCoords(this.mousePosition.x, this.mousePosition.y);
            
            this.updatePosition (movement.x, movement.y);
        },
        //method to setup our plugin
        init: function () {
            //create reference to our plugin
            var plugin = this;
            //set up controls
            plugin.$controls = $();
            for (c in plugin.settings.controls) {
                //if we were given a control
                if (plugin.settings.controls[c]) {
                    //store the controls assigned direction, and add it to $controls
                    plugin.$controls = plugin.$controls.add(
                        $(plugin.settings.controls[c]).data('jqp-control', c)
                    );
                }
            }
                
            $(document).on('mousemove', function(evt) {
                //if special functionality will be executed
                if (plugin.dragging || plugin.circleActive)
                    evt.preventDefault();
                //if our content is being drug by the mouse
                if (plugin.dragging) {
                    plugin.mousePosition.x = evt.pageX - plugin.container.offset().left;
                    plugin.mousePosition.y = evt.pageY - plugin.container.offset().top;
                    plugin.mouseMove();
                }
                //if a circle control is active
                if (plugin.circleActive) {
                    //determine our new movement ratio
                    move = plugin.getCircleMoveRatio(evt, plugin.circleActive);
                    //trigger a buttonchange event on our container
                    plugin.container.trigger('buttonchange', [move[0], move[1]]);
                }
            }).on('mouseup', function(evt) {
                if (plugin.dragging) {	
                    plugin.dragging = false;
                    plugin.lastMousePosition = null;
                }
                //if a circle control is currently active
                if (plugin.circleActive) {
                    //make it not active
                    plugin.circleActive = false;
                }
                //trigger a buttonup event (it's okay if no button was down)
                plugin.container.trigger('buttonup');
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
                //and they key pressed is in the array of continuousKeys
                if (plugin.focused && plugin.continuous.keys.indexOf(evt.which) >= 0) {
                    evt.preventDefault();
                    //keydown will repeatedly fire when key is held
                    //if continous movement is not active (meaning this is the first keydown event)
                    if (!plugin.continuous.active) {
                        //determine movement directions based on key (left, up, right, down)
                        if (evt.which == 37 || evt.which == 65) {
                            plugin.setDirection('left');
                        }
                        else if (evt.which == 38 || evt.which == 87) {
                            plugin.setDirection('up');
                        }
                        else if (evt.which == 39 || evt.which == 68) {
                            plugin.setDirection('right');
                        }
                        else if (evt.which == 40 || evt.which == 83) {
                            plugin.setDirection('down')
                        }
                        //refresh the offset before we start panning
                        plugin.refreshOffset();
                        plugin.continuous.active = true;
                        plugin.continuous.move();
                    }
                }
            }).on('keyup', function (evt) {
                if (plugin.continuous.active) {
                    evt.preventDefault();
                    plugin.continuous.active = false;
                    clearTimeout(plugin.continuous.id);
                    plugin.continuous.id = false;
                }
            });
            
            /*
            content.on('mousedown', function (evt) {
                evt.preventDefault();
            });
            */
            
            plugin.container.on('buttondown', function(evt, moveX, moveY) {
                plugin.setVector(toCoords(moveX, moveY));
                //refresh the offset before we start panning
                plugin.refreshOffset();
                plugin.continuous.active = true;
                plugin.continuous.move();
            }).on('buttonchange', function(evt, moveX, moveY) {
                plugin.setVector(toCoords(moveX, moveY));
            }).on('buttonup', function (evt) {
                plugin.continuous.active = false;
            }).on('mousedown', function(evt) {
                if (evt.target == plugin.container.get(0) 
                    || evt.target == plugin.content.get(0) 
                    || $(evt.target).parents().index(plugin.content) >= 0) {
                        evt.preventDefault();
                        //refresh the offset before we start panning
                        plugin.refreshOffset();
                        plugin.dragging = true;
                }
            }).on('center', function() {
                //find the center element
                var $centerElement = $(plugin.settings.centerSelector),
                    containerCenter, contentCenter;
                //if a center element was found
                if ($centerElement.length > 0) {
                    //get the first element in the center element object (should only be one)
                    $centerElement = $centerElement.eq(0);
                    //calculate center of container (view box) relative to itself
                    containerCenter = toCoords(
                        getSize(plugin.container).width/2,
                        getSize(plugin.container).height/2
                    ),
                    //calculate center of center element relative to the container
                    contentCenter = toCoords(
                        ($centerElement.offset().left - plugin.container.offset().left + ($centerElement.width()/2)),
                        ($centerElement.offset().top - plugin.container.offset().top + ($centerElement.height()/2))
                    );
                    //refresh the offset before we update the offset
                    plugin.refreshOffset();
                    //calculate the difference between the two centers and use it to update the content's offset
                    plugin.updatePosition(
                        containerCenter.x - contentCenter.x,
                        containerCenter.y - contentCenter.y,
                        true
                    );
                }
            });
            
            //handle events on controls
            plugin.$controls.on('mousedown', function (e) {
                //if we have a stored direction for this control
                var $this = $(this),
                    d = $this.data('jqp-control'), 
                    r;
                if (typeof d == "string") {
                    //if this is center control
                    if (d == 'center') {
                        //then trigger a center event on our container
                        plugin.container.trigger('center');
                    }
                    //else if this is a circle control
                    else if (d == 'circle') {
                         //if the target wasn't another control (like a center button)
                         if (e.target == this || !plugin.$controls.is(e.target)) {
                            //store our circle element in a jQuery object
                            plugin.circleActive = $this;
                            move = plugin.getCircleMoveRatio(e, plugin.circleActive);
                            plugin.container.trigger('buttondown', [move[0], move[1]]);
                        }
                    }
                    else {
                        //else, it is a standard directional control, 
                        //get movement ratio for our direction
                        r = plugin.getMoveRatio(d);
                        //then trigger button event on our container
                        plugin.container.trigger('buttondown', [r[0], r[1]]);
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