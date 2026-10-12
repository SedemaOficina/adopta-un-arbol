"""Nombres de colonia para mostrar (auditoría de v30, 12 oct 2026). El catálogo de SEDEMA trae los nombres sin acentos («Villa Coyoacan»,
«Ampliacion del Gas»), con abreviaturas («Ampl», «U H») y mayúsculas raras («Seccion Xvi», «Ciudad de Los deportes», «CanDelaria»).
Aquí se ponen solo los acentos de palabras que siempre los llevan (lista revisada a mano, no se adivina), se desarrollan las abreviaturas
claras, los números romanos van en mayúsculas y los artículos y preposiciones en minúsculas dentro del nombre. La búsqueda del sitio no
distingue acentos, así que se sigue encontrando escribiendo sin ellos. Lo usa construir_datos.py.
Uso suelto: python nombres_colonias.py  → muestra cuántos nombres cambian y la lista completa de cambios."""
import re

import unicodedata
_plano = lambda t: ''.join(ch for ch in unicodedata.normalize('NFD', t.lower()) if unicodedata.category(ch) != 'Mn' or ch == '̃')
ACENTOS = {_plano(w): w for w in '''Sección Aragón María Juárez López Ampliación Culhuacán Ticomán Coyoacán Millán Rincón Águilas Concepción Sánchez
Agustín Gómez Asunción Simón Capulín Estación Sebastián Lucía Alemán Mirón Tizapán Zapotitlán Jardín Martín Tomás Serdán Domínguez
Constitución Río Ríos González Pantitlán Tomatlán Belén Américas Aviación Rodríguez Zimbrón Liberación García Hernández Pavón Obregón Panteón
Batán Revolución Redención Suárez Valentín Farías Cárdenas Matías Gutiérrez Clavería Ferrería Educación Fortín Integración Inguarán Edén
Sifón Escuadrón Albán Generación Renovación Magón Ramón Subestación Martínez Emancipación Herón Unión Zenón Esperón Zacatón Chávez Tórtolas
Echeverría Jazmín Ánimas Letrán Algarín Escandón Irrigación Elías Joaquín Pérez Aarón Gráficas Damián Asociación Orquídeas Cuautitlán
Macías Chavarría Rubén Batallón División Bahía Penitenciaría Abdías Peñón Ángel Ángeles Álvaro Agrícola México José Jesús Andrés Lázaro
Bartolomé Hipódromo Periférico Politécnico Ejército Héroes Árbol Árboles Olímpica Anáhuac Tláhuac Cuauhtémoc Eléctrica República Pacífico
Atlántico Tecnológico Petróleos Nápoles Álamos Álamo Córdoba Mérida Querétaro Michoacán Yucatán León Médico Médica Vértiz Ramírez Héctor
Víctor Félix Óscar Raúl Iván Darío Inés Fátima Mónica Verónica Mártires Ébano Égido Ícaro Íñigo Útil Huipulco Ixtlahuacán Atzacoalco
Zacahuitzco Tlacoyaque Xicoténcatl Moctezuma Tepeyac Tlalpan Cuchilla Paraíso Jardín Jardines Poniente Oriente Sur Norte Ávila Ángulo
Aztlán Teotihuacán Tenayuca Huitzilopochtli Cristóbal Gabriel Ángela Rosalía Natividad Esperanza Fe Cañada Pólvora Prolongación Aeropuerto
Tránsito Sagrado Corazón Galeana Hidalgo Vasconcelos Ocotitla Pedregal Chimalcóyotl Cuicuilco Tepetlapa Copilco Ruiz Xochimilco Acatitla
Tolentino Cecilia Lomas Bosques Ixtapalapa Acueducto Tecamachalco Huichapan Tlatelolco Gertrudis Teresa Úrsula Polvorín Bolívar Ixtacalco
Ignacio Narvarte Mixcoac Tacubaya Tacuba Atlampa Popotla Peralvillo Morelos Obrera Doctores Algarín Buenavista Guerrero Anzures Granada
Irrigación Lindavista Vallejo Tlalnepantla Ecatepec Nezahualcóyotl Tlaxcala Púlpito Época Ébano Diálogo Tepozán Zapotlán Xalpa Tlacuitlapa Nicolás Capultitlán Tecoloxtitlán Miacatlán Coactetlán Xicalhuacán Aztahuacán'''.split() if _plano(w) != w.lower()}
ABREV = {'ampl': 'Ampliación', 'amp': 'Ampliación', 'fracc': 'Fraccionamiento', 'fed': 'Federal', 'rcon': 'Rincón', 'sn': 'San',
         'col': 'Col.', 'ejto': 'Ejército', 'ote': 'Oriente', 'pte': 'Poniente', 'prol': 'Prolongación', 'sta': 'Santa', 'sto': 'Santo', 'secc': 'Sección'}
