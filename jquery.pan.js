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
			//take a movement ratio and multiply by our speed to get a vector
			setVector = function (moveRatio) {
				continuous.moveX = settings.continuous.interval * moveRatio.x,
				continuous.moveY = settings.continuous.interval * moveRatio.y;
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
						setVector(toCoords(-1, 0));
					}
					else if (evt.which == 38 || evt.which == 87) {
						setVector(toCoords(0, -1));
					}
					else if (evt.which == 39 || evt.which == 68) {
						setVector(toCoords(1, 0));
					}
					else if (evt.which == 40 || evt.which == 83) {
						setVector(toCoords(0, 1));
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
			setVector(toCoords(moveX, moveY));
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
		
		this.on('mousedown', function (e) {
			e.preventDefault();
			//trigger the standard event on a safe element so that it still bubbles up
			settings.$eventStarter.trigger('mousedown'); 
			//if the target was not the center button or if center is disabled
			if (!settings.center.enabled || e.target != settings.center.$button.get(0)) {
				active = true;
				move = determineMove(e);
				settings.$panContainer.trigger('buttondown', [move.x, move.y]);
			}
			else {
				//then center is enabled and the target was the button, so center the content
				settings.$panContainer.trigger('center');
			}
		});
		
		
		return this;
	}
	
	

})( jQuery );