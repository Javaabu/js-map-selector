---
title: Examples
sidebar_position: 3
---

For more examples view the demo [here](https://js-map-selector.demo.mv/).

## Coordinate Input

```html
<div id="my-map-inputs">
    <div data-map-selector="true">
        <input class="form-control map-selector-lat" type="number" name="lat" value="4.175804" step="0.000001"
               min="-90" max="90" placeholder="Latitude" />
    
        <input class="form-control map-selector-lng" type="number" name="lng" value="73.509337" step="0.000001"
               min="-180" max="180" placeholder="Longitude" />
        
        <div>
            <input class="map-selector-search" type="text" placeholder="Search..." />
            <div class="map-selector-map"></div>
        </div>
    </div>
</div>
```