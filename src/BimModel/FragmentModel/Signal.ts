import * as THREE from 'three'
import * as WEBIFC from "web-ifc";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils";
import { signal } from "@preact/signals-react";
import { Fragment, FragmentsGroup, GeometryUtils } from 'bim-fragment';
import { FragmentBoundingBox } from './FragmentBoundingBox';
import { toCompositeID } from "./Misc";
interface IBufferGeometry {
    vertexData: Float32Array;
    indexData: Uint32Array
}
export interface IIfcGeometries {
    items: {
        [id: string]: {
            buffer: IBufferGeometry;
            instances: { color: WEBIFC.Color; matrix: number[]; expressID: number }[];
        }
    };
    coordinationMatrix: number[]
}
export interface IIfcProperties {
    categories: any;
    uuid: string;
    ifcMetadata: any;
    properties: any;
    itemsByFloor: any;
}
export const IfcGeometriesSignal = signal<IIfcGeometries | null>( null )
export const IfcPropertiesSignal = signal<IIfcProperties | null>( null )

export function disposeSignal() {
    IfcGeometriesSignal.value = null
    IfcPropertiesSignal.value = null
}




export class DataConverterSignal {
    private _model = new FragmentsGroup();

    private _fragmentKey = 0;

    private _keyFragmentMap: { [key: number]: string } = {};
    private _itemKeyMap: { [expressID: string]: number[] } = {};
    private _bbox: FragmentBoundingBox = new FragmentBoundingBox()

    constructor() {
    }

    cleanUp() {
        this._fragmentKey = 0;
        this._model = new FragmentsGroup();
        this._bbox.dispose()
        this._keyFragmentMap = {};
        this._itemKeyMap = {};
    }



    async generate( geometries: IIfcGeometries, IfcProperties: IIfcProperties ) {
        this.createAllFragments( geometries.items );
        await this.saveModelData( IfcProperties, geometries.coordinationMatrix );
        return this._model;
    }

    private async saveModelData( IfcProperties: IIfcProperties, coordinationMatrix: number[] ) {
        const { categories, uuid, ifcMetadata, properties, itemsByFloor } = IfcProperties
        properties.coordinationMatrix = coordinationMatrix
        const itemsData = this.getFragmentsGroupData( itemsByFloor, categories );
        this._model.keyFragments = this._keyFragmentMap;
        this._model.data = itemsData;
        this._model.coordinationMatrix = new THREE.Matrix4().fromArray( coordinationMatrix );
        this._model.properties = properties
        this._model.uuid = uuid
        this._model.ifcMetadata = ifcMetadata
        this._model.boundingBox = await this.getBoundingBox();
    }

    private async getBoundingBox() {
        this._bbox.reset();
        this._bbox.add( this._model );
        return this._bbox.get();
    }

