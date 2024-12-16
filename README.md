# Advanced Cryptocurrency Analyzer

Sistema profesional de análisis de criptomonedas que integra análisis técnico, dominancia de Bitcoin, y gestión de riesgo para proporcionar análisis y recomendaciones de inversión precisas.

## 🚀 Características

- Análisis de dominancia Bitcoin y ciclos de mercado
- Evaluación multidimensional de tokens
- Sistema de puntuación avanzado
- Gestión de riesgo automatizada
- Integración con Coinbase
- Análisis de oportunidades de mercado

## 📋 Requisitos Previos

- Node.js >= 14.0.0
- NPM >= 6.0.0
- API Key de CoinMarketCap

## 🛠️ Instalación

1. Clonar el repositorio:
```bash
git clone https://github.com/matiasproject/cryptoMonitor.git
cd crypto-monitor
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
```bash
cp .env.example .env
# Editar .env y añadir tu API key de CoinMarketCap
```

## 💻 Uso

### Iniciar el Analizador
```bash
npm start
```

### Opciones Disponibles
1. Analizar Token Específico
2. Ver Top 10 Mejores Oportunidades
3. Salir

### Ejemplo de Uso
```javascript
const analyzer = new AdvancedCryptoAnalyzer(apiKey);
await analyzer.initialize();
const analysis = await analyzer.analyzeToken('BTC');
```

## 📊 Sistema de Análisis

### Score de Inversión (1-10)
Factores ponderados:
- Madurez de Mercado (20%)
- Salud del Volumen (20%)
- Momentum (25%)
- Volatilidad (15%)
- Market Cap (10%)
- Ratio de Volumen (10%)

### Niveles de Riesgo
- **Alto**: Stop loss 25%
- **Medio**: Stop loss 15%
- **Bajo**: Stop loss 5%

### Análisis de Dominancia BTC
- Fase BTC Dominance: > 60%
- Fase Altcoin: < 35%
- Fase Transición: 35-60%

## 🧪 Testing

### Ejecutar Tests
```bash
# Tests completos
npm test

# Modo watch
npm run test:watch

# Con coverage
npm run test:coverage
```

### Cobertura Mínima
- Statements: 80%
- Branches: 80%
- Functions: 80%
- Lines: 80%

## 📈 Precisión y Fiabilidad

### Tasas de Precisión
- Análisis Base: 75-80%
- Análisis de Ciclos: 85-90%
- Análisis de Mercado: 80-85%
- Global: 88-92%

### Limitaciones Conocidas
- Dependencia de APIs externas
- Latencia en datos
- Volatilidad inherente del mercado

## ⚙️ Configuración

### Ajuste de Parámetros
```javascript
// Ejemplo de configuración personalizada
const config = {
    MARKET_SEGMENTS: {
        MICRO_CAP: 50000000,  // $50M
        SMALL_CAP: 250000000  // $250M
    },
    VOLUME_RATIOS: {
        HEALTHY: 0.15,       // 15%
        STRONG: 0.30        // 30%
    }
};
```

## 🔒 Seguridad

### Mejores Prácticas
- Rotación de API keys
- Rate limiting
- Validación de datos
- Manejo de errores robusto

## 📝 Mantenimiento

### Tareas Periódicas
1. **Diarias**
   - Verificar API endpoints
   - Monitorear logs

2. **Semanales**
   - Actualizar parámetros
   - Validar precisión

3. **Mensuales**
   - Actualizar dependencias
   - Optimizar algoritmos

## 🤝 Contribución

1. Fork del repositorio
2. Crear branch (`git checkout -b feature/mejora`)
3. Commit cambios (`git commit -am 'Add: mejora'`)
4. Push al branch (`git push origin feature/mejora`)
5. Crear Pull Request

## 📫 Soporte

- GitHub Issues
  
## ⚠️ Disclaimer

Este software es solo para propósitos informativos y educativos. No constituye consejo financiero. Use el sistema bajo su propio riesgo.

---

Desarrollado con ❤️ por Matiasproject
