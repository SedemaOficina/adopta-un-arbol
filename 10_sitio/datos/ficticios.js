/* Configuracion de la maqueta. Ninguna direccion va escrita en el codigo: todas viven aqui.
   null = liga pendiente; la maqueta la muestra como "Falta el dato". */
window.CONFIG = {
  "URL_BASE": "https://ejemplo.local/guardianes/",
  "URL_ARBOLADO_CIUDADANO": "https://sedemaoficina.github.io/Arbolado-Ciudadano/",
  "URL_PATRIMONIALES": "https://sedema.sia.cdmx.gob.mx/arboles-patrimoniales/",
  "URL_REFORESTACION": null,
  "URL_DENUNCIA": null,
  "CORTE_INVENTARIO": "enero de 2026"
};

/* Datos ficticios (es_ficticio = true en cada registro). Para pasar a datos reales se sustituye
   este archivo por la extraccion por colonia, con el mismo esquema. */
window.DATOS = {
 "aviso": "DATOS FICTICIOS para la maqueta. Mismo esquema que la capa arbolado_cdmx_sep mas campos derivados (colonia_id, calle, patrimonial_id) y campos previstos para la segunda etapa del inventario (especie, nativa, altura, diametro, condicion).",
 "promedio_ciudad": {
  "temp_c": 38.2,
  "copa_pct": 16.0,
  "ndvi": 0.31
 },
 "colonias": [
  {
   "colonia_id": 9001,
   "colonia": "Las Jacarandas",
   "cp": "00901",
   "alcaldia": "Alcaldía de ejemplo",
   "inventario": true,
   "temp_c": 41.6,
   "copa_pct": 8.0,
   "ndvi": 0.18,
   "calles_programa": 2,
   "plantados_2026": 36,
   "bbox": {
    "lat0": 19.36,
    "lat1": 19.364,
    "lng0": -99.172,
    "lng1": -99.167
   },
   "calles_h": [
    [
     0.8,
     "Calle Truenos"
    ],
    [
     0.5,
     "Calle Ahuehuetes"
    ],
    [
     0.2,
     "Avenida de los Antiguos Jardineros del Pedregal de San Ángel"
    ]
   ],
   "calles_v": [
    [
     0.15,
     "Calle Colorín"
    ],
    [
     0.5,
     "Calle Tabachín"
    ],
    [
     0.85,
     null
    ]
   ]
  },
  {
   "colonia_id": 9002,
   "colonia": "Valle de los Fresnos",
   "cp": "00902",
   "alcaldia": "Alcaldía de ejemplo",
   "inventario": true,
   "temp_c": 35.9,
   "copa_pct": 27.0,
   "ndvi": 0.44,
   "calles_programa": 0,
   "plantados_2026": 0,
   "bbox": {
    "lat0": 19.37,
    "lat1": 19.374,
    "lng0": -99.165,
    "lng1": -99.16
   }
  },
  {
   "colonia_id": 9003,
   "colonia": "Pueblo de Tepozanes",
   "cp": "00903",
   "alcaldia": "Alcaldía de ejemplo",
   "inventario": false,
   "temp_c": 39.4,
   "copa_pct": 12.5,
   "ndvi": 0.27,
   "calles_programa": 1,
   "plantados_2026": 0,
   "bbox": null
  }
 ],
 "arboles": {
  "type": "FeatureCollection",
  "name": "arbolado_ficticio",
  "features": [
   {
    "type": "Feature",
    "geometry": {
     "type": "Point",
     "coordinates": [
      -99.17175,
      19.36346
     ]
    },
    "properties": {
     "fid": 900001,
     "idc": "EJM-001-0001",
     "uuid": "292cf2d9-e5fb-53ee-b3b6-27153a2c51c2",
     "lat": 19.36346,
     "lng": -99.17175,
     "registro": "Árbol",
     "alcaldia": "Alcaldía de ejemplo",
     "uga": "EJM-001",
     "pano_id": "EJEMPLO-0001",
     "pano_date": "2026-01",
     "pano_url": "#liga-de-ejemplo",
     "colonia_id": 9001,
     "calle": "Calle Truenos",
     "patrimonial_id": null,
     "especie_comun": null,
     "especie_cientifica": null,
     "nativa": null,
     "altura_m": null,
     "diametro_cm": null,
     "condicion": null,
     "fecha_levantamiento": "2026-01",
     "es_ficticio": true
    }
   },
   {
    "type": "Feature",
    "geometry": {
     "type": "Point",
     "coordinates": [
      -99.1705,
      19.36346
     ]
    },
    "properties": {
     "fid": 900002,
     "idc": "EJM-001-0002",
     "uuid": "3460f21e-de74-5ca6-bcfb-5199fac181ad",
     "lat": 19.36346,
     "lng": -99.1705,
     "registro": "Árbol",
     "alcaldia": "Alcaldía de ejemplo",
     "uga": "EJM-001",
     "pano_id": "EJEMPLO-0002",
     "pano_date": "2026-01",
     "pano_url": "#liga-de-ejemplo",
     "colonia_id": 9001,
     "calle": "Calle Truenos",
     "patrimonial_id": null,
     "especie_comun": null,
     "especie_cientifica": null,
     "nativa": null,
     "altura_m": null,
     "diametro_cm": null,
     "condicion": null,
     "fecha_levantamiento": "2026-01",
     "es_ficticio": true
    }
   },
   {
    "type": "Feature",
    "geometry": {
     "type": "Point",
     "coordinates": [
      -99.17,
      19.36294
     ]
    },
    "properties": {
     "fid": 900003,
     "idc": "EJM-001-0003",
     "uuid": "9b80cedc-eb52-59e2-bf9c-3399ea946fb8",
     "lat": 19.36294,
     "lng": -99.17,
     "registro": "Cepa Vacante",
     "alcaldia": "Alcaldía de ejemplo",
     "uga": "EJM-001",
     "pano_id": "EJEMPLO-0003",
     "pano_date": "2026-01",
     "pano_url": "#liga-de-ejemplo",
     "colonia_id": 9001,
     "calle": "Calle Truenos",
     "patrimonial_id": null,
     "especie_comun": null,
     "especie_cientifica": null,
     "nativa": null,
     "altura_m": null,
     "diametro_cm": null,
     "condicion": null,
     "fecha_levantamiento": "2026-01",
     "es_ficticio": true
    }
   },
   {
    "type": "Feature",
    "geometry": {
     "type": "Point",
     "coordinates": [
      -99.1689,
      19.36346
     ]
    },
    "properties": {
     "fid": 900004,
     "idc": "EJM-001-0004",
     "uuid": "ee0c7468-73d0-59d8-be76-6db4e9216ad8",
     "lat": 19.36346,
     "lng": -99.1689,
     "registro": "Árbol",
     "alcaldia": "Alcaldía de ejemplo",
     "uga": "EJM-001",
     "pano_id": "EJEMPLO-0004",
     "pano_date": "2026-01",
     "pano_url": "#liga-de-ejemplo",
     "colonia_id": 9001,
     "calle": "Calle Truenos",
     "patrimonial_id": null,
     "especie_comun": null,
     "especie_cientifica": null,
     "nativa": null,
     "altura_m": null,
     "diametro_cm": null,
     "condicion": null,
     "fecha_levantamiento": "2026-01",
     "es_ficticio": true
    }
   },
   {
    "type": "Feature",
    "geometry": {
     "type": "Point",
     "coordinates": [
      -99.1683,
      19.36294
     ]
    },
    "properties": {
     "fid": 900005,
     "idc": "EJM-001-0005",
     "uuid": "46ff63e2-ad01-597b-8632-9baf8e829280",
     "lat": 19.36294,
     "lng": -99.1683,
     "registro": "Árbol Muerto",
     "alcaldia": "Alcaldía de ejemplo",
     "uga": "EJM-001",
     "pano_id": "EJEMPLO-0005",
     "pano_date": "2026-01",
     "pano_url": "#liga-de-ejemplo",
     "colonia_id": 9001,
     "calle": "Calle Truenos",
     "patrimonial_id": null,
     "especie_comun": null,
     "especie_cientifica": null,
     "nativa": null,
     "altura_m": null,
     "diametro_cm": null,
     "condicion": null,
     "fecha_levantamiento": "2026-01",
     "es_ficticio": true
    }
   },
   {
    "type": "Feature",
    "geometry": {
     "type": "Point",
     "coordinates": [
      -99.16725,
      19.36346
     ]
    },
    "properties": {
     "fid": 900006,
     "idc": "EJM-001-0006",
     "uuid": "faab84df-4821-5597-abd3-b856e44ed52d",
     "lat": 19.36346,
     "lng": -99.16725,
     "registro": "Árbol",
     "alcaldia": "Alcaldía de ejemplo",
     "uga": "EJM-001",
     "pano_id": "EJEMPLO-0006",
     "pano_date": "2026-01",
     "pano_url": "#liga-de-ejemplo",
     "colonia_id": 9001,
     "calle": "Calle Truenos",
     "patrimonial_id": null,
     "especie_comun": null,
     "especie_cientifica": null,
     "nativa": null,
     "altura_m": null,
     "diametro_cm": null,
     "condicion": null,
     "fecha_levantamiento": "2026-01",
     "es_ficticio": true
    }
   },
   {
    "type": "Feature",
    "geometry": {
     "type": "Point",
     "coordinates": [
      -99.17075,
      19.36226
     ]
    },
    "properties": {
     "fid": 900007,
     "idc": "EJM-001-0007",
     "uuid": "555c5b9b-f2d1-50fa-b200-8fa6008317bd",
     "lat": 19.36226,
     "lng": -99.17075,
     "registro": "Árbol",
     "alcaldia": "Alcaldía de ejemplo",
     "uga": "EJM-001",
     "pano_id": "EJEMPLO-0007",
     "pano_date": "2026-01",
     "pano_url": "#liga-de-ejemplo",
     "colonia_id": 9001,
     "calle": "Calle Ahuehuetes",
     "patrimonial_id": "AP-EJEMPLO-01",
     "especie_comun": null,
     "especie_cientifica": null,
     "nativa": null,
     "altura_m": null,
     "diametro_cm": null,
     "condicion": null,
     "fecha_levantamiento": "2026-01",
     "es_ficticio": true
    }
   },
   {
    "type": "Feature",
    "geometry": {
     "type": "Point",
     "coordinates": [
      -99.1701,
      19.36174
     ]
    },
    "properties": {
     "fid": 900008,
     "idc": "EJM-001-0008",
     "uuid": "160be52f-8524-58a1-8ce4-749a5eca69b4",
     "lat": 19.36174,
     "lng": -99.1701,
     "registro": "Cepa Vacante",
     "alcaldia": "Alcaldía de ejemplo",
     "uga": "EJM-001",
     "pano_id": "EJEMPLO-0008",
     "pano_date": "2026-01",
     "pano_url": "#liga-de-ejemplo",
     "colonia_id": 9001,
     "calle": "Calle Ahuehuetes",
     "patrimonial_id": null,
     "especie_comun": null,
     "especie_cientifica": null,
     "nativa": null,
     "altura_m": null,
     "diametro_cm": null,
     "condicion": null,
     "fecha_levantamiento": "2026-01",
     "es_ficticio": true
    }
   },
   {
    "type": "Feature",
    "geometry": {
     "type": "Point",
     "coordinates": [
      -99.1687,
      19.36226
     ]
    },
    "properties": {
     "fid": 900009,
     "idc": "EJM-001-0009",
     "uuid": "247a5f4a-16d1-59ba-9b8e-c5c1d58cc973",
     "lat": 19.36226,
     "lng": -99.1687,
     "registro": "Árbol",
     "alcaldia": "Alcaldía de ejemplo",
     "uga": "EJM-001",
     "pano_id": "EJEMPLO-0009",
     "pano_date": "2026-01",
     "pano_url": "#liga-de-ejemplo",
     "colonia_id": 9001,
     "calle": "Calle Ahuehuetes",
     "patrimonial_id": null,
     "especie_comun": null,
     "especie_cientifica": null,
     "nativa": null,
     "altura_m": null,
     "diametro_cm": null,
     "condicion": null,
     "fecha_levantamiento": "2026-01",
     "es_ficticio": true
    }
   },
   {
    "type": "Feature",
    "geometry": {
     "type": "Point",
     "coordinates": [
      -99.1681,
      19.36174
     ]
    },
    "properties": {
     "fid": 900010,
     "idc": "EJM-001-0010",
     "uuid": "1d567d1a-18d7-5ac1-b6d5-065514440593",
     "lat": 19.36174,
     "lng": -99.1681,
     "registro": "Tocón",
     "alcaldia": "Alcaldía de ejemplo",
     "uga": "EJM-001",
     "pano_id": "EJEMPLO-0010",
     "pano_date": "2026-01",
     "pano_url": "#liga-de-ejemplo",
     "colonia_id": 9001,
     "calle": "Calle Ahuehuetes",
     "patrimonial_id": null,
     "especie_comun": null,
     "especie_cientifica": null,
     "nativa": null,
     "altura_m": null,
     "diametro_cm": null,
     "condicion": null,
     "fecha_levantamiento": "2026-01",
     "es_ficticio": true
    }
   },
   {
    "type": "Feature",
    "geometry": {
     "type": "Point",
     "coordinates": [
      -99.1705,
      19.36054
     ]
    },
    "properties": {
     "fid": 900011,
     "idc": "EJM-001-0011",
     "uuid": "3b5d87cf-87e4-5f52-9d83-fde916d46273",
     "lat": 19.36054,
     "lng": -99.1705,
     "registro": "Árbol",
     "alcaldia": "Alcaldía de ejemplo",
     "uga": "EJM-001",
     "pano_id": "EJEMPLO-0011",
     "pano_date": "2026-01",
     "pano_url": "#liga-de-ejemplo",
     "colonia_id": 9001,
     "calle": "Avenida de los Antiguos Jardineros del Pedregal de San Ángel",
     "patrimonial_id": null,
     "especie_comun": null,
     "especie_cientifica": null,
     "nativa": null,
     "altura_m": null,
     "diametro_cm": null,
     "condicion": null,
     "fecha_levantamiento": "2026-01",
     "es_ficticio": true
    }
   },
   {
    "type": "Feature",
    "geometry": {
     "type": "Point",
     "coordinates": [
      -99.169,
      19.36106
     ]
    },
    "properties": {
     "fid": 900012,
     "idc": "EJM-001-0012",
     "uuid": "008deb01-ca4a-50b3-ad4c-9289984b52bb",
     "lat": 19.36106,
     "lng": -99.169,
     "registro": "Cepa Vacante",
     "alcaldia": "Alcaldía de ejemplo",
     "uga": "EJM-001",
     "pano_id": "EJEMPLO-0012",
     "pano_date": "2026-01",
     "pano_url": "#liga-de-ejemplo",
     "colonia_id": 9001,
     "calle": "Avenida de los Antiguos Jardineros del Pedregal de San Ángel",
     "patrimonial_id": null,
     "especie_comun": null,
     "especie_cientifica": null,
     "nativa": null,
     "altura_m": null,
     "diametro_cm": null,
     "condicion": null,
     "fecha_levantamiento": "2026-01",
     "es_ficticio": true
    }
   },
   {
    "type": "Feature",
    "geometry": {
     "type": "Point",
     "coordinates": [
      -99.171575,
      19.3626
     ]
    },
    "properties": {
     "fid": 900013,
     "idc": "EJM-001-0013",
     "uuid": "2d4e0719-8c49-55fb-b9dd-5cc1a044ecac",
     "lat": 19.3626,
     "lng": -99.171575,
     "registro": "Árbol",
     "alcaldia": "Alcaldía de ejemplo",
     "uga": "EJM-001",
     "pano_id": "EJEMPLO-0013",
     "pano_date": "2026-01",
     "pano_url": "#liga-de-ejemplo",
     "colonia_id": 9001,
     "calle": "Calle Colorín",
     "patrimonial_id": null,
     "especie_comun": null,
     "especie_cientifica": null,
     "nativa": null,
     "altura_m": null,
     "diametro_cm": null,
     "condicion": null,
     "fecha_levantamiento": "2026-01",
     "es_ficticio": true
    }
   },
   {
    "type": "Feature",
    "geometry": {
     "type": "Point",
     "coordinates": [
      -99.170925,
      19.36132
     ]
    },
    "properties": {
     "fid": 900014,
     "idc": "EJM-001-0014",
     "uuid": "70f4b451-729b-5eda-a895-3cb2d7a3a7bc",
     "lat": 19.36132,
     "lng": -99.170925,
     "registro": "Cepa Vacante",
     "alcaldia": "Alcaldía de ejemplo",
     "uga": "EJM-001",
     "pano_id": "EJEMPLO-0014",
     "pano_date": "2026-01",
     "pano_url": "#liga-de-ejemplo",
     "colonia_id": 9001,
     "calle": "Calle Colorín",
     "patrimonial_id": null,
     "especie_comun": null,
     "especie_cientifica": null,
     "nativa": null,
     "altura_m": null,
     "diametro_cm": null,
     "condicion": null,
     "fecha_levantamiento": "2026-01",
     "es_ficticio": true
    }
   },
   {
    "type": "Feature",
    "geometry": {
     "type": "Point",
     "coordinates": [
      -99.169175,
      19.36264
     ]
    },
    "properties": {
     "fid": 900015,
     "idc": "EJM-001-0015",
     "uuid": "dc610e00-3ea1-5270-8062-2ad6af8770c4",
     "lat": 19.36264,
     "lng": -99.169175,
     "registro": "Árbol",
     "alcaldia": "Alcaldía de ejemplo",
     "uga": "EJM-001",
     "pano_id": "EJEMPLO-0015",
     "pano_date": "2026-01",
     "pano_url": "#liga-de-ejemplo",
     "colonia_id": 9001,
     "calle": "Calle Tabachín",
     "patrimonial_id": null,
     "especie_comun": null,
     "especie_cientifica": null,
     "nativa": null,
     "altura_m": null,
     "diametro_cm": null,
     "condicion": null,
     "fecha_levantamiento": "2026-01",
     "es_ficticio": true
    }
   },
   {
    "type": "Feature",
    "geometry": {
     "type": "Point",
     "coordinates": [
      -99.169825,
      19.3614
     ]
    },
    "properties": {
     "fid": 900016,
     "idc": "EJM-001-0016",
     "uuid": "331e3cd6-e009-52f4-97b9-f1b1e99abd99",
     "lat": 19.3614,
     "lng": -99.169825,
     "registro": "Árbol Muerto",
     "alcaldia": "Alcaldía de ejemplo",
     "uga": "EJM-001",
     "pano_id": "EJEMPLO-0016",
     "pano_date": "2026-01",
     "pano_url": "#liga-de-ejemplo",
     "colonia_id": 9001,
     "calle": "Calle Tabachín",
     "patrimonial_id": null,
     "especie_comun": null,
     "especie_cientifica": null,
     "nativa": null,
     "altura_m": null,
     "diametro_cm": null,
     "condicion": null,
     "fecha_levantamiento": "2026-01",
     "es_ficticio": true
    }
   },
   {
    "type": "Feature",
    "geometry": {
     "type": "Point",
     "coordinates": [
      -99.167425,
      19.36248
     ]
    },
    "properties": {
     "fid": 900017,
     "idc": "EJM-001-0017",
     "uuid": "8e69c181-9b9e-5846-9b82-3982c7c45472",
     "lat": 19.36248,
     "lng": -99.167425,
     "registro": "Árbol",
     "alcaldia": "Alcaldía de ejemplo",
     "uga": "EJM-001",
     "pano_id": "EJEMPLO-0017",
     "pano_date": "2026-01",
     "pano_url": "#liga-de-ejemplo",
     "colonia_id": 9001,
     "calle": null,
     "patrimonial_id": null,
     "especie_comun": null,
     "especie_cientifica": null,
     "nativa": null,
     "altura_m": null,
     "diametro_cm": null,
     "condicion": null,
     "fecha_levantamiento": "2026-01",
     "es_ficticio": true
    }
   },
   {
    "type": "Feature",
    "geometry": {
     "type": "Point",
     "coordinates": [
      -99.168075,
      19.36128
     ]
    },
    "properties": {
     "fid": 900018,
     "idc": "EJM-001-0018",
     "uuid": "b6686e20-2b6c-51de-96f9-7e815c5a0ded",
     "lat": 19.36128,
     "lng": -99.168075,
     "registro": "Árbol",
     "alcaldia": "Alcaldía de ejemplo",
     "uga": "EJM-001",
     "pano_id": null,
     "pano_date": null,
     "pano_url": null,
     "colonia_id": 9001,
     "calle": null,
     "patrimonial_id": null,
     "especie_comun": null,
     "especie_cientifica": null,
     "nativa": null,
     "altura_m": null,
     "diametro_cm": null,
     "condicion": null,
     "fecha_levantamiento": "2026-01",
     "es_ficticio": true
    }
   },
   {
    "type": "Feature",
    "geometry": {
     "type": "Point",
     "coordinates": [
      -99.164,
      19.3732
     ]
    },
    "properties": {
     "fid": 900019,
     "idc": "EJM-002-0019",
     "uuid": "4708af2a-d1c4-57c7-964d-81d761964197",
     "lat": 19.3732,
     "lng": -99.164,
     "registro": "Árbol",
     "alcaldia": "Alcaldía de ejemplo",
     "uga": "EJM-002",
     "pano_id": "EJEMPLO-0019",
     "pano_date": "2026-01",
     "pano_url": "#liga-de-ejemplo",
     "colonia_id": 9002,
     "calle": "Calle Fresno",
     "patrimonial_id": null,
     "especie_comun": "Fresno",
     "especie_cientifica": "Fraxinus uhdei",
     "nativa": true,
     "altura_m": 9.5,
     "diametro_cm": 38,
     "condicion": "Buena",
     "fecha_levantamiento": "2027-03",
     "es_ficticio": true
    }
   },
   {
    "type": "Feature",
    "geometry": {
     "type": "Point",
     "coordinates": [
      -99.163,
      19.3732
     ]
    },
    "properties": {
     "fid": 900020,
     "idc": "EJM-002-0020",
     "uuid": "5379c969-497d-5fca-b38b-577b727fa2ee",
     "lat": 19.3732,
     "lng": -99.163,
     "registro": "Árbol",
     "alcaldia": "Alcaldía de ejemplo",
     "uga": "EJM-002",
     "pano_id": "EJEMPLO-0020",
     "pano_date": "2026-01",
     "pano_url": "#liga-de-ejemplo",
     "colonia_id": 9002,
     "calle": "Calle Fresno",
     "patrimonial_id": null,
     "especie_comun": "Jacaranda",
     "especie_cientifica": "Jacaranda mimosifolia",
     "nativa": false,
     "altura_m": 7.0,
     "diametro_cm": 30,
     "condicion": "Mala",
     "fecha_levantamiento": "2027-03",
     "es_ficticio": true
    }
   },
   {
    "type": "Feature",
    "geometry": {
     "type": "Point",
     "coordinates": [
      -99.162,
      19.3732
     ]
    },
    "properties": {
     "fid": 900021,
     "idc": "EJM-002-0021",
     "uuid": "abec8773-6aa6-503e-9b70-720d2caade7b",
     "lat": 19.3732,
     "lng": -99.162,
     "registro": "Árbol",
     "alcaldia": "Alcaldía de ejemplo",
     "uga": "EJM-002",
     "pano_id": "EJEMPLO-0021",
     "pano_date": "2026-01",
     "pano_url": "#liga-de-ejemplo",
     "colonia_id": 9002,
     "calle": "Calle Fresno",
     "patrimonial_id": null,
     "especie_comun": null,
     "especie_cientifica": null,
     "nativa": null,
     "altura_m": null,
     "diametro_cm": null,
     "condicion": null,
     "fecha_levantamiento": "2026-01",
     "es_ficticio": true
    }
   },
   {
    "type": "Feature",
    "geometry": {
     "type": "Point",
     "coordinates": [
      -99.161,
      19.3732
     ]
    },
    "properties": {
     "fid": 900022,
     "idc": "EJM-002-0022",
     "uuid": "d54e4111-7dd8-5ac1-aa17-64520f944c66",
     "lat": 19.3732,
     "lng": -99.161,
     "registro": "Cepa Vacante",
     "alcaldia": "Alcaldía de ejemplo",
     "uga": "EJM-002",
     "pano_id": "EJEMPLO-0022",
     "pano_date": "2026-01",
     "pano_url": "#liga-de-ejemplo",
     "colonia_id": 9002,
     "calle": "Calle Fresno",
     "patrimonial_id": null,
     "especie_comun": null,
     "especie_cientifica": null,
     "nativa": null,
     "altura_m": null,
     "diametro_cm": null,
     "condicion": null,
     "fecha_levantamiento": "2026-01",
     "es_ficticio": true
    }
   },
   {
    "type": "Feature",
    "geometry": {
     "type": "Point",
     "coordinates": [
      -99.164,
      19.372
     ]
    },
    "properties": {
     "fid": 900023,
     "idc": "EJM-002-0023",
     "uuid": "1eaaea6c-ff4e-5016-b042-edd878e55813",
     "lat": 19.372,
     "lng": -99.164,
     "registro": "Árbol",
     "alcaldia": "Alcaldía de ejemplo",
     "uga": "EJM-002",
     "pano_id": "EJEMPLO-0023",
     "pano_date": "2026-01",
     "pano_url": "#liga-de-ejemplo",
     "colonia_id": 9002,
     "calle": "Calle Sauce",
     "patrimonial_id": null,
     "especie_comun": null,
     "especie_cientifica": null,
     "nativa": null,
     "altura_m": null,
     "diametro_cm": null,
     "condicion": null,
     "fecha_levantamiento": "2026-01",
     "es_ficticio": true
    }
   },
   {
    "type": "Feature",
    "geometry": {
     "type": "Point",
     "coordinates": [
      -99.163,
      19.372
     ]
    },
    "properties": {
     "fid": 900024,
     "idc": "EJM-002-0024",
     "uuid": "5912b0a5-cad8-5bf4-828e-f5d306f6c806",
     "lat": 19.372,
     "lng": -99.163,
     "registro": "Árbol",
     "alcaldia": "Alcaldía de ejemplo",
     "uga": "EJM-002",
     "pano_id": "EJEMPLO-0024",
     "pano_date": "2026-01",
     "pano_url": "#liga-de-ejemplo",
     "colonia_id": 9002,
     "calle": "Calle Sauce",
     "patrimonial_id": null,
     "especie_comun": null,
     "especie_cientifica": null,
     "nativa": null,
     "altura_m": null,
     "diametro_cm": null,
     "condicion": null,
     "fecha_levantamiento": "2026-01",
     "es_ficticio": true
    }
   },
   {
    "type": "Feature",
    "geometry": {
     "type": "Point",
     "coordinates": [
      -99.162,
      19.372
     ]
    },
    "properties": {
     "fid": 900025,
     "idc": "EJM-002-0025",
     "uuid": "09496ddd-3991-5750-a63e-692810c3bacd",
     "lat": 19.372,
     "lng": -99.162,
     "registro": "Árbol",
     "alcaldia": "Alcaldía de ejemplo",
     "uga": "EJM-002",
     "pano_id": "EJEMPLO-0025",
     "pano_date": "2026-01",
     "pano_url": "#liga-de-ejemplo",
     "colonia_id": 9002,
     "calle": "Calle Sauce",
     "patrimonial_id": null,
     "especie_comun": null,
     "especie_cientifica": null,
     "nativa": null,
     "altura_m": null,
     "diametro_cm": null,
     "condicion": null,
     "fecha_levantamiento": "2026-01",
     "es_ficticio": true
    }
   },
   {
    "type": "Feature",
    "geometry": {
     "type": "Point",
     "coordinates": [
      -99.161,
      19.372
     ]
    },
    "properties": {
     "fid": 900026,
     "idc": "EJM-002-0026",
     "uuid": "63063fff-83e6-5e97-9a1e-c4713b3e50c6",
     "lat": 19.372,
     "lng": -99.161,
     "registro": "Tocón",
     "alcaldia": "Alcaldía de ejemplo",
     "uga": "EJM-002",
     "pano_id": "EJEMPLO-0026",
     "pano_date": "2026-01",
     "pano_url": "#liga-de-ejemplo",
     "colonia_id": 9002,
     "calle": "Calle Sauce",
     "patrimonial_id": null,
     "especie_comun": null,
     "especie_cientifica": null,
     "nativa": null,
     "altura_m": null,
     "diametro_cm": null,
     "condicion": null,
     "fecha_levantamiento": "2026-01",
     "es_ficticio": true
    }
   },
   {
    "type": "Feature",
    "geometry": {
     "type": "Point",
     "coordinates": [
      -99.164,
      19.3708
     ]
    },
    "properties": {
     "fid": 900027,
     "idc": "EJM-002-0027",
     "uuid": "c80d4a39-327a-5fdf-92af-5dee25bcc2fb",
     "lat": 19.3708,
     "lng": -99.164,
     "registro": "Árbol",
     "alcaldia": "Alcaldía de ejemplo",
     "uga": "EJM-002",
     "pano_id": "EJEMPLO-0027",
     "pano_date": "2026-01",
     "pano_url": "#liga-de-ejemplo",
     "colonia_id": 9002,
     "calle": "Calle Ocote",
     "patrimonial_id": null,
     "especie_comun": null,
     "especie_cientifica": null,
     "nativa": null,
     "altura_m": null,
     "diametro_cm": null,
     "condicion": null,
     "fecha_levantamiento": "2026-01",
     "es_ficticio": true
    }
   },
   {
    "type": "Feature",
    "geometry": {
     "type": "Point",
     "coordinates": [
      -99.163,
      19.3708
     ]
    },
    "properties": {
     "fid": 900028,
     "idc": "EJM-002-0028",
     "uuid": "ccf4b941-7d10-5c1b-992b-f0410b717837",
     "lat": 19.3708,
     "lng": -99.163,
     "registro": "Árbol",
     "alcaldia": "Alcaldía de ejemplo",
     "uga": "EJM-002",
     "pano_id": "EJEMPLO-0028",
     "pano_date": "2026-01",
     "pano_url": "#liga-de-ejemplo",
     "colonia_id": 9002,
     "calle": "Calle Ocote",
     "patrimonial_id": null,
     "especie_comun": null,
     "especie_cientifica": null,
     "nativa": null,
     "altura_m": null,
     "diametro_cm": null,
     "condicion": null,
     "fecha_levantamiento": "2026-01",
     "es_ficticio": true
    }
   },
   {
    "type": "Feature",
    "geometry": {
     "type": "Point",
     "coordinates": [
      -99.162,
      19.3708
     ]
    },
    "properties": {
     "fid": 900029,
     "idc": "EJM-002-0029",
     "uuid": "201c49dc-b4b8-52b9-b87a-7818bbe66c87",
     "lat": 19.3708,
     "lng": -99.162,
     "registro": "Cepa Vacante",
     "alcaldia": "Alcaldía de ejemplo",
     "uga": "EJM-002",
     "pano_id": "EJEMPLO-0029",
     "pano_date": "2026-01",
     "pano_url": "#liga-de-ejemplo",
     "colonia_id": 9002,
     "calle": "Calle Ocote",
     "patrimonial_id": null,
     "especie_comun": null,
     "especie_cientifica": null,
     "nativa": null,
     "altura_m": null,
     "diametro_cm": null,
     "condicion": null,
     "fecha_levantamiento": "2026-01",
     "es_ficticio": true
    }
   },
   {
    "type": "Feature",
    "geometry": {
     "type": "Point",
     "coordinates": [
      -99.161,
      19.3708
     ]
    },
    "properties": {
     "fid": 900030,
     "idc": "EJM-002-0030",
     "uuid": "675ce0ae-7e91-59d2-a7b9-ac0a78ebc01d",
     "lat": 19.3708,
     "lng": -99.161,
     "registro": "Árbol",
     "alcaldia": "Alcaldía de ejemplo",
     "uga": "EJM-002",
     "pano_id": "EJEMPLO-0030",
     "pano_date": "2026-01",
     "pano_url": "#liga-de-ejemplo",
     "colonia_id": 9002,
     "calle": "Calle Ocote",
     "patrimonial_id": null,
     "especie_comun": null,
     "especie_cientifica": null,
     "nativa": null,
     "altura_m": null,
     "diametro_cm": null,
     "condicion": null,
     "fecha_levantamiento": "2026-01",
     "es_ficticio": true
    }
   }
  ]
 }
};
