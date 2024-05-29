---
title: Getting Started
sidebar_position: 1
---

To use the module, import it and initialize like so. This will enable `mapSelector` on all elements with the `data-map-selector` attribute.

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

```javascript
import * as mapSelector from '@javaabu/js-map-selector';

mapSelector.init();
```

You can also manually bind `mapSelector` on an arbitrary element using the `bind()` method. The argument to the `bind()` method must be a DOM Element. This can be useful for binding `mapSelector` on dynamic elements with `data-map-selector`.

```javascript
import * as mapSelector from '@javaabu/js-map-selector';

mapSelector.bind(document.getElementById('my-map-inputs'));
```

Without using the `data-map-selector` attribute, you can initialize `mapSelector` on any element using the `mapSelector()` method. The first argument to this method must be a DOM Element and the second argument should be a configuration object.

```html
<div id="display-map">
    <div class="map-selector-map"></div>
</div>
```

```javascript
import * as mapSelector from '@javaabu/js-map-selector';

mapSelector.mapSelector(document.getElementById('display-map'), {lat: 4.175804, lng: 73.509337});
```