SIGLAS = {'ctm': 'CTM', 'issste': 'ISSSTE', 'fovissste': 'FOVISSSTE', 'imss': 'IMSS', 'unam': 'UNAM', 'ipn': 'IPN', 'cfe': 'CFE', 'sct': 'SCT', 'pemex': 'Pemex'}
PREP = {'de', 'del', 'y', 'e', 'en', 'al'}          # siempre en minúscula dentro del nombre
ART = {'la', 'las', 'los', 'el'}                   # en minúscula solo después de «de», «del» o «en» («de la Palma»; «La Mexicana» se queda)
ROMANO = re.compile(r'^(?=[ivxlc]{2,}$)(c{0,3})(xc|xl|l?x{0,3})(ix|iv|v?i{0,3})$', re.I)

def _palabra(p, inicio, previa):
    base = p.lower(); clave = _plano(p)
    if base in SIGLAS: return SIGLAS[base]
    if base in ABREV: return ABREV[base]
    if ROMANO.match(base): return base.upper()
    if not inicio and base in PREP: return base
    if not inicio and base in ART and previa in ('de', 'del', 'en'): return base
    if clave in ACENTOS: return ACENTOS[clave]
    return p[:1].upper() + p[1:].lower()

def limpiar(n):
    """Nombre para mostrar: acentos seguros, abreviaturas, siglas, romanos y minúsculas. Las claves con número («2A», «1B») no se tocan."""
    if not n: return n
    s = re.sub(r'\bU\s+H(ab)?\b\.?', 'U. H.', n.strip())
    tokens = re.split(r'(\s+|[()\-,/]+)', s)
    out, inicio, previa = [], True, ''
    for t in tokens:
        if not t: continue
        if re.fullmatch(r'\s+|[()\-,/]+', t): out.append(t); inicio = inicio or '(' in t; continue
        if t == 'U.' or t == 'H.' or re.search(r'\d', t) or not re.search(r'[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]', t):
            out.append(t); inicio = False; previa = t.lower(); continue
        q = t.rstrip('.'); punto = t[len(q):]
        r = _palabra(q, inicio, previa); out.append(r if r.endswith('.') else r + punto); inicio = False; previa = q.lower()
    s = re.sub(r'\s+', ' ', ''.join(out)).strip()
    # v30g: paréntesis con su espacio: «San Miguel(Tláhuac)» y «2 de Octubre-(Fraccionamiento…)» → «San Miguel (Tláhuac)»
    return re.sub(r'\s*-?\(\s*', ' (', re.sub(r'\s+\)', ')', s)).strip()

if __name__ == '__main__':
    import base64, gzip, json, sys
    from pathlib import Path
    sys.stdout.reconfigure(encoding='utf-8')
    P = json.loads(gzip.decompress(base64.b64decode((Path(__file__).parents[1] / '10_sitio' / 'datos' / 'colonias.txt').read_text())))
    nombres = sorted({c['n'] for c in P['colonias'] if c})
    cambios = [(n, limpiar(n)) for n in nombres if limpiar(n) != n]
    print(len(cambios), 'de', len(nombres), 'nombres cambian')
    for a, b in cambios: print(f'{a}  →  {b}')
