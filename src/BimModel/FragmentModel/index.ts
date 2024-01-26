import * as THREE from 'three'
import { Disposable } from "../types"
import { DataConverterSignal, IIfcGeometries, IIfcProperties, IfcGeometriesSignal, IfcPropertiesSignal, disposeSignal } from './Signal';
import { effect } from '@preact/signals-react';
import { FragmentsGroup } from 'bim-fragment';
export * from './Signal'
import { toast } from "react-toastify";
export class FragmentModel implements Disposable {
    enabled = true;
    private readonly _DataConverterSignal: DataConverterSignal;
    private models: FragmentsGroup[] = []
    private before = performance.now()
    onLoadFinish!: () => void
    /**
     *
     */
    constructor( private scene: THREE.Scene ) {
        this._DataConverterSignal = new DataConverterSignal();
    }
    async dispose() {
        this._DataConverterSignal.cleanUp();
        this.models.forEach( ( model: FragmentsGroup ) => model.dispose() )
        disposeSignal()
    }
    private onMessage( dataArray: Uint8Array ) {
        const geometryWorker = new Worker( "./IfcGeometryWorker.js" )
        const propertyWorker = new Worker( "./IfcPropertyWorker.js" )
        geometryWorker.postMessage( dataArray )
        propertyWorker.postMessage( dataArray );
        geometryWorker.onmessage = async ( e: any ) => {
            const { items, coordinationMatrix, error } = e.data
            if ( error ) return
            IfcGeometriesSignal.value = { items, coordinationMatrix } as IIfcGeometries
        }
        propertyWorker.onmessage = async ( e: any ) => {
            const { error, categories, uuid, ifcMetadata, properties, itemsByFloor } = e.data
            if ( error ) return
            IfcPropertiesSignal.value = { categories, uuid, ifcMetadata, properties, itemsByFloor } as IIfcProperties
        }
        effect( async () => {
            if ( !IfcGeometriesSignal.value || !IfcPropertiesSignal.value ) return;
            const model = await this._DataConverterSignal.generate( IfcGeometriesSignal.value, IfcPropertiesSignal.value )
            this.scene.add( model )
            this.models.push( model )
            toast.success( `Model load in : ${( performance.now() - this.before ) / 1000}s` );
            if ( this.onLoadFinish ) this.onLoadFinish()
            geometryWorker.terminate();
            propertyWorker.terminate();
            this._DataConverterSignal.cleanUp()
            IfcGeometriesSignal.value = null
            IfcPropertiesSignal.value = null
        } )
    }
    async loadModel( file: File ) {
        this.before = performance.now()
        const buffer = await file.arrayBuffer()
        const dataArray = new Uint8Array( buffer );
        this.onMessage( dataArray )
    }
    updateMatrixArcGIS( transformation: number[] ) {
        // we have to calculate scale
        const scale = 1000
        for ( const model of this.models ) {
            model.scale.set( scale, scale, scale )
            model.applyMatrix4( new THREE.Matrix4().fromArray( transformation ) );
            model.rotateX( Math.PI / 2 )
        }
    }
}