import { ArcGIS } from './ArcGIS'
import { MapBox } from './MapBox'
import { Disposable } from './types'


export class BimModel implements Disposable {

    mapBox!: MapBox
    arcGIS!: ArcGIS
    /**
     *
     */
    constructor( private rootContainer: HTMLDivElement ) {
    }

    async dispose() {
        this.mapBox?.dispose()
        this.arcGIS?.dispose()
    }

    setAppType( file: File, appType: "mapbox" | "ArcGis" ) {
        if ( appType === "mapbox" ) {
            this.mapBox = new MapBox( this.rootContainer );
            ( async () => {
                this.mapBox.fragmentModel.loadModel( file )
            } )()
        } else {
            this.arcGIS = new ArcGIS( this.rootContainer );
            ( async () => {
                this.arcGIS.fragmentModel.loadModel( file )
                this.arcGIS.fragmentModel.onLoadFinish = () => {
                    this.arcGIS.start();
                }
            } )()
        }

    }
}