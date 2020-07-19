import {
  BufferGeometry,
  Float32BufferAttribute,
  Geometry
} from 'three';

const THREE = window.THREE
  ? window.THREE // Prefer consumption from global THREE, if exists
  : {
  BufferGeometry,
  Float32BufferAttribute,
  Geometry
};

import Delaunator from 'delaunator';
import earcut from 'earcut';
import { geoContains, geoDistance, geoInterpolate } from 'd3-geo';
import { extent, mean, merge as flatten } from 'd3-array';

// support both modes for backwards threejs compatibility
const setAttributeFn = new THREE.BufferGeometry().setAttribute ? 'setAttribute' : 'addAttribute';

function ConicPolygonGeometry(polygonGeoJson, startHeight, endHeight, closedBottom, closedTop, includeSides, curvatureResolution) {
  THREE.Geometry.call(this);

  this.type = 'ConicPolygonGeometry';

  this.parameters = {
    polygonGeoJson,
    startHeight,
    endHeight,
    closedBottom,
    closedTop,
    includeSides,
    curvatureResolution
  };

  this.fromBufferGeometry(new ConicPolygonBufferGeometry(polygonGeoJson, startHeight, endHeight, closedBottom, closedTop, includeSides));
  this.mergeVertices();
}

ConicPolygonGeometry.prototype = Object.create(THREE.Geometry.prototype);
ConicPolygonGeometry.prototype.constructor = ConicPolygonGeometry;

function ConicPolygonBufferGeometry(polygonGeoJson, startHeight, endHeight, closedBottom, closedTop, includeSides, curvatureResolution) {

  THREE.BufferGeometry.call(this);

  this.type = 'ConicPolygonBufferGeometry';

  this.parameters = {
    polygonGeoJson,
    startHeight,
    endHeight,
    closedBottom,
    closedTop,
    includeSides,
    curvatureResolution
  };

  // defaults
  startHeight = startHeight || 0;
  endHeight = endHeight || 1;
  closedBottom = closedBottom !== undefined ? closedBottom : true;
  closedTop = closedTop !== undefined ? closedTop : true;
  includeSides = includeSides !== undefined ? includeSides : true;
  curvatureResolution = curvatureResolution || 5; // in angular degrees

  // pre-calculate contour and triangulation
  const contourGeoJson = interpolateContourPoints(polygonGeoJson, curvatureResolution);
  const geoTriangles = (closedTop || closedBottom) && triangulateGeoSurface();

  let vertices = [];
  let indices = [];
  let groupCnt = 0; // add groups to apply different materials to torso / caps

  const addGroup = groupData => {
    const prevVertCnt = Math.round(vertices.length / 3);
    const prevIndCnt = indices.length;

    vertices = vertices.concat(groupData.vertices);
    indices = indices.concat(!prevVertCnt ? groupData.indices : groupData.indices.map(ind => ind + prevVertCnt));

    this.addGroup(prevIndCnt, indices.length - prevIndCnt, groupCnt++);
  };

  includeSides && addGroup(generateTorso());
  closedBottom && addGroup(generateCap(startHeight));
  closedTop && addGroup(generateCap(endHeight));

  // build geometry
  this.setIndex(indices);
  this[setAttributeFn]('position', new THREE.Float32BufferAttribute(vertices, 3));

  // auto-calculate normals
  this.computeFaceNormals();
  this.computeVertexNormals();

  //

  function generateVertices(polygon, altitude) {
    const coords3d = polygon.map(coords => coords.map(([lng, lat]) => polar2Cartesian(lat, lng, altitude)));
    // returns { vertices, holes, coordinates }. Each point generates 3 vertice items (x,y,z).
    return earcut.flatten(coords3d);
  }

  function generateTorso() {
    const { vertices: bottomVerts, holes } = generateVertices(contourGeoJson, startHeight);
    const { vertices: topVerts } = generateVertices(contourGeoJson, endHeight);

    const vertices = flatten([topVerts, bottomVerts]);
    const numPoints = Math.round(topVerts.length / 3);

    const holesIdx = new Set(holes);
    let lastHoleIdx = 0;

    const indices = [];
    for (let v0Idx = 0; v0Idx < numPoints; v0Idx++) {
      let v1Idx = v0Idx + 1; // next point
      if (v1Idx === numPoints) {
        v1Idx = lastHoleIdx; // close final loop
      } else if (holesIdx.has(v1Idx)) {
        const holeIdx = v1Idx;
        v1Idx = lastHoleIdx; // close hole loop
        lastHoleIdx = holeIdx;
      }

      // Each pair of coords generates two triangles (faces)
      indices.push(v0Idx, v0Idx + numPoints, v1Idx + numPoints);
      indices.push(v1Idx + numPoints, v1Idx, v0Idx);
    }

    return { indices, vertices };
  }

  function generateCap(radius) {
    return {
      indices: geoTriangles.indices,
      vertices: generateVertices([geoTriangles.points], radius).vertices
    }
  }

  function triangulateGeoSurface() {
    const edgePnts = flatten(contourGeoJson);
    const innerPoints = getInnerGeoPoints(contourGeoJson, curvatureResolution);

    const points = [...edgePnts, ...innerPoints];

    const delaunay = Delaunator.from(points);

    const indices = [];

    const maxDistance = Math.hypot(curvatureResolution, curvatureResolution) * 1.1; // with small margin of error
    const boundariesGeojson = { type: 'Polygon', coordinates: polygonGeoJson };
    for (let i=0, len=delaunay.triangles.length; i < len; i+=3) {
      const inds = [0, 1, 2].map(idx => delaunay.triangles[i+idx]);
      const triangle = inds.map(indice => points[indice]);

      // exclude triangles longer than the max distance
      const largestSide = Math.max(...[[0,1],[1,2],[2,0]].map(([i0, i1]) =>
        Math.hypot(...[0, 1].map(cIdx => triangle[i1][cIdx]- triangle[i0][cIdx]))
      ));
      if (largestSide > maxDistance) continue;

      // exclude edge triangles outside polygon perimeter or through holes
      if (inds.some(ind => ind < edgePnts.length)) {
        const triangleCentroid = [0, 1].map(coordIdx => mean(triangle, p => p[coordIdx]));
        if (!geoContains(boundariesGeojson, triangleCentroid)) continue;
      }

      indices.push(...inds);
    }

    return { points, indices };
  }
}

