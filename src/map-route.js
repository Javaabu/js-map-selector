/**
 * Map Route
 */
import {absModulo, caculateRotationDirection, getDataAtrributeConfigs} from './utilities.js';


let config = {
    mapRoute: '.map-selector-route-map',
    lat: null,
    lng: null,
    zoom: 14,
    mapId: 'DEMO_MAP_ID'
};

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

        return this;
    }

    /**
     * Rotate the marker the given heading
     */
    rotate(heading) {
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