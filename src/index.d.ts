import { Geometry, BufferGeometry } from 'three';

type PolygonCoords = number[][];

type Parameters = {
  polygonGeoJson: PolygonCoords,
  startHeight: number,
  endHeight: number,
  closedBottom: boolean,
  closedTop: boolean,
  includeSides: boolean
};

export declare class ConicPolygonGeometry extends Geometry {
  constructor(
    polygonGeoJson: PolygonCoords,
    startHeight?: number,
    endHeight?: number,
    closedBottom?: boolean,
    closedTop?: boolean,
    includeSides?: boolean
  );

  parameters: Parameters;
}

export declare class ConicPolygonBufferGeometry extends BufferGeometry {
  constructor(
    polygonGeoJson: PolygonCoords,
    startHeight?: number,
    endHeight?: number,
    closedBottom?: boolean,
    closedTop?: boolean,
    includeSides?: boolean
  );

  parameters: Parameters;
}