import * as WEBIFC from "web-ifc";
import { IfcParser } from '../IfcParser'
interface IBufferGeometry {
  vertexData: Float32Array;
  indexData: Uint32Array
}
export interface IfcGeometries {
  [id: string]: {
    buffer: IBufferGeometry;
    instances: { color: WEBIFC.Color; matrix: number[]; expressID: number }[];
  };
}

export class GeometryLoader extends IfcParser {
  items: IfcGeometries = {};

  async readIfcFile( data: Uint8Array ) {
    try {
      const { path, absolute } = this.wasm;
      this._webIfc.SetWasmPath( path, absolute );
      await this._webIfc.Init();
      this._webIfc.OpenModel( data, this.webIfc );
      await this.readAllGeometries( 0 )
      const coordinationMatrix = this._webIfc.GetCoordinationMatrix( 0 )
      return { error: false, items: this.items, coordinationMatrix }
    } catch ( error: any ) {
      console.log( error );
      return { error: true }
    }
  }
  private async readAllGeometries( modelID: number ) {
    // Some categories (like IfcSpace) need to be created explicitly
    const optionals = this.optionalCategories;

    // Force IFC space to be transparent
    if ( optionals.includes( WEBIFC.IFCSPACE ) ) {
      const index = optionals.indexOf( WEBIFC.IFCSPACE );
      optionals.splice( index, 1 );
      this._webIfc.StreamAllMeshesWithTypes( modelID, [WEBIFC.IFCSPACE], ( mesh ) => {

        this.streamMesh( mesh, true );
      } );
    }

    // Load rest of optional categories (if any)
    if ( optionals.length ) {
      this._webIfc.StreamAllMeshesWithTypes( modelID, optionals, ( mesh ) => {
        this.streamMesh( mesh );
      } );
    }

    // Load common categories
    this._webIfc.StreamAllMeshes( modelID, ( mesh: WEBIFC.FlatMesh ) => {

      this.streamMesh( mesh );
    } );
  }
  streamMesh(
    mesh: WEBIFC.FlatMesh,
    forceTransparent = false
  ) {
    const size = mesh.geometries.size();
    for ( let i = 0; i < size; i++ ) {
      const geometry = mesh.geometries.get( i );
      const geometryID = geometry.geometryExpressID;
      // Transparent geometries need to be separated
      const isColorTransparent = geometry.color.w !== 1;
      const isTransparent = isColorTransparent || forceTransparent;
      const prefix = isTransparent ? "-" : "+";
      const idWithTransparency = prefix + geometryID;
      if ( forceTransparent ) geometry.color.w = 0.1;

      if ( !this.items[idWithTransparency] ) {
        const buffer = this.newBufferGeometry( geometryID );
        if ( !buffer ) continue;
        this.items[idWithTransparency] = { buffer, instances: [] };
      }
      this.items[idWithTransparency].instances.push( {
        color: { ...geometry.color },
        matrix: geometry.flatTransformation,
        expressID: mesh.expressID,
      } );
    }
  }
  private newBufferGeometry( geometryID: number ): IBufferGeometry | null {
    const geometry = this._webIfc.GetGeometry( 0, geometryID );
    const vertexData = this.getVertices( geometry );
    if ( !vertexData.length ) return null;
    const indexData = this.getIndices( geometry );
    if ( !indexData.length ) return null;
    // @ts-ignore
    geometry.delete();
    return { vertexData, indexData } as IBufferGeometry;
  }

  private getIndices( geometryData: WEBIFC.IfcGeometry ) {
    const indices = this._webIfc.GetIndexArray(
      geometryData.GetIndexData(),
      geometryData.GetIndexDataSize()
    ) as Uint32Array;
    return indices;
  }

  private getVertices( geometryData: WEBIFC.IfcGeometry ) {
    const verts = this._webIfc.GetVertexArray(
      geometryData.GetVertexData(),
      geometryData.GetVertexDataSize()
    ) as Float32Array;
    return verts;
  }
}