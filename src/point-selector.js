/**
 * Point Selector
 */

let config = {
    mapSelector: '.map-selector-map',
    latInput: 'input[name="lat"]',
    lngInput: 'input[name="lng"]',
    searchInput: '.map-selector-search',
    lat: null,
    lng: null,
    clearBtn: '.map-selector-clear-btn',
    zoom: 14,
    disabled: false,
    animate: true,
    pinImage: null,
    pinScale: 1.5,
    pinClass: 'map-selector-marker',
    pinBackground: null,
    pinBorderColor: null,
    pinGlyphColor: null,
};

/**
 * checks if a given coordinate is in the correct format
 */
function isValidCoordinate(lat, lon) {
    let ck_lat = /^(-?[1-8]?\d(?:\.\d{1,18})?|90(?:\.0{1,18})?)$/;
    let ck_lon = /^(-?(?:1[0-7]|[1-9])?\d(?:\.\d{1,18})?|180(?:\.0{1,18})?)$/;
    let validLat = ck_lat.test(lat);
    let validLon = ck_lon.test(lon);

    return validLat && validLon;
}

/**
 * Gets data attributes from an HTML Element
 * and returns only allowed values
 *
 * @param {HTMLElement} elem
 * @param {{}} allowedKeys
 * @returns {{}}
 */
function getDataAtrributeConfigs(elem, allowedKeys) {
    let data = {};

    [].forEach.call(elem.attributes, function (attr) {
        if (/^data-/.test(attr.name)) {
            let camelCaseName = attr.name.substring(5).replace(/-(.)/g, function ($0, $1) {
                return $1.toUpperCase();
            });

            if (allowedKeys.hasOwnProperty(camelCaseName)) {
                let val = attr.value;
                let varType = typeof allowedKeys[camelCaseName];

                // convert string to boolean
                if (varType === 'boolean') {
                    val = val === 'true';
                } else if (varType === 'number') {
                    val = Number(val);
                }

                data[camelCaseName] = val;
            }
        }
    });

    return data;
}

/**
 * Bind Map Selector
 * @param {HTMLElement} elem
 * @param {{}} mapConfig
 */
