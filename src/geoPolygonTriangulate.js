import Delaunator from 'delaunator';
import earcut, { flatten as earcutFlatten } from 'earcut';
import turfPointInPolygon from '@turf/boolean-point-in-polygon';
import { geoDistance, geoInterpolate, geoBounds, geoContains } from 'd3-geo';
import { geoVoronoi } from 'd3-geo-voronoi';
import { mean, merge as flatten, extent } from 'd3-array';
import { scaleLinear } from 'd3-scale';

function geoPolygonTriangulate(polygon, {
  resolution = Infinity // curvature resolution, in spherical degrees
} = {}) {
  const contour = interpolateContourPoints(polygon, resolution);

  const edgePoints = flatten(contour);
  const innerPoints = getInnerGeoPoints(polygon, resolution);
  const points = [...edgePoints, ...innerPoints];

  const boundariesGeojson = { type: 'Polygon', coordinates: polygon };
  const [[minLng, minLat], [maxLng, maxLat]] = geoBounds(boundariesGeojson);
  const crossesPoleOrAntimeridian = minLng > maxLng // crosses antimeridian
    || maxLat >= 89 // crosses north pole
    || minLat <= -89; // crosses south pole

  let indices = [];

  if (crossesPoleOrAntimeridian) {
    // Use d3-geo-voronoi. Slowest, but most accurate for polygons that cross poles or anti-meridian
    const vt = geoVoronoi(points).triangles(); // geoDelaunay generates more triangles than needed
    const pntMap = new Map(points.map(([lng, lat], idx) => [`${lng}-${lat}`, idx]));
    vt.features.forEach(f => {
      const triangle = f.geometry.coordinates[0].slice(0, 3).reverse(); // reverse wound to match earcut

      const inds = [];
      triangle.forEach(([lng, lat]) => {
        const k = `${lng}-${lat}`;
        pntMap.has(k) && inds.push(pntMap.get(k));
      });

      if (inds.length !== 3) return; // triangle malfunction

      // exclude edge triangles outside polygon perimeter or through holes
      if (inds.some(ind => ind < edgePoints.length)) {
        const triangleCentroid = f.properties.circumcenter;
        if (!pointInside(triangleCentroid, boundariesGeojson, crossesPoleOrAntimeridian)) return;
      }

      indices.push(...inds);
    });
  } else if (!innerPoints.length) {
    // earcut triangulation slightly more performing if it's only using the polygon perimeter
    const { vertices, holes = [] } = earcutFlatten(contour);
    indices = earcut(vertices, holes, 2);
  } else {
    // use delaunator
    const delaunay = Delaunator.from(points);

    for (let i = 0, len = delaunay.triangles.length; i < len; i += 3) {
      const inds = [2, 1, 0].map(idx => delaunay.triangles[i + idx]); // reverse wound to have same orientation as earcut
      const triangle = inds.map(indice => points[indice]);

      // exclude edge triangles outside polygon perimeter or through holes
      if (inds.some(ind => ind < edgePoints.length)) {
        const triangleCentroid = [0, 1].map(coordIdx => mean(triangle, p => p[coordIdx]));
        if (!pointInside(triangleCentroid, boundariesGeojson, crossesPoleOrAntimeridian)) continue;
      }

      indices.push(...inds);
    }
  }

  // calc uvs
  const lngUvScale = scaleLinear(extent(points, d => d[0]), [0,1]);
  const latUvScale = scaleLinear(extent(points, d => d[1]), [0,1]);
  const uvs = points.map(([lng, lat]) => [lngUvScale(lng), latUvScale(lat)]);

  const triangles = { points, indices, uvs };

  return { contour, triangles };
}

function interpolateContourPoints(polygon, maxDistance) {
  // add interpolated points for segments that are further apart than the max distance
  return polygon.map(coords => {
    const pnts = [];

    let prevPnt;
    coords.forEach(pnt => {
      if (prevPnt) {
        const dist = geoDistance(pnt, prevPnt) * 180 / Math.PI;
        if (dist > maxDistance) {
          const interpol = geoInterpolate(prevPnt, pnt);
          const tStep = 1 / Math.ceil(dist / maxDistance);

          let t = tStep;
          while (t < 1) {
            pnts.push(interpol(t));
            t += tStep;
          }
        }
      }

      pnts.push(prevPnt = pnt);
    });

    return pnts;
  });
}

function getInnerGeoPoints(polygon, maxDistance) {
  const boundariesGeojson = { type: 'Polygon', coordinates: polygon };
  const [[minLng, minLat], [maxLng, maxLat]] = geoBounds(boundariesGeojson);

  // polygon smaller than maxDistance -> no inner points
  if (Math.min(Math.abs(maxLng - minLng), Math.abs(maxLat - minLat)) < maxDistance) return [];

  const crossesPoleOrAntimeridian = minLng > maxLng || maxLat >= 89 || minLat <= -89;

  return getGeoSpiralGrid(maxDistance, { minLng, maxLng, minLat, maxLat })
    .filter(pnt => pointInside(pnt, boundariesGeojson, crossesPoleOrAntimeridian));
}

function getGeoSpiralGrid(
  distanceBetweenPoints, // in degrees
  { minLng, maxLng, minLat, maxLat } = {}
) {
  const numPoints = Math.round((360 / distanceBetweenPoints)**2 / Math.PI);

  // https://observablehq.com/@mbostock/spherical-fibonacci-lattice
  const phi = (1 + Math.sqrt(5)) / 2; // golden ratio

  const getPntLng = idx => idx / phi * 360 % 360 - 180;
  const getPntLat = idx => Math.acos(2 * idx / numPoints - 1) / Math.PI * 180 - 90;
  const getPntIdx = lat => numPoints * (Math.cos((lat + 90) * Math.PI / 180) + 1) / 2;

  const pntIdxRange = [
    maxLat !== undefined ? Math.ceil(getPntIdx(maxLat)) : 0,
    minLat !== undefined ? Math.floor(getPntIdx(minLat)) : numPoints - 1,
  ];

  const isLngInRange = minLng === undefined && maxLng === undefined
    ? () => true
    : minLng === undefined
      ? lng => lng <= maxLng
      : maxLng === undefined
        ? lng => lng >= minLng
        : maxLng >= minLng
          ? lng => lng >= minLng && lng <= maxLng
          : lng => lng >= minLng || lng <= maxLng; // for ranges that cross the anti-meridian

  const pnts = [];
  for (let i = pntIdxRange[0]; i <= pntIdxRange[1]; i++) {
    const lng = getPntLng(i);
    isLngInRange(lng) && pnts.push([lng, getPntLat(i)]);
  }

  return pnts;
}

function pointInside(pnt, polygon, crossesPoleOrAntimeridian = false) {
  // turf method is more performing but malfunctions if polygon includes a pole (lat = 90 | -90) or crosses the antimeridian (lng = 180 | -180)
  return crossesPoleOrAntimeridian
    ? geoContains(polygon, pnt)
    : turfPointInPolygon(pnt, polygon);
}

export default geoPolygonTriangulate;
