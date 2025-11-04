/**
 * Point Selector
 */
import {
    createDefaultPolygonPath,
    findVertexInsertionIndex,
    getDataAtrributeConfigs,
    isValidLatitude,
    isValidLongitude,
    isValidPolygonPath,
    isValidRadius,
    polygonWktToArray,
    pathToWkt
} from './utilities';

let config = {
    iconPrefix: 'fa',
    iconClass: 'map-selector-icon',
    mapSelector: '.map-selector-map',
    latInput: 'input.map-selector-lat',
    lngInput: 'input.map-selector-lng',
    searchInput: '.map-selector-search',
    lat: null,
    lng: null,
    radius: null,
    polygon: null,
    clearBtn: '.map-selector-clear-btn',
    zoom: 14,
    disabled: false,
    animate: true,
    pinAnimationClass: 'map-selector-marker-drop',
    enableMarker: true,
    pinImage: null,
    pinIcon: null,
    pinScale: 1.5,
    pinClass: 'map-selector-marker',
    pinBackground: null,
    pinBorderColor: null,
    pinGlyphColor: null,
    enableRadius: false,
    radiusInput: 'input.map-selector-radius',
    radiusUnit: 'm', // m or km
    radiusPrecision: 0,
    circleStrokeColor: '#FF9800',
    circleStrokeOpacity: 0.8,
    circleStrokeWeight: 3,
    circleFillColor: '#FF9800',
    circleFillOpacity: 0.2,
    enablePolygon: false,
    polygonRadius: 10, // in meters
    polygonInput: '.map-selector-polygon',
    polygonStrokeColor: '#FF5722',
    polygonStrokeOpacity: 0.8,
    polygonStrokeWeight: 3,
    polygonFillColor: '#FF5722',
    polygonFillOpacity: 0.2,
    mapId: 'DEMO_MAP_ID'
};

/**
 * Setup polygon functions
 */
function setupPolygonFunctions() {
    /**
     * https://github.com/bramus/google-maps-polygon-moveto
     * Polygon getBounds extension - google-maps-extensions
     * @see http://code.google.com/p/google-maps-extensions/source/browse/google.maps.Polygon.getBounds.js
     */
    if (!google.maps.Polygon.prototype.getBounds) {
        google.maps.Polygon.prototype.getBounds = function(latLng) {
            var bounds = new google.maps.LatLngBounds();
            var paths = this.getPaths();
            var path;

            for (var p = 0; p < paths.getLength(); p++) {
                path = paths.getAt(p);
                for (var i = 0; i < path.getLength(); i++) {
                    bounds.extend(path.getAt(i));
                }
            }

            return bounds;
        };
    }

    /**
     * google.maps.Polygon.moveTo() — Move a Polygon on Google Maps V3 to a new LatLng()
     * Built by Bramus! - http://www.bram.us/
     *
     * @requires  google.maps.Polygon.getBounds
     * @requires  google.maps.geometry
     */
    if (!google.maps.Polygon.prototype.moveTo) {
        google.maps.Polygon.prototype.moveTo = function(latLng) {

            // our vars
            var path;
            var boundsCenter = this.getBounds().getCenter(), // center of the polygonbounds
                paths = this.getPaths(), // paths that make up the polygon
                newPoints =[], // array on which we'll store our new points
                newPaths = []; // array containing the new paths that make up the polygon

            // geodesic enabled: we need to recalculate every point relatively
            if (this.geodesic) {

                // loop all the points of the original path and calculate the bearing + distance of that point relative to the center of the shape
                for (var p = 0; p < paths.getLength(); p++) {
                    path = paths.getAt(p);
                    newPoints.push([]);

                    for (var i = 0; i < path.getLength(); i++) {
                        newPoints[newPoints.length-1].push({
                            heading: google.maps.geometry.spherical.computeHeading(boundsCenter, path.getAt(i)),
                            distance: google.maps.geometry.spherical.computeDistanceBetween(boundsCenter, path.getAt(i))
                        });
                    }
                }

                // now that we have the "relative" points, rebuild the shapes on the new location around the new center
                for (var j = 0, jl = newPoints.length; j < jl; j++) {
                    var shapeCoords = [],
                        relativePoint = newPoints[j];
                    for (var k = 0, kl = relativePoint.length; k < kl; k++) {
                        shapeCoords.push(google.maps.geometry.spherical.computeOffset(
                            latLng,
                            relativePoint[k].distance,
                            relativePoint[k].heading
                        ));
                    }
                    newPaths.push(shapeCoords);
                }

            }

            // geodesic not enabled: adjust the coordinates pixelwise
            else {

                var latlngToPoint = function(map, latlng){
                    var normalizedPoint = map.getProjection().fromLatLngToPoint(latlng); // returns x,y normalized to 0~255
                    var scale = Math.pow(2, map.getZoom());
                    var pixelCoordinate = new google.maps.Point(normalizedPoint.x * scale, normalizedPoint.y * scale);
                    return pixelCoordinate;
                };
                var pointToLatlng = function(map, point){
                    var scale = Math.pow(2, map.getZoom());
                    var normalizedPoint = new google.maps.Point(point.x / scale, point.y / scale);
                    var latlng = map.getProjection().fromPointToLatLng(normalizedPoint);
                    return latlng;
                };

                // calc the pixel position of the bounds and the new latLng
                var boundsCenterPx = latlngToPoint(this.map, boundsCenter),
                    latLngPx = latlngToPoint(this.map, latLng);

                // calc the pixel difference between the bounds and the new latLng
                var dLatPx = (boundsCenterPx.y - latLngPx.y) * (-1),
                    dLngPx = (boundsCenterPx.x - latLngPx.x) * (-1);

                // adjust all paths
                for (var p = 0; p < paths.getLength(); p++) {
                    path = paths.getAt(p);
                    newPaths.push([]);
                    for (var i = 0; i < path.getLength(); i++) {
                        var pixels = latlngToPoint(this.map, path.getAt(i));
                        pixels.x += dLngPx;
                        pixels.y += dLatPx;
                        newPaths[newPaths.length-1].push(pointToLatlng(this.map, pixels));
                    }
                }

            }

            // Update the path of the Polygon to the new path
            this.setPaths(newPaths);

            // Return the polygon itself so we can chain
            return this;

        };
    }
}