    private createAllFragments( geometries: any ) {
        const uniqueItems: {
            [matID: string]: {
                material: THREE.MeshLambertMaterial;
                geometries: THREE.BufferGeometry[];
                expressIDs: string[];
            };
        } = {};

        const matrix = new THREE.Matrix4();
        const color = new THREE.Color();

        for ( const id in geometries ) {
            const { buffer, instances } = geometries[id];
            const { vertexData, indexData } = buffer
            const constructBuffer = this.constructBuffer( vertexData, indexData ) as THREE.BufferGeometry
            const transparent = instances[0].color.w !== 1;
            const opacity = transparent ? 0.4 : 1;
            const material = new THREE.MeshLambertMaterial( { transparent, opacity } );

            // This prevents z-fighting for ifc spaces
            if ( opacity !== 1 ) {
                material.depthWrite = false;
                material.polygonOffset = true;
                material.polygonOffsetFactor = 5;
                material.polygonOffsetUnits = 1;
            }

            if ( instances.length === 1 ) {
                const instance = instances[0];
                const { x, y, z, w } = instance.color;
                const matID = `${x}-${y}-${z}-${w}`;
                if ( !uniqueItems[matID] ) {
                    material.color = new THREE.Color().setRGB( x, y, z, "srgb" );
                    uniqueItems[matID] = { material, geometries: [], expressIDs: [] };
                }
                matrix.fromArray( instance.matrix );
                constructBuffer.applyMatrix4( matrix );
                uniqueItems[matID].geometries.push( constructBuffer );
                uniqueItems[matID].expressIDs.push( instance.expressID.toString() );
                continue;
            }

            const fragment = new Fragment( constructBuffer, material, instances.length );
            this._keyFragmentMap[this._fragmentKey] = fragment.id;

            const previousIDs = new Set<number>();

            for ( let i = 0; i < instances.length; i++ ) {
                const instance = instances[i];
                matrix.fromArray( instance.matrix );
                const { expressID } = instance;
                let instanceID = expressID.toString();
                let isComposite = false;
                if ( !previousIDs.has( expressID ) ) {
                    previousIDs.add( expressID );
                } else {
                    if ( !fragment.composites[expressID] ) {
                        fragment.composites[expressID] = 1;
                    }
                    const count = fragment.composites[expressID];
                    instanceID = toCompositeID( expressID, count );
                    isComposite = true;
                    fragment.composites[expressID]++;
                }

                fragment.setInstance( i, {
                    ids: [instanceID],
                    transform: matrix,
                } );

                const { x, y, z } = instance.color;
                color.setRGB( x, y, z, "srgb" );
                fragment.mesh.setColorAt( i, color );

                if ( !isComposite ) {
                    this.saveExpressID( expressID.toString() );
                }
            }

            fragment.mesh.updateMatrix();
            this._model.items.push( fragment );
            this._model.add( fragment.mesh );
            this._fragmentKey++;
        }

        const transform = new THREE.Matrix4();
        for ( const matID in uniqueItems ) {
            const { material, geometries, expressIDs } = uniqueItems[matID];

            const geometriesByItem: { [expressID: string]: THREE.BufferGeometry[] } = {};
            for ( let i = 0; i < expressIDs.length; i++ ) {
                const id = expressIDs[i];
                if ( !geometriesByItem[id] ) {
                    geometriesByItem[id] = [];
                }
                geometriesByItem[id].push( geometries[i] );
            }

            const sortedGeometries: THREE.BufferGeometry[] = [];
            const sortedIDs: string[] = [];
            for ( const id in geometriesByItem ) {
                sortedIDs.push( id );
                const geometries = geometriesByItem[id];
                if ( geometries.length ) {
                    const merged = mergeGeometries( geometries );
                    sortedGeometries.push( merged );
                } else {
                    sortedGeometries.push( geometries[0] );
                }
                for ( const geometry of geometries ) {
                    geometry.dispose();
                }
            }

            const geometry = GeometryUtils.merge( [sortedGeometries], true );
            const fragment = new Fragment( geometry, material, 1 );
            this._keyFragmentMap[this._fragmentKey] = fragment.id;

            for ( const id of sortedIDs ) {
                this.saveExpressID( id );
            }
            this._fragmentKey++;

            fragment.setInstance( 0, { ids: sortedIDs, transform } );
            this._model.items.push( fragment );
            this._model.add( fragment.mesh );
        }
    }

    private saveExpressID( expressID: string ) {
        if ( !this._itemKeyMap[expressID] ) {
            this._itemKeyMap[expressID] = [];
        }
        this._itemKeyMap[expressID].push( this._fragmentKey );
    }

    private getFragmentsGroupData( itemsByFloor: any, categories: any ) {
        const itemsData: { [expressID: number]: [number[], number[]] } = {};
        for ( const id in this._itemKeyMap ) {
            const keys: number[] = [];
            const rels: number[] = [];
            const idNum = parseInt( id, 10 );
            const level = itemsByFloor[idNum] || 0;
            const category = categories[idNum] || 0;
            rels.push( level, category );
            for ( const key of this._itemKeyMap[id] ) {
                keys.push( key );
            }
            itemsData[idNum] = [keys, rels];
        }
        return itemsData;
    }


    private constructBuffer( vertexData: Float32Array, indexData: Uint32Array ) {
        const geometry = new THREE.BufferGeometry();

        const posFloats = new Float32Array( vertexData.length / 2 );
        const normFloats = new Float32Array( vertexData.length / 2 );

        for ( let i = 0; i < vertexData.length; i += 6 ) {
            posFloats[i / 2] = vertexData[i];
            posFloats[i / 2 + 1] = vertexData[i + 1];
            posFloats[i / 2 + 2] = vertexData[i + 2];

            normFloats[i / 2] = vertexData[i + 3];
            normFloats[i / 2 + 1] = vertexData[i + 4];
            normFloats[i / 2 + 2] = vertexData[i + 5];
        }

        geometry.setAttribute( "position", new THREE.BufferAttribute( posFloats, 3 ) );
        geometry.setAttribute( "normal", new THREE.BufferAttribute( normFloats, 3 ) );
        geometry.setIndex( new THREE.BufferAttribute( indexData, 1 ) );
        geometry.computeBoundingBox()
        return geometry;
    }
}