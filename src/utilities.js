/*
Utility functions
 */

// number of km per degree = ~111km (111.32 in google maps, but range varies
// between 110.567km at the equator and 111.699km at the poles)
//
// 111.32km = 111320.0m (".0" is used to make sure the result of division is
// double even if the "meters" variable can't be explicitly declared as double)
const EARTH_COEFFICIENT = 111320.0; // m
const EARTH_RADIUS = 6371; // km


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

export {
    EARTH_COEFFICIENT,
    EARTH_RADIUS,
    degreeToRadians,
    toCartesian,
    vector,
    dotProduct,
    magnitude,
    angleBetweenVectors,
    angleBetweenThreePoints,
    findVertexInsertionIndex,
    findClosestVertex,
    calculateDistance,
    calculateLatitude,
    calculateLongitude,
    createDefaultPolygonPath,
    isValidRadius,
    isValidLatitude,
    isValidLongitude,
    isValidCoordinate,
    isValidPolygonPath,
    getDataAtrributeConfigs,
    pathToWkt,
    normalizePolygonWkt,
    polygonWktToArray,
};