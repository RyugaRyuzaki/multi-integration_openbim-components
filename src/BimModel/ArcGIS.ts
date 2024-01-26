import { Disposable } from "./types";
import * as THREE from "three";
import * as externalRenderers from "@arcgis/core/views/3d/externalRenderers";
import Map from "@arcgis/core/Map";
import SceneView from "@arcgis/core/views/SceneView";
import config from "@arcgis/core/config";
import SpatialReference from "@arcgis/core/geometry/SpatialReference"
import Point from "@arcgis/core/geometry/Point"
import { FragmentModel } from "./FragmentModel";

export class ArcGIS implements Disposable {

    private renderer?: THREE.WebGLRenderer;
    private scene: THREE.Scene = new THREE.Scene();
    private camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera();
    private ambient: THREE.AmbientLight = new THREE.AmbientLight( 0xffffff, 0.5 );
    private sun: THREE.DirectionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
    private sceneView!: SceneView
    fragmentModel!: FragmentModel

    /**
     *
     */
    constructor( private rootContainer: HTMLDivElement ) {
        this.initView()
    }
    async dispose( context?: any ) {
        this.scene.remove( this.ambient );
        this.scene.remove( this.sun );
        this.ambient.dispose();
        this.sun.dispose();
        this.renderer!.dispose();
        this.fragmentModel?.dispose()
        this.sceneView.destroy()
    }

    private initView() {
        config.apiKey = import.meta.env.VITE_ARCGIS_APIKEY;
        const map = new Map( {
            basemap: "arcgis-topographic",
            ground: "world-elevation"
        } );
        this.rootContainer.setAttribute( "data-testid", "arcgis_element" )
        this.sceneView = new SceneView( {
            container: this.rootContainer,
            map: map,
            viewingMode: "global",
            camera: {
                // ??
                position: {
                    x: -9932671,
                    y: 2380007,
                    z: 1687219,
                    spatialReference: { wkid: 102100 }
                },
                heading: 0,
                tilt: 35
            },

        } );
        this.fragmentModel = new FragmentModel( this.scene )
        //@ts-ignore
        this.sceneView.environment.lighting!.cameraTrackingEnabled = false;
    }
    public start(): void {
        externalRenderers.add( this.sceneView, this );
    }

    public setup( context?: any ): void {

        if ( !context ) {
            throw new Error( "no context passed to setup, cannot work that way" );
        }

        this.renderer = new THREE.WebGLRenderer( {
            context: context.gl,
            premultipliedAlpha: false,
            preserveDrawingBuffer: true,
        } );
        this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.setViewport( 0, 0, context.view.width, context.view.height );
        this.renderer.autoClear = false;

        // setup scene lighting
        this.scene.add( this.ambient );
        this.scene.add( this.sun );
        this.setUpModel( context )
        context.resetWebGLState();

    }
    public render( context?: any ): void {
        this.camera.position.set( context.camera.eye[0], context.camera.eye[1], context.camera.eye[2] );
        this.camera.up.set( context.camera.up[0], context.camera.up[1], context.camera.up[2] );
        this.camera.lookAt(
            new THREE.Vector3( context.camera.center[0], context.camera.center[1], context.camera.center[2] )
        );

        this.camera.projectionMatrix.fromArray( context.camera.projectionMatrix );

        const sunLight = context.sunLight;
        this.sun.position.set(
            sunLight.direction[0],
            sunLight.direction[1],
            sunLight.direction[2]
        );
        this.sun.intensity = sunLight.diffuse.intensity;
        this.sun.color = new THREE.Color(
            sunLight.diffuse.color[0],
            sunLight.diffuse.color[1],
            sunLight.diffuse.color[2]
        );

        this.ambient.intensity = sunLight.ambient.intensity;
        this.ambient.color = new THREE.Color(
            sunLight.ambient.color[0],
            sunLight.ambient.color[1],
            sunLight.ambient.color[2]
        );


        this.renderer!.resetState();
        context.bindRenderTarget();
        this.renderer!.render( this.scene, this.camera );

        externalRenderers.requestRender( context.view );

        context.resetWebGLState();
    }
    private setUpModel( context: any ) {
        const WGS84Position = [10.544538805374891, 46.50861247649143, 0];

        context.view.goTo( {
            target: [WGS84Position[0], WGS84Position[1]],
            zoom: 14,
        } );

        context.view.map.ground.queryElevation( new Point( {
            longitude: WGS84Position[0],
            latitude: WGS84Position[1]
        } ), {
            returnSampleInfo: true
        } ).then( ( result: any ) => {
            const elevation: number = result.geometry.z;
            WGS84Position[2] = elevation;

            const transformation = new Array( 16 );
            externalRenderers.renderCoordinateTransformAt( context.view, WGS84Position, SpatialReference.WGS84, transformation );
            this.fragmentModel.updateMatrixArcGIS( transformation )
        } ).catch( ( error: any ) => {
            console.error( "Failed to query elevation:", error );
        } );
    }
}

