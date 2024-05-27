---
title: Installation & Setup
sidebar_position: 1.2
---

# Installation

First install the NPM package 

```bash
npm install @javaabu/js-map-selector --save
```

Now you can use the package in your JS.

```javascript
import * as mapSelector from '@javaabu/js-map-selector';

mapSelector.init();
```

Note that this package requires [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript) with a Google Maps API key that has access to the Maps JavaScript API and the Places API. So, make sure to include the Google Maps library on your page like so:

```html
<script>
    (g=>{var h,a,k,p='The Google Maps JavaScript API',c='google',l='importLibrary',q='__ib__',m=document,b=window;b=b[c]||(b[c]={});var d=b.maps||(b.maps={}),r=new Set,e=new URLSearchParams,u=()=>h||(h=new Promise(async(f,n)=>{await (a=m.createElement('script'));e.set('libraries',[...r]+'');for(k in g)e.set(k.replace(/[A-Z]/g,t=>'_'+t[0].toLowerCase()),g[k]);e.set('callback',c+'.maps.'+q);a.src=`https://maps.${c}apis.com/maps/api/js?`+e;d[q]=f;a.onerror=()=>h=n(Error(p+' could not load.'));a.nonce=m.querySelector('script[nonce]')?.nonce||'';m.head.append(a)}));d[l]?console.warn(p+' only loads once. Ignoring:',g):d[l]=(f,...n)=>r.add(f)&&u().then(()=>d[l](f,...n))})({
        key: '<your-maps-api-key>',
        v: 'weekly',
    });
</script>
```