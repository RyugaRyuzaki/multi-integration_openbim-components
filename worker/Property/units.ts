import * as WEBIFC from "web-ifc";

export class Units {
  private readonly UnitSymbol = {
    "MILLI METRE": "mm",
    METRE: "m",
    SQUARE_METRE: "m²",
    CUBIC_METRE: "m³",
    "KILO GRAM": "kg",
    FOOT: "ft",
    "SQUARE FOOT": "ft²",
    "CUBIC FOOT": "ft³",
  };
  private readonly UnitScale = {
    MILLI: 0.001,
    CENTI: 0.01,
    DECI: 0.1,
    NONE: 1,
    DECA: 10,
    HECTO: 100,
    KILO: 1000,
  };
  units = {}

  setUp( webIfc: WEBIFC.IfcAPI ) {
    this.getAllUnits( webIfc )
  }
  factor = 1;
  private getAllUnits( webIfc: WEBIFC.IfcAPI ) {
    try {
      const allUnitsAssigns = webIfc.GetLineIDsWithType( 0, WEBIFC.IFCUNITASSIGNMENT );
      const unitsAssign = allUnitsAssigns.get( 0 );
      const unitsAssignProps = webIfc.GetLine( 0, unitsAssign );
      for ( const units of unitsAssignProps.Units ) {
        if ( !units || units.value === null || units.value === undefined ) {
          continue;
        }
        let mType;
        const unitsProps = webIfc.GetLine( 0, units.value );
        const pstrUoM = unitsProps.Prefix ? unitsProps.Prefix.value + " " : "";
        const strUoM = pstrUoM + unitsProps.Name?.value || "";
        if ( unitsProps.UnitType && unitsProps.UnitType.value ) {
          switch ( unitsProps.UnitType.value ) {
            case "MASSUNIT":
              mType = "mass";
              break;
            case "LENGTHUNIT":
              if ( unitsProps.Name.value ) {
                let factor = 1;
                let unitValue = 1;
                if ( unitsProps.Name.value === "METRE" ) unitValue = 1;
                if ( unitsProps.Name.value === "FOOT" ) unitValue = 0.3048;
                if ( unitsProps.Prefix?.value === "MILLI" ) factor = 0.001;
                this.factor = unitValue * factor
              }
              mType = "length";
              break;
            case "AREAUNIT":
              mType = "area";
              break;
            case "VOLUMEUNIT":
              mType = "volume";
              break;
            default:
              break;
          }
          let scale;
          if ( unitsProps.Prefix === null || unitsProps.Prefix === undefined ) scale = this.UnitScale.NONE;
          else scale = this.UnitScale[unitsProps.Prefix.value];
          if ( mType ) {
            this.units[mType] = {
              name: strUoM,
              symbol: this.UnitSymbol[strUoM],
              scale: scale,
            };
          }


        }
      }
    } catch ( e ) {
      console.log( e );
      console.log( "Could not get units" );
    }
  }




}
