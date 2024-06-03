/**
 * Map Route
 */
import {absModulo, caculateRotationDirection, getDataAtrributeConfigs, headingToNewPoint} from './utilities';
import easing from './easing';


let config = {
    mapRoute: '.map-selector-route-map',
    lat: null,
    lng: null,
    zoom: 14,
    mapId: 'DEMO_MAP_ID'
};

/**
 * Setup marker functions
 */
function setupMarkerFunctions() {
    // Animated Marker Movement. Robert Gerlach 2012-2013 https://github.com/combatwombat/marker-animate
// MIT license
//
// params:
// newPosition        - the new Position as google.maps.LatLng()
// options            - optional options object (optional)
// options.duration   - animation duration in ms (default 1000)
// options.easing     - easing function from jQuery and/or the jQuery easing plugin (default 'linear')
// options.complete   - callback function. Gets called, after the animation has finished
// options.pan     - can be 'center', 'inbounds', or null. center keeps marker centered, in bounds keeps it in bounds (default null)
    google.maps.marker.AdvancedMarkerElement.prototype.animateTo = function(newPosition, options) {
        let defaultOptions = {
            duration: 1000,
            easing: 'linear',
            complete: null,
            pan: null
        }
        options = options || {};

        // complete missing options
        for (let key in defaultOptions) {
            options[key] = options[key] || defaultOptions[key];
        }

        // throw exception if easing function doesn't exist
        if (options.easing != 'linear') {
            if (! easing[options.easing]) {
                throw '"' + options.easing + '" easing function doesn\'t exist.';
                return;
            }
        }

        // make sure the pan option is valid
        if (options.pan !== null) {
            if (options.pan !== 'center' && options.pan !== 'inbounds') {
                return;
            }
        }

        window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
        window.cancelAnimationFrame = window.cancelAnimationFrame || window.mozCancelAnimationFrame;

        // save current position. prefixed to avoid name collisions. separate for lat/lng to avoid calling lat()/lng() in every frame
        this.AT_startPosition_lat = this.position.lat;
        this.AT_startPosition_lng = this.position.lng;
        var newPosition_lat = newPosition.lat();
        var newPosition_lng = newPosition.lng();
        var newPoint = new google.maps.LatLng(newPosition.lat(), newPosition.lng());

        if (options.pan === 'center') {
            this.map.setCenter(newPoint);
        }

        if (options.pan === 'inbounds') {
            if (!this.map.getBounds().contains(newPoint)) {
                var mapbounds = this.map.getBounds();
                mapbounds.extend(newPoint);
                this.map.fitBounds(mapbounds);
            }
        }

        // crossing the 180° meridian and going the long way around the earth?
        if (Math.abs(newPosition_lng - this.AT_startPosition_lng) > 180) {
            if (newPosition_lng > this.AT_startPosition_lng) {
                newPosition_lng -= 360;
            } else {
                newPosition_lng += 360;
            }
        }

        var animateStep = function(marker, startTime) {
            var ellapsedTime = (new Date()).getTime() - startTime;
            var durationRatio = ellapsedTime / options.duration; // 0 - 1
            var easingDurationRatio = durationRatio;

            // use jQuery easing if it's not linear
            if (options.easing !== 'linear') {
                easingDurationRatio = easing[options.easing](durationRatio, ellapsedTime, 0, 1, options.duration);
            }

            if (durationRatio < 1) {
                var deltaPosition = new google.maps.LatLng(marker.AT_startPosition_lat + (newPosition_lat - marker.AT_startPosition_lat) * easingDurationRatio,
                    marker.AT_startPosition_lng + (newPosition_lng - marker.AT_startPosition_lng) * easingDurationRatio);
                marker.position = deltaPosition;

                // use requestAnimationFrame if it exists on this browser. If not, use setTimeout with ~60 fps
                if (window.requestAnimationFrame) {
                    marker.AT_animationHandler = window.requestAnimationFrame(function() {
                        animateStep(marker, startTime)
                    });
                } else {
                    marker.AT_animationHandler = setTimeout(function() {
                        animateStep(marker, startTime)
                    }, 17);
                }

            } else {

                marker.position = newPosition;

                if (typeof options.complete === 'function') {
                    options.complete();
                }

            }
        }

        // stop possibly running animation
        if (window.cancelAnimationFrame) {
            window.cancelAnimationFrame(this.AT_animationHandler);
        } else {
            clearTimeout(this.AT_animationHandler);
        }

        animateStep(this, (new Date()).getTime());
    }
}

/**
 * Route marker
 */
class RouteMarker {
    static defaults = {
        size: '120px',
        degreesPerFrame: 6,
        frameRate: 60
    }

    constructor(config) {
        this.config = {...RouteMarker.defaults, ...config};
        this.position = config.position || {lat: 0, lng: 0};
        this.heading = config.heading || 0;

        return this.init();
    }