function mapSelector(elem, mapConfig = {}) {

    // get the config from the html
    let dataAttrConfig = getDataAtrributeConfigs(elem, config);

    if (dataAttrConfig.mapSelector === 'true') {
        delete dataAttrConfig.mapSelector;
    }

    // merge all the configs
    mapConfig = {...config, ...mapConfig, ...dataAttrConfig};

    let map;
    let marker;
    let geocoder;
    let clearBtn = elem.querySelector(mapConfig.clearBtn);
    let latInput = elem.querySelector(mapConfig.latInput);
    let lngInput = elem.querySelector(mapConfig.lngInput);
    let searchInput = elem.querySelector(mapConfig.searchInput);

    // determine the coordinates
    if (mapConfig.lat === null && latInput) {
        mapConfig.lat = latInput.value;
    }

    if (mapConfig.lng === null && lngInput) {
        mapConfig.lng = lngInput.value;
    }

    const intersectionObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (entry.isIntersecting) {
                entry.target.classList.add('drop');
                intersectionObserver.unobserve(entry.target);
            }
        }
    });

    /**
     * Initialize the map
     *
     * @returns {Promise<void>}
     */
    async function initialize() {
        const {Geocoder} = await google.maps.importLibrary('geocoding');
        const {Map} = await google.maps.importLibrary('maps');
        const {SearchBox} = await google.maps.importLibrary('places');

        geocoder = new Geocoder();
        let mapCenter = new google.maps.LatLng(mapConfig.lat, mapConfig.lng);
        let mapOptions = {
            mapId: 'DEMO_MAP_ID',
            zoom: mapConfig.zoom,
            center: mapCenter,
            gestureHandling: mapConfig.disabled ? 'none' : 'auto',
            clickableIcons: false,
            disableDefaultUI: true,
            streetViewControl: false,
            zoomControl: ! mapConfig.disabled,
            zoomControlOptions: {
                style: google.maps.ZoomControlStyle.SMALL,
                position: google.maps.ControlPosition.RIGHT_BOTTOM
            }
        };

        // create map
        map = new Map(elem.querySelector(mapConfig.mapSelector), mapOptions);

        // create marker
        const {AdvancedMarkerElement, PinElement} = await google.maps.importLibrary('marker');
        marker = createMarker(mapCenter, AdvancedMarkerElement, PinElement);

        // setup search box
        if (searchInput) {
            setupSearchBox(SearchBox);
        }

        google.maps.event.addListener(marker, 'dragend', function (evt) {
            if (latInput || lngInput) {
                updateInputs(evt.latLng);
            }

            if (searchInput) {
                updateSearchInput(evt.latLng);
            }
        });

        if (! mapConfig.disabled) {
            addInputEventListeners();
        }
    }

    /**
     * Create a custom marker at the given coordinates
     *
     * @param coordinates
     * @param AdvancedMarkerElement
     * @param PinElement
     */
    function createMarker(coordinates, AdvancedMarkerElement, PinElement) {
        let pinElem = null;

        if (mapConfig.pinImage) {
            pinElem = document.createElement('img');
            pinElem.src = mapConfig.pinImage;
        } else {
            const pin = new PinElement({
                scale: mapConfig.pinScale,
                background: mapConfig.pinBackground,
                borderColor: mapConfig.pinBorderColor,
                glyphColor: mapConfig.pinGlyphColor
            });

            pinElem = pin.element;
        }


        marker = new AdvancedMarkerElement({
            map: map,
            content: pinElem,
            position: coordinates,
            gmpDraggable: !mapConfig.disabled,
        });

        const content = marker.content;
        content.classList.add(mapConfig.pinClass);

        if (mapConfig.animate) {
            // https://developers.google.com/maps/rootation/javascript/examples/advanced-markers-animation#maps_advanced_markers_animation-javascript
            content.style.opacity = '0';
            content.addEventListener('animationend', (event) => {
                content.classList.remove('drop');
                content.style.opacity = '1';
            });

            content.style.setProperty('--delay-time', '0.1s');
            intersectionObserver.observe(content);
        }

        return marker;
    }

    /**
     * Setup serach box
     */
    function setupSearchBox(SearchBox) {
        // Create the search box and link it to the UI element.
        map.controls[google.maps.ControlPosition.TOP_LEFT].push(searchInput);

        if (! mapConfig.disabled) {
            let searchBox = new SearchBox(searchInput);

            // Listen for the event fired when the user selects an item from the
            // pick list. Retrieve the matching places for that item.
            searchBox.addListener('places_changed', function () {
                let place = searchBox.getPlaces();

                if (place === undefined || place.length < 1) {
                    return;
                }

                place = place[0];

                // Get place name, and location.
                let bounds = new google.maps.LatLngBounds();

                // Move marker to place.
                marker.position = place.geometry.location;
                bounds.extend(place.geometry.location);
                map.fitBounds(bounds);
                map.setZoom(16);

                // update coordinates
                updateInputs(place.geometry.location);
            });

            // Bias the SearchBox results towards places that are within the bounds of the
            // current map's viewport.
            google.maps.event.addListener(map, 'bounds_changed', function () {
                var bounds = map.getBounds();
                searchBox.setBounds(bounds);
            });
        }
    }

    /**
     * Add input event listeners
     */
    function addInputEventListeners() {
        if (latInput) {
            latInput.addEventListener('input', updateMapFromInputs);
        }

        if (lngInput) {
            lngInput.addEventListener('input', updateMapFromInputs);
        }
    }

    /**
     * Update map from inputs
     */
    function updateMapFromInputs() {
        let lat = marker.position.lat;
        let lng = marker.position.lng;

        if (latInput) {
            lat = latInput.value;
        }

        if (lngInput) {
            lng = lngInput.value;
        }

        if (isValidCoordinate(lat, lng)) {
            marker.position = new google.maps.LatLng(lat, lng);
            map.panTo(new google.maps.LatLng(lat, lng));

            if (searchInput) {
                updateSearchInput(new google.maps.LatLng(lat, lng));
            }
        }
    }

    /**
     * Update the address
     * @param coordinates
     */
    function updateSearchInput(coordinates) {
        geocoder.geocode({'latLng': coordinates}, function (results, status) {
            if (status === google.maps.GeocoderStatus.OK) {
                if (results[0]) {
                    searchInput.value = results[0].formatted_address;
                } else {
                    searchInput.value = '';
                }
            } else {
                searchInput.value = '';
            }
        });
    }

    /**
     * Update the coordinates
     * @param {google.maps.LatLng} coordinates
     */
    function updateInputs(coordinates) {
        if (latInput) {
            latInput.value = coordinates.lat().toFixed(6);
        }

        if (lngInput) {
            lngInput.value = coordinates.lng().toFixed(6);
        }
    }

    /**
     * Clear the coordinates
     * @param {Event} e
     */
    function clearInputs(e) {
        e.preventDefault();

        if (latInput) {
            latInput.value = '';
        }

        if (lngInput) {
            lngInput.value = '';
        }
    }

    /**
     * Clear map
     */
    if (clearBtn) {
        clearBtn.addEventListener('click', clearInputs);
    }

    window.addEventListener('load', initialize);
}

/**
 * Bind Map Selector by data attribute
 * @param {HTMLElement} root
 */
function bind(root) {
    root.querySelectorAll('[data-map-selector]').forEach(function (elem) {
        mapSelector(elem);
    });
}

function init() {
    document.addEventListener('DOMContentLoaded', function (event) {
        // Your code to run since DOM is loaded and ready
        bind(document);
    });
}

export {
    mapSelector,
    bind,
    init,
    config
};