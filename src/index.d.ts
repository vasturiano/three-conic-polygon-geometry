import { BufferGeometry } from 'three';

type PolygonCoords = number[][][];

type Parameters = {
  polygonGeoJson: PolygonCoords,
  bottomHeight: number | ((lng: number, lat: number) => number),
  topHeight: number | ((lng: number, lat: number) => number),
  closedBottom: boolean,
  closedTop: boolean,
  includeSides: boolean,
  curvatureResolution: number
};

declare class ConicPolygonGeometry extends BufferGeometry {
  constructor(
    polygonGeoJson: PolygonCoords,
    bottomHeight?: number | ((lng: number, lat: number) => number),
    topHeight?: number | ((lng: number, lat: number) => number),
    closedBottom?: boolean,
    closedTop?: boolean,
    includeSides?: boolean,
    curvatureResolution?: number
  );

  parameters: Parameters;
}

export default ConicPolygonGeometry;