/**
 * Bind Map Selector
 * @param {HTMLElement} elem
 * @param {{}} mapConfig
 */
function mapInput(elem, mapConfig = {}) {

    // get the config from the html
    let dataAttrConfig = getDataAtrributeConfigs(elem, config);

    if (dataAttrConfig.mapSelector === 'true') {
        delete dataAttrConfig.mapSelector;
    }

    // merge all the configs
    mapConfig = {...config, ...mapConfig, ...dataAttrConfig};

    let map;
    let marker;
    let circle;
    let polygon;
    let geocoder;
    let shouldUpdateCoordinateInput = true;
    let shouldUpdateRadiusInput = true;
    let shouldUpdatePolygonInput = true;
    let clearBtn = elem.querySelector(mapConfig.clearBtn);
    let latInput = elem.querySelector(mapConfig.latInput);
    let lngInput = elem.querySelector(mapConfig.lngInput);
    let radiusInput = elem.querySelector(mapConfig.radiusInput);
    let polygonInput = elem.querySelector(mapConfig.polygonInput);
    let searchInput = elem.querySelector(mapConfig.searchInput);

    loadInitialValues();

    if (mapConfig.disabled) {
        disableInputs(true);
    }

    const intersectionObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (entry.isIntersecting) {
                entry.target.classList.add('map-selector-marker-drop');
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
            mapId: mapConfig.mapId,
            zoom: mapConfig.zoom,
            center: mapCenter,
            gestureHandling: mapConfig.disabled ? 'none' : 'auto',
            clickableIcons: false,
            disableDefaultUI: true,
            fullscreenControl: true,
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
        if (mapConfig.enableMarker) {
            const {AdvancedMarkerElement, PinElement} = await google.maps.importLibrary('marker');
            marker = createMarker(mapCenter, AdvancedMarkerElement, PinElement);
        }

        // setup search box
        if (searchInput) {
            setupSearchBox(SearchBox);
        }

        if (mapConfig.enableRadius) {
            circle = createCircle(mapCenter);
        }

        if (mapConfig.enablePolygon) {
            polygon = createPolygon(mapCenter);
        }

        if (! mapConfig.disabled) {
            addInputEventListeners();
        }
    }

    /**
     * Load initial values
     */
    function loadInitialValues() {
        // determine the values

        if (latInput && isValidLatitude(latInput.value)) {
            mapConfig.lat = Number(latInput.value);
        } else if (mapConfig.lat === null) {
            mapConfig.lat = 0;
        }

        if (lngInput && isValidLongitude(lngInput.value)) {
            mapConfig.lng = Number(lngInput.value);
        } else if (mapConfig.lng === null) {
            mapConfig.lng = 0;
        }

        if (radiusInput && isValidRadius(radiusInput.value)) {
            mapConfig.radius = Number(radiusInput.value);
        } else if (mapConfig.radius === null) {
            mapConfig.radius = 1;
        }

        let inputPath = polygonInput ? polygonWktToArray(polygonInput.value) : [];

        if (polygonInput && isValidPolygonPath(inputPath)) {
            mapConfig.polygon = inputPath;
        } else if (mapConfig.polygon === null) {
            mapConfig.polygon = createDefaultPolygonPath(mapConfig.lat, mapConfig.lng, mapConfig.polygonRadius);
        } else if (typeof mapConfig.polygon === 'string') {
            let configPolygonPath = polygonWktToArray(mapConfig.polygon);

            mapConfig.polygon = isValidPolygonPath(configPolygonPath) ? configPolygonPath : [];
        }
    }

    /**
     * Disable inputs
     */
    function disableInputs(disable) {
        if (latInput) {
            latInput.disabled = disable;
        }

        if (lngInput) {
            lngInput.disabled = disable;
        }

        if (polygonInput) {
            polygonInput.disabled = disable;
        }

        if (radiusInput) {
            radiusInput.disabled = disable;
        }

        if (searchInput) {
            searchInput.disabled = disable;
            searchInput.style.display = disable ? 'none' : 'block';
        }
    }

    /**
     * Create polygon
     *
     * @param coordinates
     */
    function createPolygon(coordinates) {
        setupPolygonFunctions();
        polygon = new google.maps.Polygon({
            paths: mapConfig.polygon,
            center: coordinates,
            map: map,
            strokeColor: mapConfig.polygonStrokeColor,
            strokeOpacity: mapConfig.polygonStrokeOpacity,
            strokeWeight: mapConfig.polygonStrokeWeight,
            fillColor: mapConfig.polygonFillColor,
            fillOpacity: mapConfig.polygonFillOpacity,
            draggable: ! mapConfig.disabled,
            editable: ! mapConfig.disabled
        });

        let bounds = polygon.getBounds();

        if (circle) {
            bounds = bounds.union(circle.getBounds());
        }

        map.fitBounds(bounds);

        if (! mapConfig.disabled) {
            // delete vertex on double click
            google.maps.event.addListener(polygon, 'dblclick', function (evt) {
                if (evt.vertex !== undefined) {
                    let path = polygon.getPath();

                    // remove the vertex from the path
                    // only if it is not going to result in a line
                    if (path.getLength() > 3) {
                        path.removeAt(evt.vertex);
                        polygon.setPath(path);
                    }
                }
            });

            // add vertex on map clicked
            google.maps.event.addListener(map, 'click', function (evt) {
                let path = polygon.getPath();

                // find the closest vertex
                let closestVertex = findVertexInsertionIndex(evt.latLng, path);
                path.insertAt(closestVertex, evt.latLng);

                polygon.setPath(path);
            });

            google.maps.event.addListener(polygon, 'dragend', function (evt) {
                let bounds = polygon.getBounds();
                let center = bounds.getCenter();

                updateMarkerPosition(center);
                updateCirclePosition(center);
                updatePolygonInputs(polygon.getPath());
                updateCoordinateInputs(center);
                updateSearchInput(center);
            });

            addPolygonPathListeners();
        }

        /*

        google.maps.event.addListener(circle, 'radius_changed', function (evt) {
            updateRadiusInputs(circle.radius);
        });*/

        return polygon;
    }

    /**
     * Add polygon path event listeners
     */
    function addPolygonPathListeners() {
        let polygonPath = polygon.getPath();

        google.maps.event.addListener(polygonPath, 'insert_at', function (evt) {
            updatePolygonInputs(polygon.getPath());
        });

        google.maps.event.addListener(polygonPath, 'remove_at', function (evt) {
            updatePolygonInputs(polygon.getPath());
        });

        google.maps.event.addListener(polygonPath, 'set_at', function (evt) {
            updatePolygonInputs(polygon.getPath());
        });
    }

    /**
     * Create circle
     *
     * @param coordinates
     */
    function createCircle(coordinates) {
        circle = new google.maps.Circle({
            center: coordinates,
            radius: normalizeCircleRadius(mapConfig.radius),
            map: map,
            strokeColor: mapConfig.circleStrokeColor,
            strokeOpacity: mapConfig.circleStrokeOpacity,
            strokeWeight: mapConfig.circleStrokeWeight,
            fillColor: mapConfig.circleFillColor,
            fillOpacity: mapConfig.circleFillOpacity,
            draggable: ! mapConfig.disabled,
            editable: ! mapConfig.disabled
        });

        let bounds = circle.getBounds();

        if (polygon) {
            bounds = bounds.union(polygon.getBounds());
        }

        map.fitBounds(bounds);

        google.maps.event.addListener(circle, 'center_changed', function (evt) {
            updateMarkerPosition(circle.center);
            updatePolygonPosition(circle.center);
            updateCoordinateInputs(circle.center);
            updateSearchInput(circle.center);
        });

        google.maps.event.addListener(circle, 'radius_changed', function (evt) {
            updateRadiusInputs(circle.radius);
        });

        return circle;
    }

    /**
     * Normalize the circle radius
     */
    function normalizeCircleRadius(radius) {
        if (mapConfig.radiusUnit.toLowerCase() === 'km') {
            return radius * 1000;
        }

        return radius;
    }

    /**
     * Normalize the input radius
     */
    function normalizeInputRadius(radius) {
        if (mapConfig.radiusUnit.toLowerCase() === 'km') {
            radius = radius / 1000.0;
        }

        return radius.toFixed(mapConfig.radiusPrecision);
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

            if (mapConfig.pinIcon) {
                const icon = document.createElement('div');
                icon.innerHTML = `<i class="${mapConfig.iconClass} ${mapConfig.iconPrefix} ${mapConfig.iconPrefix}-${mapConfig.pinIcon}"></i>`;

                pin.glyph = icon;
            }

            pinElem = pin.element;
        }

        // NOTE: Wrapping gmp-pin with a div. The new update does not allow addEventListener on gmp-pin
        const pinWrapper = document.createElement('div');
        pinWrapper.classList.add('custom-pin-wrapper');
        pinWrapper.appendChild(pinElem);
        
        marker = new AdvancedMarkerElement({
            map: map,
            content: pinWrapper,
            position: coordinates,
            gmpDraggable: !mapConfig.disabled,
        });

        const content = pinWrapper;
        content.classList.add(mapConfig.pinClass);

        if (mapConfig.animate) {
            // https://developers.google.com/maps/rootation/javascript/examples/advanced-markers-animation#maps_advanced_markers_animation-javascript
            content.style.opacity = '0';
            content.addEventListener('animationend', (event) => {
                content.classList.remove('map-selector-marker-drop');
                content.style.opacity = '1';
            });

            content.style.setProperty('--delay-time', '0.1s');
            intersectionObserver.observe(content);
        }

        google.maps.event.addListener(marker, 'dragend', function (evt) {
            updateCoordinateInputs(evt.latLng);
            updateCirclePosition(evt.latLng);
            updatePolygonPosition(evt.latLng);
            updateSearchInput(evt.latLng);
        });

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
                updateMarkerPosition(place.geometry.location);
                updatePolygonPosition(place.geometry.location);
                updateCirclePosition(place.geometry.location);

                bounds.extend(place.geometry.location);

                if (polygon) {
                    bounds = bounds.union(polygon.getBounds());
                }

                if (circle) {
                    bounds = bounds.union(circle.getBounds());
                }

                map.fitBounds(bounds);

                if (! (polygon || circle)) {
                    map.setZoom(16);
                }

                // update coordinates
                updateCoordinateInputs(place.geometry.location);
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
            latInput.addEventListener('input', updateMapFromCoordinateInputs);
        }

        if (lngInput) {
            lngInput.addEventListener('input', updateMapFromCoordinateInputs);
        }

        if (radiusInput && mapConfig.enableRadius) {
            radiusInput.addEventListener('input', updateMapFromRadiusInputs);
        }

        if (polygonInput && mapConfig.enablePolygon) {
            polygonInput.addEventListener('input', updateMapFromPolygonInputs);
        }
    }

    /**
     * Update the circle radius
     */
    function updateCircleRadius(radius) {
        if (circle) {
            circle.setRadius(normalizeCircleRadius(radius));
        }
    }

    /**
     * Update the circle position
     */
    function updateCirclePosition(coordinates) {
        if (circle) {
            circle.setCenter(coordinates);
        }
    }

    /**
     * Update the polygon position
     */
    function updatePolygonPosition(coordinates) {
        if (polygon) {
            polygon.moveTo(coordinates);
            updatePolygonInputs(polygon.getPath());
            addPolygonPathListeners();
        }
    }

    /**
     * Update the polygon path
     */
    function updatePolygonPath(path) {
        if (polygon) {
            polygon.setPath(path);
            addPolygonPathListeners();
        }
    }

    /**
     * Update the marker position
     */
    function updateMarkerPosition(coordinates, pan) {
        if (marker) {
            marker.position = coordinates;

            if (pan) {
                map.panTo(coordinates);
            }
        }
    }

    /**
     * Update map from inputs
     */
    function updateMapFromCoordinateInputs() {
        let lat = null;
        let lng = null;

        if (latInput) {
            lat = latInput.value;
        }

        if (lngInput) {
            lng = lngInput.value;
        }

        if (isValidCoordinate(lat, lng)) {
            let coordinates = new google.maps.LatLng(lat, lng);

            shouldUpdateCoordinateInput = false;
            updateMarkerPosition(coordinates, true);
            updatePolygonPosition(coordinates);
            updateCirclePosition(coordinates);
            updateSearchInput(coordinates);
            shouldUpdateCoordinateInput = true;
        }
    }

    /**
     * Update map from inputs
     */
    function updateMapFromRadiusInputs() {
        if (radiusInput && mapConfig.enableRadius) {
            let radius = radiusInput.value;

            if (isValidRadius(radius)) {
                shouldUpdateRadiusInput = false;
                updateCircleRadius(Number(radius));
                shouldUpdateRadiusInput = true;
            }
        }
    }

    /**
     * Update map from inputs
     */
    function updateMapFromPolygonInputs() {
        if (polygonInput && mapConfig.enablePolygon) {
            let inputPath = polygonWktToArray(polygonInput.value);

            if (isValidPolygonPath(inputPath)) {
                shouldUpdatePolygonInput = false;
                updatePolygonPath(inputPath);
                shouldUpdatePolygonInput = true;
            }
        }
    }

    /**
     * Update the address
     * @param coordinates
     */
    function updateSearchInput(coordinates) {
        if (searchInput) {
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
    }

    /**
     * Update the coordinates
     * @param {google.maps.LatLng} coordinates
     */
    function updateCoordinateInputs(coordinates) {
        if (shouldUpdateCoordinateInput) {
            if (latInput) {
                latInput.value = coordinates.lat().toFixed(6);
            }

            if (lngInput) {
                lngInput.value = coordinates.lng().toFixed(6);
            }
        }
    }

    /**
     * Update the radius
     * @param {Number} radius
     */
    function updateRadiusInputs(radius) {
        if (radiusInput && shouldUpdateRadiusInput) {
            radiusInput.value = normalizeInputRadius(radius);
        }
    }

    /**
     * Update the polygon inputs
     * @param {Array<LatLng>} path
     */
    function updatePolygonInputs(path) {
        if (polygonInput && shouldUpdatePolygonInput) {
            polygonInput.value = pathToWkt(path);
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

        if (radiusInput) {
            radiusInput.value = '';
        }

        if (polygonInput) {
            polygonInput.value = '';
        }
    }

    /**
     * Clear map
     */
    if (clearBtn && (! mapConfig.disabled)) {
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
        mapInput(elem);
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
    mapInput,
    bind,
    init,
    config
};