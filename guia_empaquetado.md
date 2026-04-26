# Guía de Empaquetado e Instalación

Esta guía detalla cómo generar nuevas versiones de la aplicación SmartControl-IoT.

## Requisitos Previos
1. **Node.js** y **npm** instalados.
2. **Python 3.10+** instalado (solo para el proceso de empaquetado).
3. **PyInstaller**: Instalado vía pip (`pip install pyinstaller`).
4. **Permisos**: Es recomendable ejecutar la terminal como **Administrador** para evitar errores con los enlaces simbólicos de las herramientas de Electron.

## Estructura del Proceso

El empaquetado se divide en 4 fases automáticas:
1. **Freezing Python**: Conversión de scripts `.py` a `.exe`.
2. **Frontend Build**: Compilación de React/Vite a archivos estáticos.
3. **Backend Build**: Compilación de TypeScript a JavaScript (Node.js).
4. **Electron Dist**: Empaquetado final con `electron-builder`.

## Comandos Útiles

### Generar todo el paquete (Recomendado)
Este comando ejecuta todas las fases y genera el instalador en `dist_electron/`.
```powershell
npm run dist
```

### Solo congelar scripts de Python
Si cambias algo en la lógica de Python, debes volver a generar los binarios:
```powershell
cd packages/backend/src/scripts
python freeze_scripts.py
```

### Desarrollo local (Modo Dev)
Para seguir desarrollando sin empaquetar:
```powershell
npm run dev
```

## Solución de Problemas Comunes

### Error: "Cannot create symbolic link"
Este error ocurre en Windows cuando `electron-builder` intenta extraer sus herramientas internas.
- **Solución 1**: Ejecuta la terminal (PowerShell/CMD) como Administrador.
- **Solución 2**: Activa el "Modo de desarrollador" en la configuración de Windows.

### El backend no encuentra los scripts
En producción, la app busca los ejecutables en la carpeta `resources/bin`. Asegúrate de que `packages/backend/src/scripts/dist_bin` contenga los archivos `.exe` antes de empaquetar.

### MongoDB no arranca
La aplicación intenta iniciar el servicio `MongoDB` automáticamente al abrirse. Si falla, asegúrate de que MongoDB esté instalado como servicio de Windows.
