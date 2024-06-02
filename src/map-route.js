/**
 * Map Route
 */
import {getDataAtrributeConfigs} from './utilities.js';


let config = {
    mapRoute: '.map-selector-route-map',
    lat: null,
    lng: null,
    zoom: 14,
    mapId: 'DEMO_MAP_ID'
};

/**
 * Route map class
 */
class RouteMap {
    config = {};

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
    async initialize() {
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

    window.addEventListener('load', () => routeMap.initialize());
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
    config
};