ConicPolygonBufferGeometry.prototype = Object.create(THREE.BufferGeometry.prototype);
ConicPolygonBufferGeometry.prototype.constructor = ConicPolygonBufferGeometry;

//

function polar2Cartesian(lat, lng, r = 0) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (90 - lng) * Math.PI / 180;
  return [
    r * Math.sin(phi) * Math.cos(theta), // x
    r * Math.cos(phi), // y
    r * Math.sin(phi) * Math.sin(theta) // z
  ];
}

function interpolateContourPoints(polygonGeoJson, maxDistance) {
  // add interpolated points for segments that are further apart than the max distance
  return polygonGeoJson.map(coords => {
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

function getInnerGeoPoints(polygonGeoJson, maxDistance) {
  const [minLng, maxLng] = extent(polygonGeoJson[0], p => p[0]);
  const [minLat, maxLat] = extent(polygonGeoJson[0], p => p[1]);

  // distribute grid remainder equally on both sides
  const startLng = minLng + (maxLng - minLng)%maxDistance / 2;
  const startLat = minLat + (maxLat - minLat)%maxDistance / 2;

  const pnts = [];
  const boundariesGeojson = { type: 'Polygon', coordinates: polygonGeoJson };

  // iterate through grid
  let lng = startLng;
  let lat;
  while (lng < maxLng) {
    lat = startLat;
    while (lat < maxLat) {
      const pnt = [lng, lat];
      geoContains(boundariesGeojson, pnt) && pnts.push(pnt);
      lat += maxDistance;
    }
    lng += maxDistance;
  }

  return pnts;
}

export { ConicPolygonGeometry, ConicPolygonBufferGeometry };
