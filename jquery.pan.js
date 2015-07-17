// jQuery.pan v0.1
// Author: Joshua Carter
// Created: June 05, 2013

(function( $ ){

    var getSize = function($element) {
        return {
            'width': $element.width(), 
            'height': $element.height()
        };
    };

    var toCoords = function(x, y) {
        return {'x': x, 'y': y};
    };

    $.fn.pan = function(arg1) {
		//create options
		var options = (typeof arg1 == 'object' && arg1 !== null) ? arg1 : {},
			settings = $.extend(true, {
				centerSelector: '#center',
				content: this.children(':first'),
				continuous: {
					fps: 20,
					interval: 10
				},
				onPan: false
			}, options),
			//Container is element this plugin is applied to;
			//we're panning it's child element: content
			container = this,
			content = settings.content,
			//initialize variables
			//Precalculate the limits of panning - offset stores
			//the current amount of pan throughout
			offset = toCoords(
				Number(content.css('left').replace('px', '')) | 0,
				Number(content.css('top').replace('px', ''))  | 0
			),
			//Mouse state variables, set by bound mouse events below
			mousePosition = toCoords(0, 0),
			dragging = false,
			lastMousePosition = null,
			movement = toCoords(0, 0),
			focused = false,
			continuous = {
				active: false,
				'id': null,
				keys: [37, 38, 39, 40, 65, 87, 68, 83],
				moveX: 0,
				moveY: 0,
				speed: 1000 / settings.continuous.fps,
				move: function () {
					if (continuous.active) {
						updatePosition (continuous.moveX, continuous.moveY);
						continuous.id = setTimeout (continuous.move, continuous.speed, continuous.moveX, continuous.moveY);
					}
				}
			},
			refreshOffset = function () {
				offset = toCoords(
					Number(content.css('left').replace('px', '')) | 0,
					Number(content.css('top').replace('px', ''))  | 0
				);
			},
			updatePosition = function (x, y, animate) {
				var animate = (typeof animate != 'undefined') ? animate : false,
					newCss;
				offset.x += x;
				offset.y += y;
				
				//Finally, update the position of the content
				//with our carefully calculated value
				newCss = {
					left: offset.x + "px",
					top: offset.y + "px"
				};
				//determine whether to animate position change or not
				(animate) ? content.animate(newCss, 500) : content.css(newCss);
				//if there is an onPan function to execute
				if (typeof settings.onPan == 'function') {
					//then execute it
					settings.onPan(x, y, offset.x, offset.y);
				}
			},
			mouseMove = function() {
				if(lastMousePosition == null) {
					lastMousePosition = toCoords(mousePosition.x, mousePosition.y);    
				}

				movement = toCoords(
					mousePosition.x - lastMousePosition.x,
					mousePosition.y - lastMousePosition.y
				);

				lastMousePosition = toCoords(mousePosition.x, mousePosition.y);
				
				updatePosition (movement.x, movement.y);
			};
							
			
		$(document).on('mousemove', function(evt) {
			if (dragging) {
				evt.preventDefault();
				mousePosition.x = evt.pageX - container.offset().left;
				mousePosition.y = evt.pageY - container.offset().top;
				mouseMove();
			}
		}).on('mouseup', function(evt) {
			if (dragging) {	
				dragging = false;
				lastMousePosition = null;
			}
		}).on('mousedown', function (evt) {
			//if the element clicked was the view box or inside the view box
			if (evt.target == container.get(0) || $(evt.target).parents().index(container) >= 0) {
				//if the view box is not "focused" (non-technical)
				if (!focused) {
					//"focus" it
					focused = true;
				}
			}
			else {
				//if the view box is "focused" (non-technical)
				if (focused) {
					//"unfocus" it
					focused = false;
				}
			}
		}).on('keydown', function (evt) {
			//if the view box is "focused" (non-technical)
			//and they key pressed is in the array of continuousKeys
			if (focused && continuous.keys.indexOf(evt.which) >= 0) {
				evt.preventDefault();
				//keydown will repeatedly fire when key is held
				//if continous movement is not active (meaning this is the first keydown event)
				if (!continuous.active) {
					//determine movement directions based on key (left, up, right, down)
					if (evt.which == 37 || evt.which == 65) {
						continuous.moveX = -settings.continuous.interval;
						continuous.moveY = 0;
					}
					else if (evt.which == 38 || evt.which == 87) {
						continuous.moveX = 0;
						continuous.moveY = -settings.continuous.interval;
					}
					else if (evt.which == 39 || evt.which == 68) {
						continuous.moveX = settings.continuous.interval;
						continuous.moveY = 0;
					}
					else if (evt.which == 40 || evt.which == 83) {
						continuous.moveX = 0;
						continuous.moveY = settings.continuous.interval;
					}
					//refresh the offset before we start panning
					refreshOffset();
					continuous.active = true;
					continuous.move();
				}
			}
		}).on('keyup', function (evt) {
			if (continuous.active) {
				evt.preventDefault();
				continuous.active = false;
			}
		});
		
		/*
		content.on('mousedown', function (evt) {
			evt.preventDefault();
		});
		*/
		
		this.on('buttondown', function(evt, moveX, moveY) {
			continuous.moveX = settings.continuous.interval * moveX,
			continuous.moveY = settings.continuous.interval * moveY;
			//refresh the offset before we start panning
			refreshOffset();
			continuous.active = true;
			continuous.move();
		}).on('buttonchange', function(evt, moveX, moveY) {
			continuous.moveX = settings.continuous.interval * moveX;
			continuous.moveY = settings.continuous.interval * moveY;
		}).on('buttonup', function (evt) {
			continuous.active = false;
		}).on('mousedown', function(evt) {
			if (evt.target == container.get(0) 
				|| evt.target == content.get(0) 
				|| $(evt.target).parents().index(content) >= 0) {
					evt.preventDefault();
					//refresh the offset before we start panning
					refreshOffset();
					dragging = true;
			}
		}).on('center', function() {
			//find the center element
			var $centerElement = $(settings.centerSelector),
				containerCenter, contentCenter;
			//if a center element was found
			if ($centerElement.length > 0) {
				//get the first element in the center element object (should only be one)
				$centerElement = $centerElement.eq(0);
				//calculate center of container (view box) relative to itself
				containerCenter = toCoords(
					getSize(container).width/2,
					getSize(container).height/2
				),
				//calculate center of center element relative to the container
				contentCenter = toCoords(
					($centerElement.offset().left - container.offset().left + ($centerElement.width()/2)),
					($centerElement.offset().top - container.offset().top + ($centerElement.height()/2))
				);
				//refresh the offset before we update the offset
				refreshOffset();
				//calculate the difference between the two centers and use it to update the content's offset
				updatePosition(
					containerCenter.x - contentCenter.x,
					containerCenter.y - contentCenter.y,
					true
				);
			}
		});
		
	   //return this to maintain jquery chainability
       return this;
    }
	
	$.fn.panCircle = function (arg1) {
		//create options
		var options = (typeof arg1 == 'object' && arg1 !== null) ? arg1 : {},
			$circle = this,
			move = toCoords(0, 0),
			settings = $.extend(true, {
				$panContainer: this.parent(),
				center: {
					enabled: true,
					$button: $('#circle-center')
				},
				$eventStarter: $('<div style="visibility: none" id="circle-event-starter"></div>').appendTo($circle.parent())
			}, options),
			active = false,
			determineMove = function(e) {
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
				return {
					x: ((diff.x > diff.y) ? diff.y/diff.x : 1) * s.x,
					y: ((diff.y > diff.x) ? diff.x/diff.y : 1) * s.y
				};
			};
		$(document).on('mousemove', function (e) {
			if (active) {
				e.preventDefault();
				move = determineMove(e);
				settings.$panContainer.trigger('buttonchange', [move.x, move.y]);
			}
		}).on('mouseup', function(e) {
			//console.log ('mouseup');
			if (active) {
				active = false;
			}
			settings.$panContainer.trigger('buttonup');
		});
		
		this.circleMouseEvents({
			events: 'mousedown'
		}).on('circle-mousedown', function (e, eOrig) {
			e.preventDefault();
			//trigger the standard event on a safe element so that it still bubbles up
			settings.$eventStarter.trigger('mousedown'); 
			//if the target was not the center button or if center is disabled
			if (!settings.center.enabled || e.target != settings.center.$button.get(0)) {
				active = true;
				move = determineMove(eOrig);
				settings.$panContainer.trigger('buttondown', [move.x, move.y]);
			}
			else {
				//then center is enabled and the target was the button, so center the content
				settings.$panContainer.trigger('center');
			}
		});
		
		
		return this;
	}
	
	//correctly interpret mouse events for circles
	$.fn.circleMouseEvents = function (arg1) {
		//create options
		var options = (typeof arg1 == 'object' && arg1 !== null) ? arg1 : {},
			$circle = this,
			settings = $.extend(true, {
				$behindElement: this.parent(),
				borderWidth: 1,
				events: 'mouseover mouseenter mouseout mouseleave mousedown mouseup mousemove',
				eventPrefix: 'circle-'
			}, options),
			mouseHover = false,
			determineMouseEnterLeave = function (e) {
				//if the mouse just came off of the circle
				if (mouseHover) {
					//console.log ('trigger off');
					//if the events list contains mouseout, trigger it
					(/(mouseout)/.test(settings.events)) ? $circle.trigger(settings.eventPrefix + 'mouseout', [e]) : null;
					//if the events list contains mouseleave, trigger it
					(/(mouseleave)/.test(settings.events)) ? $circle.trigger(settings.eventPrefix + 'mouseleave', [e]) : null;
				}
				return false;
			},
			determineValidity = function (e) {
				//get radius of circle and distance from cursor to center of cirlce
				var height = $circle.height(),
					width = $circle.width(),
					offset = $circle.offset(),
					radius = height/2 + settings.borderWidth + 5,
					distance = Math.sqrt(
						Math.pow((e.pageX - (offset.left + (width/2))), 2) + 
						Math.pow((e.pageY - (offset.top + (height/2))), 2)
					);
				//console.log(height, radius + ', ' + distance); 
				//if the distance between the cursor and the center is greater 
				//than the length of the radius, then the cursor is not in the center
				//else we are in the circle
				return (distance > radius) ? false : true;
			};
		this.on(settings.events, function (e, eOrig) {
			var eObj;
			//console.log (e);
			e.stopPropagation();
			e.preventDefault();
			//if this is a mouseenter or mouseover event
			if (e.type == 'mouseenter' || e.type == 'mouseover') {
				//console.log (e);
				//then start tracking the mouse position
				$circle.on('mousemove.track', {eObj: e, eType: e.type}, function (eTrack) {
					//console.log (eTrack.data.eObj);
					//if the mouse in a valid location
					if (determineValidity(eTrack)) {
						//console.log (eTrack.data.eType);
						//if mouse was not previously on the circle
						if (!mouseHover) {
							//console.log ('trigger on: ' + settings.eventPrefix + eTrack.data.eType);
							//if the events list contains mouseout, trigger it
							(/(mouseover)/.test(settings.events)) ? 
								$circle.trigger(settings.eventPrefix + 'mouseover', [eTrack.data.eType]) : null;
							//if the events list contains mouseleave, trigger it
							(/(mouseenter)/.test(settings.events)) ? 
								$circle.trigger(settings.eventPrefix + 'mouseenter', [eTrack.data.eType]) : null;
							//set mouseHover to true
							mouseHover = true;
						}
					}
					else {
						//console.log ('off');
						//check to see if mouseHover is true then set it to false
						mouseHover = determineMouseEnterLeave(eTrack.data.eType);
					}
				});
			}
			//else if this is a mouseout or mouseleave event
			else if (e.type == 'mouseleave' || e.type == 'mouseout') {
				//unbind the mousemove tracker from the circle
				$circle.off('mousemove.track');
				//check to see if mouseHover is true then set it to false
				mouseHover = determineMouseEnterLeave(e);
			}
			else {
				//determine which event object to pass
				eObj = (typeof eOrig == 'object' && eOrig != null) ? eOrig : e;
				//if this is a valid event, trigger a custom event on the circle
				if (determineValidity(e)) {
					//console.log ('trigger custom');
					$circle.trigger(settings.eventPrefix + e.type, [eObj]);
				}
				//else trigger a standard event on the element behind the circle
				else {
					//console.log ('trigger parent');
					settings.$behindElement.trigger(e.type, [eObj]);
				}
			}
		});
			
		return this;
	}

})( jQuery );