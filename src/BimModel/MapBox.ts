import * as THREE from "three";
import { NoToneMapping, VSMShadowMap, } from "three";
import * as MAPBOX from "mapbox-gl";
import { CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { Disposable } from "./types";
import { FragmentModel } from "./FragmentModel";


export const defaultInitialState: MapboxState = {
    pitch: 60,
    bearing: -300,
    zoom: 18,
    center: [8.5523926, 47.4133122],
    style: 'mapbox://styles/mapbox/streets-v12',
    antialias: true,
    maxZoom: 60,
    minZoom: 3,
};
/**
 * Default state 
 */
export interface MapboxState {
    pitch: number;
    bearing: number;
    zoom: number | null;
    center: number[];
    style: string;
    antialias: boolean;
    maxZoom?: number | null;
    minZoom?: number | null;
}
export class MapBox implements Disposable {
    map: MAPBOX.Map | null;
    // parameters to ensure the model is georeferenced correctly on the map
    // https://docs.mapbox.com/mapbox-gl-js/example/add-3d-model/
    private _modelOrigin!: number[]
    private _modelRotate: number[] = [Math.PI / 2, 0, 0]
    private _modelAsMercatorCoordinate: any
    private _modelTransform!: {
        translateX: number;
        translateY: number;
        translateZ: number;
        rotateX: number;
        rotateY: number;
        rotateZ: number;
        scale: number;
    };

    /**
     *
     */
    camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera();
    renderer!: THREE.WebGLRenderer
    labelRenderer: CSS2DRenderer = new CSS2DRenderer();

    private readonly accessToken = import.meta.env.VITE_MAPBOX_TOKEN
    private readonly scene: THREE.Scene = new THREE.Scene()
    fragmentModel!: FragmentModel
    get mapCamera(): THREE.Matrix4 {
        const rotationX = new THREE.Matrix4().makeRotationAxis(
            new THREE.Vector3( 1, 0, 0 ),
            this._modelTransform.rotateX
        );
        const rotationY = new THREE.Matrix4().makeRotationAxis(
            new THREE.Vector3( 0, 1, 0 ),
            this._modelTransform.rotateY
        );
        const rotationZ = new THREE.Matrix4().makeRotationAxis(
            new THREE.Vector3( 0, 0, 1 ),
            this._modelTransform.rotateZ
        );
        return new THREE.Matrix4()
            .makeTranslation(
                this._modelTransform.translateX,
                this._modelTransform.translateY,
                this._modelTransform.translateZ as number
            )
            .scale(
                new THREE.Vector3(
                    this._modelTransform.scale,
                    -this._modelTransform.scale,
                    this._modelTransform.scale
                )
            )
            .multiply( rotationX )
            .multiply( rotationY )
            .multiply( rotationZ );
    }
    constructor( private container: HTMLDivElement, initialState = defaultInitialState ) {
        this.map = new MAPBOX.Map( { container: this.container, accessToken: this.accessToken, ...initialState } )
        this.map.rotateTo( Math.PI / 2 )
        this.addDefaultLayer()
        this.initialModelTransform( initialState.center )
        this.setupMap()
        this.fragmentModel = new FragmentModel( this.scene )
    }
    async dispose() {
        window.removeEventListener( "resize", this.updateLabelRendererSize );
        this.renderer.dispose();
        this.labelRenderer.domElement.remove()
        this.fragmentModel?.dispose()
        this.map.remove()
        this.map = null
    }

    private initialModelTransform( center: number[] ) {
        // parameters to ensure the model is georeferenced correctly on the map
        this._modelOrigin = [...center]
        this._modelAsMercatorCoordinate = MAPBOX.MercatorCoordinate.fromLngLat(
            { lng: center[0], lat: center[1] },
            0
        );

        // transformation parameters to position, rotate and scale the 3D model onto the map
        this._modelTransform = {
            translateX: this._modelAsMercatorCoordinate.x,
            translateY: this._modelAsMercatorCoordinate.y,
            translateZ: this._modelAsMercatorCoordinate.z,
            rotateX: this._modelRotate[0],
            rotateY: this._modelRotate[1],
            rotateZ: this._modelRotate[2],
            /* Since the 3D model is in real world meters, a scale transform needs to be
            * applied since the CustomLayerInterface expects units in MercatorCoordinates.
            */
            scale: this._modelAsMercatorCoordinate.meterInMercatorCoordinateUnits()
        };
    }
    /**
     * Add default layers
     */
    private addDefaultLayer() {
        this.map.on( "load", () => {
            const layers = this.map.getStyle().layers as any[];
            const labelLayerId = layers.find(
                ( layer ) => layer.type === "symbol" && layer.layout["text-field"]
            ).id;
            // using box for all building
            this.map.addLayer(
                {
                    id: "add-3d-buildings",
                    source: "composite",
                    "source-layer": "building",
                    filter: ["==", "extrude", "true"],
                    type: "fill-extrusion",
                    minzoom: 15,
                    paint: {
                        "fill-extrusion-color": "#aaa",

                        // Use an 'interpolate' expression to
                        // add a smooth transition effect to
                        // the buildings as the user zooms in.
                        "fill-extrusion-height": [
                            "interpolate",
                            ["linear"],
                            ["zoom"],
                            15,
                            0,
                            15.05,
                            ["get", "height"],
                        ],
                        "fill-extrusion-base": [
                            "interpolate",
                            ["linear"],
                            ["zoom"],
                            15,
                            0,
                            15.05,
                            ["get", "min_height"],
                        ],
                        "fill-extrusion-opacity": 0.6,
                    },
                },
                labelLayerId
            );
        } );
    }

    /**
     * 
     * @param map 
     * @param gl //https://docs.mapbox.com/mapbox-gl-js/example/add-3d-model/
     */
    private onAdd = ( map: any, gl: any ) => {
        // create two three.js lights to illuminate the model
        const directionalLight = new THREE.DirectionalLight( 0xffffff );
        directionalLight.position.set( 0, -70, 100 ).normalize();
        this.scene.add( directionalLight );
        const directionalLight2 = new THREE.DirectionalLight( 0xffffff );
        directionalLight2.position.set( 0, 70, 100 ).normalize();
        this.scene.add( directionalLight2 );
        // use the Mapbox GL JS map canvas for three.js
        const canvas = map.getCanvas() as HTMLCanvasElement
        canvas.style.width = "100%"
        canvas.style.height = "100%"
        canvas.style.zIndex = "2"

        this.renderer = new THREE.WebGLRenderer( {
            canvas: map.getCanvas(),
            context: gl,
            antialias: true
        } );
        this.renderer.autoClear = false;
        this.renderer.outputColorSpace = "srgb";
        this.renderer.localClippingEnabled = true;
        this.renderer.toneMapping = NoToneMapping;
        this.renderer.toneMappingExposure = 1;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = VSMShadowMap;
        this.renderer.shadowMap.autoUpdate = false;
        this.renderer.shadowMap.needsUpdate = true;
        this.renderer.autoClearStencil = false;

        this.initializeLabelRenderer()
    }


    private render = ( _gl: any, matrix: number[] ) => {
        const m = new THREE.Matrix4().fromArray( matrix );
        this.camera.projectionMatrix = m.multiply( this.mapCamera );
        this.renderer.resetState();
        this.renderer.render( this.scene, this.camera );
        this.labelRenderer.render( this.scene, this.camera );
        this.map.triggerRepaint();
    }

    /**
  * initializeLabelRenderer , if help add label HTML div...
  */
    private initializeLabelRenderer() {
        this.updateLabelRendererSize();
        window.addEventListener( "resize", this.updateLabelRendererSize );
        this.labelRenderer.domElement.style.position = "absolute";
        this.labelRenderer.domElement.style.top = "0px";
        this.labelRenderer.domElement.style.zIndex = "1";
        this.labelRenderer.setSize(
            this.renderer.domElement.clientWidth,
            this.renderer.domElement.clientHeight
        );
        this.renderer?.domElement.parentElement?.appendChild( this.labelRenderer.domElement );
    }
    /**
   * resize window
   */
    private updateLabelRendererSize = () => {
        if ( this.renderer?.domElement ) {
            this.labelRenderer.setSize(
                this.renderer.domElement.clientWidth,
                this.renderer.domElement.clientHeight
            );
        }
    };
    private setupMap() {
        // add custom layer
        //https://docs.mapbox.com/mapbox-gl-js/example/add-3d-model/

        const customLayer = {
            id: "3d-model",
            type: "custom",
            renderingMode: "3d",
            onAdd: this.onAdd,
            render: this.render,
        }
        this.map.on( "style.load", () => {
            this.map.addLayer( customLayer, "waterway-label" );
        } );
        this.map.addControl( new MAPBOX.NavigationControl( {
            visualizePitch: true,
        } ), 'bottom-right' );
    }

}