    async init() {
        const {AdvancedMarkerElement, PinElement} = await google.maps.importLibrary('marker');
        setupMarkerFunctions();

        this.elem = document.createElement('div');

        this.imgElem = document.createElement('img');
        this.imgElem.classList.add('map-selector-route-marker');
        this.imgElem.src = this.getHeadingImage(this.heading);
        this.imgElem.style.height = this.config.size;

        this.elem.appendChild(this.imgElem);

        this.marker = new AdvancedMarkerElement({
            map: this.config.map,
            content: this.elem,
            position: this.position,
            gmpDraggable: false,
        });

        // set anchor to center
        this.marker.content.style.transform = 'translateY(50%)';

        return this;
    }

    /**
     * Move the marker
     */
    moveTo(position) {
        // calculate heading
        let newHeading = headingToNewPoint(this.position.lat(), this.position.lng(), position.lat(), position.lng());
        let routeMarker = this;

        this.rotate(newHeading, function () {
            routeMarker.position = position;
            routeMarker.marker.animateTo(position, {easing: 'easeOutSine'});
        });
    }

    /**
     * Rotate the marker the given heading
     */
    rotate(heading, onRotationEnded) {
        this.rotationDirection = caculateRotationDirection(heading, this.rotationTimer ? this.animationHeading : this.heading);

        let frameInterval = 1000 / this.config.frameRate

        // if it's already animating, clear it
        if (this.rotationTimer) {
            clearInterval(this.rotationTimer);
        } else {
            this.animationHeading = this.getHeadingImageIndex(this.heading) * this.config.degreesPerFrame;
        }

        this.heading = heading;
        this.headingImageIndex = this.getHeadingImageIndex(heading);

        let routerMarker = this;

        this.rotationTimer = setInterval(function () {
            let imageIndex = routerMarker.getHeadingImageIndex(routerMarker.animationHeading);
            routerMarker.imgElem.src = routerMarker.getHeadingImageByIndex(imageIndex);

            // stop animating when desired heading is reached
            if (imageIndex === routerMarker.headingImageIndex) {
                clearInterval(routerMarker.rotationTimer);

                if (onRotationEnded) {
                    onRotationEnded();
                }
            }

            if (routerMarker.rotationDirection < 0) {
                // anti clockwise
                routerMarker.animationHeading -= routerMarker.config.degreesPerFrame;
            } else {
                routerMarker.animationHeading += routerMarker.config.degreesPerFrame;
            }
        }, frameInterval);

    }

    /**
     * Get the heading index
     */
    getHeadingImageIndex(heading) {
        return Math.floor(absModulo(heading, 360) / this.config.degreesPerFrame);
    }

    /**
     * Get the image index
     */
    getHeadingImageByIndex(index) {
        return this.config.imgPath + '/' + index + '.png';
    }

    /**
     * Get the image for the given heading
     */
    getHeadingImage(heading) {
        // convert the heading to index
        let index = this.getHeadingImageIndex(heading);

        return this.getHeadingImageByIndex(index);
    }

}

/**
 * Route map class
 */
class RouteMap {
    constructor(elem, options) {
        this.config = {...config, ...options};
        this.elem = elem;

        this.listeners = [];
    }

    /**
     * Initialize the map
     *
     * @returns {Promise<void>}
     */
    async init() {
        const {Map} = await google.maps.importLibrary('maps');

        let mapCenter = new google.maps.LatLng(this.config.lat, this.config.lng);
        let mapOptions = {
            mapId: this.config.mapId,
            zoom: this.config.zoom,
            center: mapCenter,
            clickableIcons: false,
            disableDefaultUI: true,
            fullscreenControl: true,
            streetViewControl: false,
            zoomControl: true,
            zoomControlOptions: {
                style: google.maps.ZoomControlStyle.SMALL,
                position: google.maps.ControlPosition.RIGHT_BOTTOM
            }
        };

        // create map
        this.map = new Map(this.elem, mapOptions);

        if (this.config.onInit) {
            this.config.onInit(this.map);
        }
    }

    /**
     * Add an event listener
     */
    addEventListener(event, listener) {
        if (this.map) {
            google.maps.event.addListener(this.map, event, listener);
        }
    }
}


/**
 * Bind Map Selector
 * @param {HTMLElement} elem
 * @param {{}} mapConfig
 */
function mapRoute(elem, mapConfig = {}) {

    // get the config from the html
    let dataAttrConfig = getDataAtrributeConfigs(elem, config);

    if (dataAttrConfig.mapRoute === 'true') {
        delete dataAttrConfig.mapRoute;
    }

    // merge all the configs
    mapConfig = {...config, ...mapConfig, ...dataAttrConfig};

    let routeMap = new RouteMap(elem.querySelector(mapConfig.mapRoute), mapConfig);

    window.addEventListener('load', () => routeMap.init());
}

/**
 * Bind Map Selector by data attribute
 * @param {HTMLElement} root
 */
function bind(root) {
    root.querySelectorAll('[data-map-route]').forEach(function (elem) {
        mapRoute(elem);
    });
}

function init() {
    if (document.readyState !== 'loading') {
        bind(document);
        return;
    }

    document.addEventListener('DOMContentLoaded', function (event) {
        // Your code to run since DOM is loaded and ready
        bind(document);
    });
}

export {
    mapRoute,
    bind,
    init,
    RouteMap,
    RouteMarker,
    config
};