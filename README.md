ThreeJS Conic Polygon Geometry
==============

[![NPM package][npm-img]][npm-url]
[![Build Size][build-size-img]][build-size-url]
[![Dependencies][dependencies-img]][dependencies-url]

A ThreeJS geometry class for drawing polygons on a sphere using cones. 

Both `ConicPolygonGeometry` and `ConicPolygonBufferGeometry` are provided.

<p align="center">
  <a href="//vasturiano.github.io/three-conic-polygon-geometry/example/countries-gdp-per-capita/"><img width="80%" src="https://vasturiano.github.io/three-conic-polygon-geometry/example/countries-gdp-per-capita/preview.png"></a>
</p>

Examples:
* [Natural Earth Countries](https://vasturiano.github.io/three-conic-polygon-geometry/example/countries/) ([source](https://github.com/vasturiano/three-conic-polygon-geometry/blob/master/example/countries/index.html))
* [Countries GDP per Capita](https://vasturiano.github.io/three-conic-polygon-geometry/example/countries-gdp-per-capita/) ([source](https://github.com/vasturiano/three-conic-polygon-geometry/blob/master/example/countries-gdp-per-capita/index.html))

## Quick start

```
import { ConicPolygonGeometry } from 'three-conic-polygon-geometry';
```
or
```
const { ConicPolygonGeometry } = require('three-conic-polygon-geometry');
```
or even
```
<script src="//unpkg.com/three-conic-polygon-geometry"></script>
```
then
```
const myMesh = new THREE.Mesh(
    new THREE.ConicPolygonGeometry(polygonGeoJson),
    new THREE.MeshBasicMaterial({ color: 'blue' })
);

```

## API reference

### Constructor

<b>ConicPolygonGeometry</b>(<b>polygonGeoJson</b>: <i>GeoJson polygon coordinates</i>, <b>bottomHeight</b>: <i>Float</i>, <b>topHeight</b>: <i>Float</i>, <b>closedBottom</b>: <i>Boolean</i>, <b>closedTop</b>: <i>Boolean</i>, <b>includeSides</b>: <i>Boolean</i>, <b>curvatureResolution</b>: <i>Float</i>)

* <b>polygonGeoJson</b>: Coordinates array as specified in GeoJson `geometry.coordinates` for `type: Polygon`. The first item is the polygon contour, additional items are the inner holes. It's recommended to split the geometries at the [anti-meridian](https://en.wikipedia.org/wiki/180th_meridian).
* <b>bottomHeight</b>: Starting height of the cone. Default is `0`.
* <b>topHeight</b>: Ending height of the cone. Default is `1`.
* <b>closedBottom</b>: Whether to add a cap surface on the cone bottom. Default is `true`.
* <b>closedTop</b>: Whether to add a cap surface on the cone top. Default is `true`.
* <b>includeSides</b>: Whether to include the side surfaces of the cone. Default is `true`.
* <b>curvatureResolution</b>: The resolution in angular degrees of the sphere curvature. The finer the resolution, the more the polygon is fragmented into smaller faces to approximate the spheric surface, at the cost of performance. Default is `5`.

### Properties

<b>.parameters</b>: <i>Object</i>

An object with a property for each of the constructor parameters. Any modification after instantiation does not change the geometry.

### Groups

The geometry supports three distinct groups to which different materials can be applied.

* <b>0</b>: The side surface of the cone.
* <b>1</b>: The bottom surface of the cone.
* <b>2</b>: The top surface of the cone.


[npm-img]: https://img.shields.io/npm/v/three-conic-polygon-geometry.svg
[npm-url]: https://npmjs.org/package/three-conic-polygon-geometry
[build-size-img]: https://img.shields.io/bundlephobia/minzip/three-conic-polygon-geometry.svg
[build-size-url]: https://bundlephobia.com/result?p=three-conic-polygon-geometry
[dependencies-img]: https://img.shields.io/david/vasturiano/three-conic-polygon-geometry.svg
[dependencies-url]: https://david-dm.org/vasturiano/three-conic-polygon-geometry
