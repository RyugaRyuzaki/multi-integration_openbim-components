import * as WEBIFC from "web-ifc";
import { IfcParser } from '../IfcParser'
import { SpatialStructure } from "./spatial-structure";
import { IfcJsonExporter } from "./IfcJsonExporter";
import { IfcCategories, IfcItemsCategories } from "./data";
class PropertyLoader extends IfcParser {
  private readonly _spatialTree = new SpatialStructure();
  private _propertyExporter = new IfcJsonExporter();
  private _ifcCategories = new IfcCategories();
  async readIfcFile( data: Uint8Array ) {
    try {
      const { path, absolute } = this.wasm;
      this._webIfc.SetWasmPath( path, absolute );
      await this._webIfc.Init();
      this._webIfc.OpenModel( data, this.webIfc );
      await this._spatialTree.setUp( this._webIfc );
      const categories = this._ifcCategories.getAll( this._webIfc, 0 ) as IfcItemsCategories
      const uuid = this.getProjectID( 0 )
      const ifcMetadata = this.getIfcMetadata( this._webIfc, 0 );
      const properties = await this.getModelProperties( 0 );
      const units = this._spatialTree.units
      properties["Unit"] = { Unit: units }
      return { error: false, categories, uuid, ifcMetadata, properties, itemsByFloor: this._spatialTree.itemsByFloor }
    } catch ( error: any ) {
      return { error: true }
    }
  }
  private getIfcMetadata( webIfc: WEBIFC.IfcAPI, modelID: number ) {
    const { FILE_NAME, FILE_DESCRIPTION } = WEBIFC;
    const name = this.getMetadataEntry( webIfc, FILE_NAME, modelID );
    const description = this.getMetadataEntry( webIfc, FILE_DESCRIPTION, modelID );
    const schema = webIfc.GetModelSchema( modelID )
    const maxExpressID: number = webIfc.GetMaxExpressID( modelID );
    return { name, description, schema, maxExpressID };
  }
  private getMetadataEntry( webIfc: WEBIFC.IfcAPI, type: number, modelID: number ) {
    let description = "";
    const descriptionData = webIfc.GetHeaderLine( modelID, type ) || "";
    if ( !descriptionData ) return description;
    for ( const arg of descriptionData.arguments ) {
      if ( arg === null || arg === undefined ) {
        continue;
      }
      if ( Array.isArray( arg ) ) {
        for ( const subArg of arg ) {
          description += `${subArg.value}|`;
        }
      } else {
        description += `${arg.value}|`;
      }
    }
    return description;
  }
  private getProjectID( modelID: number ) {
    const projectsIDs = this._webIfc.GetLineIDsWithType( modelID, WEBIFC.IFCPROJECT );
    const projectID = projectsIDs.get( modelID );
    const project = this._webIfc.GetLine( modelID, projectID );
    return project.GlobalId.value;
  }
  private async getModelProperties( modelID: number ) {
    return new Promise<any>( ( resolve ) => {
      this._propertyExporter.onPropertiesSerialized.add( ( properties: any ) => {
        resolve( properties );
      } );
      this._propertyExporter.export( this._webIfc, modelID );
    } );
  }
}

const propertyLoader = new PropertyLoader()
self.onmessage = async ( e: any ) => {
  const dataArray = e.data
  const items = await propertyLoader.readIfcFile( dataArray )
  self.postMessage( items )
}