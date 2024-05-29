/**
 * Point Selector
 */

// number of km per degree = ~111km (111.32 in google maps, but range varies
// between 110.567km at the equator and 111.699km at the poles)
//
// 111.32km = 111320.0m (".0" is used to make sure the result of division is
// double even if the "meters" variable can't be explicitly declared as double)
const EARTH_COEFFICIENT = 111320.0; // m
const EARTH_RADIUS = 6371; // km

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
};

/**
 * Convert degree to radius
 */
function degreeToRadians(degree) {
    return degree * (Math.PI / 180)
}

/**
 * Convert coordinates to cartesian
 * @param lat
 * @param lng
 * @returns {{x: number, y: number, z: number}}
 */
function toCartesian(lat, lng) {
    const phi = degreeToRadians(lat); // Latitude in radians
    const theta = degreeToRadians(lng); // Longitude in radians

    const x = EARTH_RADIUS * Math.cos(phi) * Math.cos(theta);
    const y = EARTH_RADIUS * Math.cos(phi) * Math.sin(theta);
    const z = EARTH_RADIUS * Math.sin(phi);

    return { x, y, z };
}

/**
 * Calculate vectors between points
 * @param A
 * @param B
 * @returns {{x: number, y: number, z: number}}
 */
function vector(A, B) {
    return {
        x: B.x - A.x,
        y: B.y - A.y,
        z: B.z - A.z
    };
}

/**
 * Dot product of vectors
 *
 * @param v1
 * @param v2
 * @returns {number}
 */
function dotProduct(v1, v2) {
    return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
}

/**
 * Magnitude of vectors
 * @param v
 * @returns {number}
 */
function magnitude(v) {
    return Math.sqrt((v.x * v.x) + (v.y * v.y) + (v.z * v.z));
}

/**
 * Angle between vectors in degrees
 * @param v1
 * @param v2
 * @returns {number}
 */
function angleBetweenVectors(v1, v2) {
    const dot = dotProduct(v1, v2);
    const mag1 = magnitude(v1);
    const mag2 = magnitude(v2);
    const cosTheta = dot / (mag1 * mag2);
    return Math.acos(cosTheta) * (180 / Math.PI); // Convert from radians to degrees
}

/**
 * Angle between 3 points
 *
 * @param lat1
 * @param lon1
 * @param lat2
 * @param lon2
 * @param lat3
 * @param lon3
 * @returns {number}
 */
function angleBetweenThreePoints(lat1, lon1, lat2, lon2, lat3, lon3) {
    const A = toCartesian(lat1, lon1);
    const B = toCartesian(lat2, lon2);
    const C = toCartesian(lat3, lon3);

    const BA = vector(B, A);
    const BC = vector(B, C);

    return angleBetweenVectors(BA, BC);
}

/**
 * Find where to insert new vertex
 */
