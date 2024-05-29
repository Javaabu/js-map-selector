---
title: Styling
sidebar_position: 3
---

This package ships with some SASS that's designed to be used with [Bootstrap](https://getboostrap.com) SASS variables. To use the provided SASS, you can import them like so and override any variables that you'd like.

```scss
$map-selector-map-height: 300px;

// search input
$map-selector-search-font-size: $input-font-size;
$map-selector-search-color: #666;
$map-selector-search-background-color: #fff;
$map-selector-search-box-shadow: rgba(0, 0, 0, 0.3) 0px 1px 4px -1px;;
$map-selector-search-focus-box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);

// marker
$map-selector-marker-border-color: $primary;
$map-selector-marker-background-color: $primary;
$map-selector-marker-glyph-color: $primary;
$map-selector-marker-icon-size: 1.2rem;

@import '@javaabu/js-map-selector/src/scss/map-selector';
```
