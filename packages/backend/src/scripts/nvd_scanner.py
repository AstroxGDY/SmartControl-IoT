import requests
import json
import sys
import os

# ==========================================
# MOTOR HEURÍSTICO (CONSEJOS AL USUARIO)
# ==========================================
def generar_consejos_seguridad(descripcion_tecnica):
    """
    Lee la descripción en inglés y devuelve consejos en español.
    """
    desc = descripcion_tecnica.lower()
    consejos = set()

    # Sistema de reglas basado en palabras clave
    reglas = [
        {
            "palabras": ["firmware", "update", "patch", "outdated", "version"],
            "consejo": "[ACTUALIZAR] Comprueba si hay actualizaciones de software en la app del fabricante."
        },
        {
            "palabras": ["password", "credential", "hardcoded", "default", "auth", "login"],
            "consejo": "[CREDENCIALES] Si el dispositivo usa una contraseña por defecto (ej. admin/1234), cámbiala inmediatamente."
        },
        {
            "palabras": ["bluetooth", "pairing", "bth", "rfcomm", "l2cap"],
            "consejo": "[BLUETOOTH] Apaga el Bluetooth del dispositivo cuando no se use y evita emparejamientos en lugares públicos."
        },
        {
            "palabras": ["wifi", "network", "remote", "rce", "ddos"],
            "consejo": "[RED] Conecta este dispositivo a una red Wi-Fi de 'Invitados' para aislarlo de tu ordenador o móvil personal."
        },
        {
            "palabras": ["physical", "usb", "plug", "cable"],
            "consejo": "[FÍSICO] No dejes el dispositivo desatendido ni lo conectes a puertos USB públicos o desconocidos."
        }
    ]

    for regla in reglas:
        if any(palabra in desc for palabra in regla["palabras"]):
            consejos.add(regla["consejo"])

    if not consejos:
        consejos.add("[PRECAUCIÓN] Revisa la web del fabricante para ver si existen avisos de seguridad sobre este modelo.")

    return list(consejos)

# ==========================================
# EXTRACCIÓN DE INTELIGENCIA (NVD API)
# ==========================================
def analizar_dispositivo(fabricante, producto, version):
    """
    Se conecta al NIST y busca el histórico de vulnerabilidades.
    """
    query = f"{fabricante} {producto} {version}".strip()
    
    if len(query) < 3:
        return {"estado": "ERROR_QUERY_TOO_SHORT", "success": False, "msg": "La búsqueda debe tener al menos 3 caracteres."}

    # URL de la API v2.0 del NVD
    url = "https://services.nvd.nist.gov/rest/json/cves/2.0"
    params = {
        "keywordSearch": query,
        "resultsPerPage": 5
    }

    reporte = {
        "query": query,
        "total_vulnerabilidades": 0,
        "cves": [],
        "estado": "OK"
    }

    try:
        # Timeout de 20 segundos y reintentos automáticos si es necesario
        respuesta = requests.get(url, params=params, timeout=20)
        
        if respuesta.status_code != 200:
            if respuesta.status_code == 403:
                return {"estado": "ERROR_NIST_RATE_LIMIT", "success": False, "msg": "Límite de API del NIST alcanzado."}
            return {"estado": f"ERROR_HTTP_{respuesta.status_code}", "success": False}

        datos = respuesta.json()
        reporte["total_vulnerabilidades"] = datos.get("totalResults", 0)

        for item in datos.get("vulnerabilities", []):
            cve = item.get("cve", {})
            
            # --- 1. Descripción ---
            descripcion = "Sin descripción disponible."
            for desc in cve.get("descriptions", []):
                if desc.get("lang") == "en":
                    descripcion = desc.get("value")
                    break
            
            # --- 2. Nota CVSS ---
            metricas = cve.get("metrics", {})
            cvss_score = "N/A"
            severidad = "N/A"
            
            # Prioridad: V3.1 > V3.0 > V2
            if metricas.get("cvssMetricV31"):
                m = metricas["cvssMetricV31"][0]
                cvss_score = m.get("cvssData", {}).get("baseScore", "N/A")
                severidad = m.get("cvssData", {}).get("baseSeverity", "N/A")
            elif metricas.get("cvssMetricV30"):
                m = metricas["cvssMetricV30"][0]
                cvss_score = m.get("cvssData", {}).get("baseScore", "N/A")
                severidad = m.get("cvssData", {}).get("baseSeverity", "N/A")
            elif metricas.get("cvssMetricV2"):
                m = metricas["cvssMetricV2"][0]
                cvss_score = m.get("cvssData", {}).get("baseScore", "N/A")
                severidad = m.get("baseSeverity", "N/A")

            # --- 3. Referencias ---
            enlaces = []
            for ref in cve.get("references", []):
                url_ref = ref.get("url")
                tags = ref.get("tags", [])
                tipo_enlace = ", ".join(tags) if tags else ("Parche/Repositorio" if "github.com" in url_ref else "Foro/Documentación")
                
                if len(enlaces) < 3:
                    enlaces.append({"tipo": tipo_enlace, "url": url_ref})

            # --- 4. Ensamblaje ---
            cve_formateado = {
                "id": cve.get("id", "DESCONOCIDO"),
                "cvss_score": cvss_score,
                "severidad": severidad,
                "descripcion": descripcion,
                "consejos": generar_consejos_seguridad(descripcion),
                "enlaces": enlaces
            }
            reporte["cves"].append(cve_formateado)

        return reporte

    except Exception as e:
        return {"estado": f"ERROR_INTERNO_{str(e)}", "success": False}

if __name__ == "__main__":
    # Esperamos argumentos: fabricante, producto, version
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Faltan argumentos. Uso: nvd_scanner.py <fabricante> <producto> [version]", "success": False}))
        sys.exit(1)

    fabricante = sys.argv[1]
    producto = sys.argv[2]
    version = sys.argv[3] if len(sys.argv) > 3 else ""

    resultado = analizar_dispositivo(fabricante, producto, version)
    print(json.dumps(resultado, ensure_ascii=False))