function findVertexInsertionIndex(point, path) {
    // find the closest vertex
    let closestVertexIndex = findClosestVertex(point, path);

    // abort if null
    if (closestVertexIndex === null) {
        return closestVertexIndex;
    }

    // just 1 vertex, so it must
    // be the insertion point
    if (path.getLength() < 2) {
        return closestVertexIndex;
    }

    // get the index of the next vertex
    let nextVertexIndex = (closestVertexIndex + 1) % path.getLength();
    let prevVertexIndex = closestVertexIndex > 0 ? closestVertexIndex - 1 : (path.getLength() - 1);
    
    let nextVertex = path.getAt(nextVertexIndex);
    let prevVertex = path.getAt(prevVertexIndex);
    let closestVertex = path.getAt(closestVertexIndex);

    // https://math.stackexchange.com/questions/3485915/check-if-a-point-can-intersect-a-line-at-perpendicular
    // calculate angle point, closest, prev
    let pointClosestPrevAngle = angleBetweenThreePoints(
        point.lat(),
        point.lng(),
        closestVertex.lat(),
        closestVertex.lng(),
        prevVertex.lat(),
        prevVertex.lng()
    );

    // calculate angle of point, prev, closest
    let pointPrevClosestAngle = angleBetweenThreePoints(
        point.lat(),
        point.lng(),
        prevVertex.lat(),
        prevVertex.lng(),
        closestVertex.lat(),
        closestVertex.lng()
    );

    // calculate angle point, closest, next
    let pointClosestNextAngle = angleBetweenThreePoints(
        point.lat(),
        point.lng(),
        closestVertex.lat(),
        closestVertex.lng(),
        nextVertex.lat(),
        nextVertex.lng()
    );

    // calculate angle of point, next, closest
    let pointNextClosestAngle = angleBetweenThreePoints(
        point.lat(),
        point.lng(),
        nextVertex.lat(),
        nextVertex.lng(),
        closestVertex.lat(),
        closestVertex.lng()
    );

    if (pointPrevClosestAngle > 90 || pointClosestPrevAngle > 90 && ! (pointClosestNextAngle > 90 || pointNextClosestAngle > 90)) {
        return nextVertexIndex;
    }

    // if next is closer, insert before it
    return closestVertexIndex;
}

/**
 * Find the index of the closest vertex from the given path
 */
function findClosestVertex(point, path) {
    // no vertexes, so abort
    if (path.getLength() < 1) {
        return null;
    }

    let closestIndex = 0;
    let closestDistance = null;

    // just 1 vertex, so it must be the closest
    if (path.getLength() < 2) {
        return closestIndex;
    }

    path.forEach(function (vertex, index) {
       // calculate the distance to the vertex
       let distance = calculateDistance({
           lat: point.lat(),
           lng: point.lng()
       }, {
           lat: vertex.lat(),
           lng: vertex.lng()
       });

       if (closestDistance === null || distance < closestDistance) {
           closestDistance = distance;
           closestIndex = index;
       }
    });

    return closestIndex;
}

/**
 * Calculate the distance between 2 points
 * https://stackoverflow.com/questions/27928/calculate-distance-between-two-latitude-longitude-points-haversine-formula
 */
function calculateDistance(coord_1, coord_2) {
    let deltaLat = degreeToRadians(coord_2.lat - coord_1.lat);
    let deltaLng = degreeToRadians(coord_2.lng - coord_1.lng);
    let a =
        Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
        Math.cos(degreeToRadians(coord_1.lat)) * Math.cos(degreeToRadians(coord_2.lat)) *
        Math.sin(deltaLng/2) * Math.sin(deltaLng/2);

    let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return EARTH_RADIUS * c; // Distance in km
}

/**
 * Add or subtract meters to latitude
 * https://stackoverflow.com/questions/7477003/calculating-new-longitude-latitude-from-old-n-meters
 */
function calculateLatitude(lat, lng, distance, operation) {
    let delta = distance / EARTH_COEFFICIENT;

    return operation === '-' ? lat - delta : lat + delta;
}

/**
 * Add or subtract meters to longitude
 * https://stackoverflow.com/questions/7477003/calculating-new-longitude-latitude-from-old-n-meters
 */
function calculateLongitude(lat, lng, distance, operation) {
    let delta = (distance / EARTH_COEFFICIENT) / Math.cos(degreeToRadians(lat));

    return operation === '-' ? lng - delta : lng + delta;
}

/**
 * Create square from coordinates
 */
function createDefaultPolygonPath(lat, lng, radius) {
    return [
        {'lat': calculateLatitude(lat, lng, radius, '+'), 'lng': calculateLongitude(lat, lng, radius, '-')}, // top left
        {'lat': calculateLatitude(lat, lng, radius, '+'), 'lng': calculateLongitude(lat, lng, radius, '+')}, // top right
        {'lat': calculateLatitude(lat, lng, radius, '-'), 'lng': calculateLongitude(lat, lng, radius, '+')}, // bottom right
        {'lat': calculateLatitude(lat, lng, radius, '-'), 'lng': calculateLongitude(lat, lng, radius, '-')}, // bottom left
    ];
}

