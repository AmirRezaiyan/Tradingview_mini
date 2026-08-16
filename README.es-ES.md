

# TradingView Mini

Una aplicación de gráficos de trading liviana pero potente, construida con React y Django, que incluye actualizaciones de precios en tiempo real, indicadores técnicos y herramientas de dibujo interactivas para el análisis técnico.

---

## =��� Tabla de Contenidos

- [Características](#-features)
- [Arquitectura](#-architecture)
- [Primeros Pasos](#-getting-started)
- [Estructura del Proyecto](#-project-structure)
- [Configuración](#-configuration)
- [Documentación de la API](#-api-documentation)
- [Personalización](#-customization)
- [Contribuciones](#-contributing)
- [Problemas Conocidos](#-known-issues)
- [Licencia](#-license)
- [Soporte](#-support)

---

## <�� Características

### =��� Capacidades de los Gráficos

**Visualización de Datos en Tiempo Real**
- Actualizaciones de precios en vivo con un mecanismo de polling similar a WebSocket
- Renderizado fluido de velas japonesas usando la biblioteca lightweight-charts
- Soporte para múltiples intervalos de tiempo: 1 minuto, 5 minutos, 15 minutos, 1 hora, 4 horas y diario
- Funcionalidad interactiva de zoom y desplazamiento
- Cruz con información detallada de precio y tiempo

**Soporte de Mercados**
- =ر� **Mercados de Criptomonedas**: Bitcoin, Ethereum y las principales altcoins
- =ص� **Mercados Forex**: Principales pares de divisas (EUR/USD, GBP/USD, etc.)
- Flujos de precios en tiempo real desde proveedores de datos de mercado confiables

### =��� Herramientas de Dibujo

TradingView Mini incluye herramientas de dibujo profesionales para el análisis técnico:

- **=��� Líneas de Tendencia**: Dibuja líneas de soporte y resistencia para identificar tendencias del mercado
- **+ Rectángulos**: Destaca zonas de consolidación y rangos de precios importantes
- **�!� Líneas Horizontales**: Marca niveles de precios clave para puntos de entrada y salida
- **=�"� Retroceso de Fibonacci**: Calcula y dibuja automáticamente niveles de Fibonacci para el análisis de retroceso
- **'� Pincel Libre**: Dibuja anotaciones y notas personalizadas directamente sobre el gráfico
- **=ؾ� Almacenamiento Persistente**: Todos los dibujos se guardan automáticamente en el almacenamiento local de tu navegador y se restauran cuando vuelves

### =��� Indicadores Técnicos

**Indicadores Integrados**

1. **RSI (Índice de Fuerza Relativa)**
   - Mide el momento con valores de 0 a 100
   - Nivel de sobrecompra en 70 (línea roja)
   - Nivel de sobreventa en 30 (línea verde)
   - Período personalizable (predeterminado: 14)

2. **MACD (Convergencia/Divergencia de Medias Móviles)**
   - Línea MACD (EMA de 12 períodos - EMA de 26 períodos)
   - Línea de señal (EMA de 9 períodos del MACD)
   - Histograma que muestra la divergencia
   - Codificado por colores para una fácil identificación de tendencias

3. **EMA (Media Móvil Exponencial)**
   - Soporta múltiples períodos (9, 21, 50, 200)
   - Da más peso a los precios recientes
   - Excelente para identificar tendencias a corto plazo

4. **SMA (Media Móvil Simple)**
   - Soporta múltiples períodos (20, 50, 100, 200)
   - Cálculo clásico de media móvil
   - Ideal para identificar tendencias a largo plazo

**Características de los Indicadores**
- Activar/desactivar indicadores con un solo clic
- Personalizar colores y parámetros
- Cálculo y actualizaciones en tiempo real
- Se pueden mostrar múltiples indicadores simultáneamente

### <ب� Personalización

- **Tema de Modo Oscuro**: Interfaz oscura amigable para los ojos para sesiones de trading prolongadas
- **Colores Personalizables**: Ajusta los colores del gráfico, líneas de la cuadrícula y fondos
- **Diseños Flexibles**: Redimensiona y reorganiza los paneles de indicadores
- **Guardar Preferencias**: Tus configuraciones se recuerdan entre sesiones


---

## <���� Arquitectura

TradingView Mini se construye utilizando una arquitectura full-stack moderna con una clara separación de responsabilidades.

### <ب� Arquitectura
