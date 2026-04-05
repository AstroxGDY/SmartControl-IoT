# 📖 Guía de Uso de SmartControl-IoT

¡Bienvenido al sistema inteligente de gestión local para dispositivos Tuya! Esta aplicación te permite tomar el control total de tus bombillas, sensores, y enchufes inteligentes sin depender de servidores externos lentos, gracias al descubrimiento *Local UDP*.

A continuación tienes una guía práctica para arrancar de cero y empezar a operar tus dispositivos:

---

## 1. Escaneo Inicial y Primeros Pasos 🔍

La primera vez que entres en la aplicación, tendrás la base de datos limpia. Para que la aplicación aprenda sobre tu hogar:

1. Asegúrate de tener a mano tus credenciales Cloud de Tuya (que deben estar configuradas en el archivo `.env` del backend con `TUYA_API_REGION`, `TUYA_API_KEY`, etc.).
2. Haz clic en el botón de **"Escanear Red"** (suele usar la herramienta `tinytuya`).
3. El sistema buscará en el aire paquetes UDP y encriptados, y luego usará tu cuenta Cloud para **Descubrir la Clave Secreta Local (Local Key)**.
4. Una vez emparejado, se guardará de por vida en la base de datos de la app.

## 2. Pantalla de Inicio (Ver Todos) 🏠

Nada más entrar a la app, verás la lista de tus dispositivos en forma de Tarjetas (*Cards*). 
- **En tiempo real**: Al entrar, la aplicación revisará **en vivo** tu intranet (con cientos de peticiones rapidísimas en paralelo) comprobando si los dispositivos de la base de datos siguen vivos (Conectados) o si se han desenchufado del todo (Desconectados). 
- Dependiendo de esta respuesta instantánea, su color base y el texto de estado se actualizarán solos y permanecerán estables en el tablero.

## 3. Explorar los Detalles de un Dispositivo ⚙

- Al hacer clic sobre cualquier dispositivo en **Ver Detalles**, se abre una modalidad flotante con todos sus misterios revelados.
- **Auto-Aprendizaje**: Si acabas de comprar el aparato y nunca antes lo has abierto, la app irá directamente al servidor de Tuya Europe, y se descargará el **Esquema Semántico** (el código numérico interno del aparato).
- Gracias a este esquema la App no te dirá "DP 1" o "DP 20", sino cosas como *`switch_1`* o *`cur_voltage`*, mostrándote los Voltios, Watios e intensidades correctamente formateadas en lugar de números arcaicos.

## 4. Usar el Dispositivo (Encender / Apagar) 🔌

En la modalidad de Detalles o directamente en la lógica interna encontrarás el Interruptor Físico.
- Fíjate en la parte de Inteligencia de la Aplicación: Él **ya sabe de antemano cuál es el botón principal** analizando programáticamente la propiedad de tipo Booleana "switch_" en el esquema.
- Al apretar el botón, se enviará una orden TCP instantánea por LAN al dispositivo. Tarda escasos milisegundos y, tras hacerlo, verás que la UI se actualiza a `Encendido / Apagado` en un parpadeo.

> **💡 Consejo**: No te preocupes por el "Punto de Conexión". El texto superior de **CONECTADO** hace referencia a si la WiFi ha llegado, pero para saber si la lamparilla está emitiendo luz fíjate exclusivamente en la caja que dice **SWITCH_1**.

---
*Hecho para el Trabajo de Fin de Grado (TFG) - SmartControl-IoT*
