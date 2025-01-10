import { BufferGeometry } from 'three';

type PolygonCoords = number[][][];

type Parameters = {
  polygonGeoJson: PolygonCoords,
  startHeight: number,
  endHeight: number,
  closedBottom: boolean,
  closedTop: boolean,
  includeSides: boolean,
  curvatureResolution: number
};

declare class ConicPolygonGeometry extends BufferGeometry {
  constructor(
    polygonGeoJson: PolygonCoords,
    startHeight?: number,
    endHeight?: number,
    closedBottom?: boolean,
    closedTop?: boolean,
    includeSides?: boolean,
    curvatureResolution?: number
  );

  parameters: Parameters;
}

export default ConicPolygonGeometry;