/**
 * Checks if a radius
 */
function isValidRadius(radius) {
    return (! isNaN(radius)) && Number(radius) >= 0;
}

/**
 * Checks if a given latitude is valid
 */
function isValidLatitude(lat) {
    let ck_lat = /^(-?[1-8]?\d(?:\.\d{1,18})?|90(?:\.0{1,18})?)$/;
    return ck_lat.test(lat);
}

/**
 * Checks if a given longitude
 */
function isValidLongitude(lng) {
    let ck_lon = /^(-?(?:1[0-7]|[1-9])?\d(?:\.\d{1,18})?|180(?:\.0{1,18})?)$/;
    return ck_lon.test(lng);
}

/**
 * Checks if a given coordinate is in the correct format
 */
function isValidCoordinate(lat, lng) {
    return isValidLatitude(lat) && isValidLongitude(lng);
}

/**
 * Checks if a given polygon path array is valid
 */
function isValidPolygonPath(path) {
    let firstPoint = null;
    let lastPoint = null;
    let length = path.length;

    for (let i = 0; i < length; i++) {
        let coord = path[i];

        if (i === 0) {
            firstPoint = coord;
        } else if (i === (length - 1)) {
            lastPoint = coord;
        }

        if (! isValidCoordinate(coord.lat, coord.lng)) {
            return false;
        }
    }

    // need at least 3 points
    if (length > 2) {
        // first and last points must match
        return firstPoint.lat === lastPoint.lat &&
            firstPoint.lng === lastPoint.lng;
    }

    return false;
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
 * Convert lat lng array to polygon string
 */
function pathToWkt(path){
    let wkt = '(';
    let length = path.getLength();
    let first_point = null;
    let last_point = null;

    for(let i = 0; i < length; i++) {
        let coord = path.getAt(i);

        if (i === 0) {
            first_point = coord;
        } else if (i === (length - 1)) {
            last_point = coord;
        }

        wkt += coord.lng() + ' ' + coord.lat() + ',';
    }

    // check if first and last point matches
    if (first_point && last_point) {
        if (! first_point.equals(last_point)) {
            // append first point to end
            wkt += first_point.lng() + ' ' + first_point.lat() + ',';
        }
    }
    // remove ending ,
    let str_len = wkt.length;

    if (wkt.substring(str_len - 1) === ',') {
        wkt = wkt.substring(0, str_len - 1);
    }

    // add closing parenthesis
    wkt += ')';

    return wkt;
}

/**
 * Normalize polygon wkt
 */
function normalizePolygonWkt(wkt) {
    // replace multiple white space with single space
    wkt = wkt.replace(/\s\s+/g, ' ')
        .trim()
        .toUpperCase();

    // remove the POLYGON() outside
    if (wkt.startsWith('POLYGON')) {
        wkt = wkt.replace('POLYGON', '')
            .trim()
            .replace('(', '')
            .replace(')', '')
            .trim();
    }

    return wkt;
}

/**
 * Convert polygon string to lat lng array
 */
function polygonWktToArray(wkt) {
    let wktPath = normalizePolygonWkt(wkt);
    let path = [];
    let coords = wktPath.replace('(', '')
        .replace(')', '')
        .trim()
        .split(',');

    for (let i = 0; i < coords.length; i++) {
        let coord = coords[i].trim().split(' ');
        let lat = coord[1];
        let lng = coord[0];

        if (isValidCoordinate(lat, lng)) {
            path.push({
                lat: Number(lat),
                lng: Number(lng)
            });
        }
    }

    return path;
}

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
            mapId: 'DEMO_MAP_ID',
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
        mapSelector(elem);
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
    mapSelector,
    bind,
    init,
    config
};