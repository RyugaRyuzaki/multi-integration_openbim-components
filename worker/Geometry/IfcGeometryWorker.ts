import { GeometryLoader, IfcGeometries } from "./GeometryLoader"

const geometryLoader = new GeometryLoader()
self.onmessage = async ( e: any ) => {
  const dataArray = e.data
  const before = performance.now()
  const items = await geometryLoader.readIfcFile( dataArray )
  console.log( `${( performance.now() - before ) / 1000}s` );
  self.postMessage( items )
}