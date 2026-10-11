"""Paso 1. Lee el inventario de arbolado del CIGA-UNAM (CSV) y lo guarda en formato rápido para los demás scripts.
Entrada: 00_insumos/arbolado/arbolado_cdmx_sep.csv  ->  Salida: 00_insumos/intermedios/inv.pkl"""
import pandas as pd
from rutas import ARBOLADO_CSV, INV_PKL, exigir

exigir(ARBOLADO_CSV)
COLS = ['fid', 'idc', 'uuid', 'lat', 'lng', 'registro', 'alcaldia', 'uga', 'pano_id', 'pano_date', 'pano_url']
df = pd.read_csv(ARBOLADO_CSV, usecols=COLS, dtype={'pano_date': 'string'})
df['pano_date'] = df['pano_date'].fillna('sin fecha').astype(str)
for c in ['idc', 'uuid', 'registro', 'alcaldia', 'uga', 'pano_id', 'pano_url']:
    df[c] = df[c].astype(str)
INV_PKL.parent.mkdir(parents=True, exist_ok=True)
df.to_pickle(INV_PKL)
print('registros', len(df), '|', df.registro.value_counts().to_dict())
